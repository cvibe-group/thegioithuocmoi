-- Authors catalog + M2M with articles

create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  bio text not null default '',
  image text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists authors_sort_order_idx on public.authors (sort_order, name);

create table if not exists public.article_authors (
  article_id uuid not null references public.articles(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (article_id, author_id)
);

create index if not exists article_authors_author_id_idx
  on public.article_authors (author_id);

alter table public.authors enable row level security;
alter table public.article_authors enable row level security;

drop policy if exists "Public read authors" on public.authors;
create policy "Public read authors"
  on public.authors for select to anon, authenticated using (true);

drop policy if exists "Admin write authors" on public.authors;
create policy "Admin write authors"
  on public.authors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read article_authors" on public.article_authors;
create policy "Public read article_authors"
  on public.article_authors for select to anon, authenticated using (true);

drop policy if exists "Admin write article_authors" on public.article_authors;
create policy "Admin write article_authors"
  on public.article_authors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.authors to anon, authenticated;
grant select on public.article_authors to anon, authenticated;
grant insert, update, delete on public.authors to authenticated;
grant insert, update, delete on public.article_authors to authenticated;

-- Seed distinct authors (exact names currently on articles)
insert into public.authors (name, slug, bio, image, sort_order)
select
  d.name,
  d.slug,
  coalesce(
    (
      select nullif(trim(a.author_bio), '')
      from public.articles a
      where trim(coalesce(a.author, '')) = d.name
        and nullif(trim(coalesce(a.author_bio, '')), '') is not null
      order by (nullif(trim(coalesce(a.author_image, '')), '') is not null) desc, a.updated_at desc
      limit 1
    ),
    ''
  ),
  (
    select nullif(trim(a.author_image), '')
    from public.articles a
    where trim(coalesce(a.author, '')) = d.name
      and nullif(trim(coalesce(a.author_image, '')), '') is not null
    order by a.updated_at desc
    limit 1
  ),
  d.sort_order
from (
  values
    ('Nguyễn Tiến Sử, MD, PhD, MBA', 'nguyen-tien-su', 0),
    ('Hồ Minh Văn, MD. PhD', 'ho-minh-van', 1),
    ('Bùi Quốc Thắng, MD, PhD', 'bui-quoc-thang', 2),
    ('BS. TS. Nguyễn Thị Thu Thảo', 'nguyen-thi-thu-thao', 3),
    ('Nguyễn Bích Trân, MD, PhD', 'nguyen-bich-tran', 4)
) as d(name, slug, sort_order)
on conflict (slug) do update set
  name = excluded.name,
  bio = case when excluded.bio <> '' then excluded.bio else public.authors.bio end,
  image = coalesce(excluded.image, public.authors.image),
  sort_order = excluded.sort_order,
  updated_at = now();

-- Link every article to matching author by legacy name
insert into public.article_authors (article_id, author_id, sort_order)
select a.id, au.id, 0
from public.articles a
join public.authors au on trim(coalesce(a.author, '')) = au.name
on conflict (article_id, author_id) do nothing;
