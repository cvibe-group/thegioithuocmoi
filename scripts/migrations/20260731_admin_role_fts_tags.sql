-- Admin role (app_metadata.role = admin), FTS search, article tags

-- 1) Admin helper (JWT claim from Supabase Auth)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- Promote existing Auth users to admin (operators already using CMS)
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where coalesce(raw_app_meta_data ->> 'role', '') is distinct from 'admin';

-- 2) Tighten write policies: only admins
do $$
declare
  t text;
begin
  foreach t in array array[
    'articles',
    'categories',
    'category_articles',
    'glossary_entries',
    'glossary_tabs',
    'homepage_section_articles',
    'homepage_sections',
    'nav_dropdown_items',
    'nav_items',
    'sidebar_panel_items',
    'sidebar_panels',
    'site_settings'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'Admin write ' || t, t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      'Admin write ' || t,
      t
    );
  end loop;
end $$;

-- Authenticated write grants (RLS still gates by is_admin)
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.articles to authenticated;
grant select, insert, update, delete on public.homepage_sections to authenticated;
grant select, insert, update, delete on public.homepage_section_articles to authenticated;
grant select, insert, update, delete on public.nav_items to authenticated;
grant select, insert, update, delete on public.nav_dropdown_items to authenticated;
grant select, insert, update, delete on public.sidebar_panels to authenticated;
grant select, insert, update, delete on public.sidebar_panel_items to authenticated;
grant select, insert, update, delete on public.glossary_tabs to authenticated;
grant select, insert, update, delete on public.glossary_entries to authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;
grant select, insert, update, delete on public.category_articles to authenticated;

-- 3) Tags on articles
alter table public.articles
  add column if not exists tags text[] not null default '{}'::text[];

create index if not exists articles_tags_gin_idx on public.articles using gin (tags);

-- 4) Full-text search (accent-insensitive via public.vi_unaccent — see 20260731_vi_unaccent_search.sql)
alter table public.articles
  add column if not exists search_vector tsvector;

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

update public.articles
set search_vector =
  setweight(to_tsvector('simple', public.vi_unaccent(coalesce(title, ''))), 'A') ||
  setweight(to_tsvector('simple', public.vi_unaccent(coalesce(category_label, ''))), 'B') ||
  setweight(to_tsvector('simple', public.vi_unaccent(coalesce(excerpt, ''))), 'C') ||
  setweight(
    to_tsvector('simple', public.vi_unaccent(coalesce(array_to_string(tags, ' '), ''))),
    'B'
  )
where search_vector is null;

create index if not exists articles_search_vector_idx
  on public.articles using gin (search_vector);

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
