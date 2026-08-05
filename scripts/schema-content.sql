-- Content schema for thegioithuocmoi clone

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  kind text not null check (kind in ('archive', 'glossary', 'subcategory')),
  parent_slug text references public.categories(slug) on delete set null,
  total_pages integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  slug text not null,
  year text not null,
  month text not null,
  day text not null,
  title text not null,
  category_label text not null,
  category_href text not null default '/',
  date_label text not null,
  datetime_label text,
  read_time text not null default '5 phút đọc',
  image text,
  excerpt text,
  author text,
  author_bio text,
  author_image text,
  layout text check (layout is null or layout in ('card', 'wide', 'featured')),
  blocks jsonb not null default '[]'::jsonb,
  content_html text,
  is_published boolean not null default true,
  published_on date,
  tags text[] not null default '{}'::text[],
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_id uuid,
  created_by_email text,
  updated_by_id uuid,
  updated_by_email text
);

create index if not exists articles_category_label_idx on public.articles (category_label);
create index if not exists articles_year_month_day_slug_idx on public.articles (year, month, day, slug);
create index if not exists articles_published_on_idx
  on public.articles (is_published, published_on desc nulls last, created_at desc);

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

create table if not exists public.homepage_sections (
  id text primary key,
  title text not null,
  see_more_href text not null,
  sort_order integer not null default 0
);

create table if not exists public.homepage_section_articles (
  section_id text not null references public.homepage_sections(id) on delete cascade,
  article_path text not null references public.articles(path) on delete cascade,
  sort_order integer not null default 0,
  primary key (section_id, article_path)
);

create table if not exists public.nav_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  has_dropdown boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.nav_dropdown_items (
  id uuid primary key default gen_random_uuid(),
  nav_item_id uuid not null references public.nav_items(id) on delete cascade,
  text text not null,
  href text not null,
  sort_order integer not null default 0
);

create table if not exists public.sidebar_panels (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  see_all_href text not null,
  category_slug text references public.categories(slug) on delete set null,
  sort_order integer not null default 0
);

create table if not exists public.sidebar_panel_items (
  id uuid primary key default gen_random_uuid(),
  panel_id uuid not null references public.sidebar_panels(id) on delete cascade,
  text text not null,
  href text not null,
  sort_order integer not null default 0
);

create table if not exists public.glossary_tabs (
  id text primary key,
  label text not null,
  href text not null,
  sort_order integer not null default 0
);

create table if not exists public.glossary_entries (
  id uuid primary key default gen_random_uuid(),
  tab_id text not null references public.glossary_tabs(id) on delete cascade,
  letter text not null,
  text text not null,
  href text not null default '#',
  sort_order integer not null default 0
);

create index if not exists glossary_entries_tab_letter_idx on public.glossary_entries (tab_id, letter);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.category_articles (
  category_slug text not null references public.categories(slug) on delete cascade,
  article_path text not null references public.articles(path) on delete cascade,
  sort_order integer not null default 0,
  layout text check (layout is null or layout in ('card', 'wide', 'featured')),
  primary key (category_slug, article_path)
);

-- RLS
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.homepage_section_articles enable row level security;
alter table public.nav_items enable row level security;
alter table public.nav_dropdown_items enable row level security;
alter table public.sidebar_panels enable row level security;
alter table public.sidebar_panel_items enable row level security;
alter table public.glossary_tabs enable row level security;
alter table public.glossary_entries enable row level security;
alter table public.site_settings enable row level security;
alter table public.category_articles enable row level security;
alter table public.authors enable row level security;
alter table public.article_authors enable row level security;

-- Public read policies
create policy "Public read categories" on public.categories for select to anon, authenticated using (true);
create policy "Public read authors" on public.authors for select to anon, authenticated using (true);
create policy "Public read article_authors" on public.article_authors for select to anon, authenticated using (true);
create policy "Public read articles" on public.articles for select to anon, authenticated using (is_published = true);
create policy "Public read homepage_sections" on public.homepage_sections for select to anon, authenticated using (true);
create policy "Public read homepage_section_articles" on public.homepage_section_articles for select to anon, authenticated using (true);
create policy "Public read nav_items" on public.nav_items for select to anon, authenticated using (true);
create policy "Public read nav_dropdown_items" on public.nav_dropdown_items for select to anon, authenticated using (true);
create policy "Public read sidebar_panels" on public.sidebar_panels for select to anon, authenticated using (true);
create policy "Public read sidebar_panel_items" on public.sidebar_panel_items for select to anon, authenticated using (true);
create policy "Public read glossary_tabs" on public.glossary_tabs for select to anon, authenticated using (true);
create policy "Public read glossary_entries" on public.glossary_entries for select to anon, authenticated using (true);
create policy "Public read site_settings" on public.site_settings for select to anon, authenticated using (true);
create policy "Public read category_articles" on public.category_articles for select to anon, authenticated using (true);

-- Admin write (requires auth.jwt app_metadata.role = 'admin')
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in (
      'super_admin',
      'admin',
      'editor',
      'author'
    ),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

create policy "Admin write categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write articles" on public.articles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write homepage_sections" on public.homepage_sections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write homepage_section_articles" on public.homepage_section_articles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write nav_items" on public.nav_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write nav_dropdown_items" on public.nav_dropdown_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write sidebar_panels" on public.sidebar_panels for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write sidebar_panel_items" on public.sidebar_panel_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write glossary_tabs" on public.glossary_tabs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write glossary_entries" on public.glossary_entries for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write site_settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write category_articles" on public.category_articles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write authors" on public.authors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin write article_authors" on public.article_authors for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Expose to Data API
grant select on public.categories to anon, authenticated;
grant select on public.authors to anon, authenticated;
grant select on public.article_authors to anon, authenticated;
grant select on public.articles to anon, authenticated;
grant select on public.homepage_sections to anon, authenticated;
grant select on public.homepage_section_articles to anon, authenticated;
grant select on public.nav_items to anon, authenticated;
grant select on public.nav_dropdown_items to anon, authenticated;
grant select on public.sidebar_panels to anon, authenticated;
grant select on public.sidebar_panel_items to anon, authenticated;
grant select on public.glossary_tabs to anon, authenticated;
grant select on public.glossary_entries to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant select on public.category_articles to anon, authenticated;

grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.authors to authenticated;
grant insert, update, delete on public.article_authors to authenticated;
grant insert, update, delete on public.articles to authenticated;
grant insert, update, delete on public.homepage_sections to authenticated;
grant insert, update, delete on public.homepage_section_articles to authenticated;
grant insert, update, delete on public.nav_items to authenticated;
grant insert, update, delete on public.nav_dropdown_items to authenticated;
grant insert, update, delete on public.sidebar_panels to authenticated;
grant insert, update, delete on public.sidebar_panel_items to authenticated;
grant insert, update, delete on public.glossary_tabs to authenticated;
grant insert, update, delete on public.glossary_entries to authenticated;
grant insert, update, delete on public.site_settings to authenticated;
grant insert, update, delete on public.category_articles to authenticated;

-- Random articles for sidebar panels (per request)
create or replace function public.random_category_articles(
  p_slug text,
  p_limit int default 15
)
returns table (
  path text,
  title text
)
language sql
stable
as $$
  select a.path, a.title
  from public.category_articles ca
  join public.articles a on a.path = ca.article_path
  where ca.category_slug = p_slug
    and a.is_published = true
  order by random()
  limit greatest(coalesce(p_limit, 15), 0);
$$;

revoke all on function public.random_category_articles(text, int) from public;
grant execute on function public.random_category_articles(text, int) to anon, authenticated;

create or replace function public.latest_category_articles(
  p_slug text,
  p_limit int default 6
)
returns setof public.articles
language sql
stable
as $$
  select a.*
  from public.category_articles ca
  join public.articles a on a.path = ca.article_path
  where ca.category_slug = p_slug
    and a.is_published = true
  order by a.published_on desc nulls last,
           a.year desc, a.month desc, a.day desc, a.created_at desc
  limit greatest(coalesce(p_limit, 6), 0);
$$;

revoke all on function public.latest_category_articles(text, int) from public;
grant execute on function public.latest_category_articles(text, int) to anon, authenticated;

-- Full-text search (accent-insensitive Vietnamese; see migrations/*vi_unaccent*)
create or replace function public.vi_unaccent(input text)
returns text
language sql
immutable
strict
as $$
  select translate(
    lower(input),
    'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
  );
$$;

revoke all on function public.vi_unaccent(text) from public;
grant execute on function public.vi_unaccent(text) to anon, authenticated;

create or replace function public.articles_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', public.vi_unaccent(coalesce(new.title, ''))), 'A') ||
    setweight(to_tsvector('simple', public.vi_unaccent(coalesce(new.category_label, ''))), 'B') ||
    setweight(to_tsvector('simple', public.vi_unaccent(coalesce(new.excerpt, ''))), 'C') ||
    setweight(
      to_tsvector('simple', public.vi_unaccent(coalesce(array_to_string(new.tags, ' '), ''))),
      'B'
    );
  return new;
end;
$$;

drop trigger if exists articles_search_vector_trigger on public.articles;
create trigger articles_search_vector_trigger
  before insert or update of title, category_label, excerpt, tags
  on public.articles
  for each row
  execute function public.articles_search_vector_update();

create index if not exists articles_search_vector_idx
  on public.articles using gin (search_vector);
create index if not exists articles_tags_gin_idx on public.articles using gin (tags);

create or replace function public.search_articles(
  p_query text,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  path text,
  title text,
  category_label text,
  date_label text,
  read_time text,
  image text,
  excerpt text,
  author text,
  layout text,
  total_count bigint
)
language sql
stable
as $$
  with normalized as (
    select
      trim(coalesce(p_query, '')) as raw_q,
      public.vi_unaccent(trim(coalesce(p_query, ''))) as q_plain
  ),
  q as (
    select
      n.raw_q,
      n.q_plain,
      case
        when n.q_plain = '' then ''::tsquery
        else websearch_to_tsquery('simple', n.q_plain)
      end as tsq
    from normalized n
  ),
  matched as (
    select
      a.path,
      a.title,
      a.category_label,
      a.date_label,
      a.read_time,
      a.image,
      a.excerpt,
      a.author,
      a.layout,
      case
        when q.tsq = ''::tsquery then 0::float4
        else ts_rank_cd(a.search_vector, q.tsq)
      end as rank
    from public.articles a, q
    where a.is_published = true
      and (
        q.q_plain = ''
        or a.search_vector @@ q.tsq
        or public.vi_unaccent(a.title) ilike '%' || q.q_plain || '%'
        or public.vi_unaccent(coalesce(a.excerpt, '')) ilike '%' || q.q_plain || '%'
        or public.vi_unaccent(a.category_label) ilike '%' || q.q_plain || '%'
      )
  ),
  counted as (
    select count(*)::bigint as total_count from matched
  )
  select
    m.path,
    m.title,
    m.category_label,
    m.date_label,
    m.read_time,
    m.image,
    m.excerpt,
    m.author,
    m.layout,
    c.total_count
  from matched m
  cross join counted c
  order by m.rank desc nulls last, m.date_label desc
  limit greatest(coalesce(p_limit, 20), 0)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.search_articles(text, int, int) from public;
grant execute on function public.search_articles(text, int, int) to anon, authenticated;
