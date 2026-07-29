-- Homepage & sidebar auto-content
alter table public.articles
  add column if not exists published_on date;

update public.articles
set published_on = make_date(year::int, month::int, day::int)
where published_on is null
  and year ~ '^\d{4}$'
  and month ~ '^\d{1,2}$'
  and day ~ '^\d{1,2}$'
  and month::int between 1 and 12
  and day::int between 1 and 31;

create index if not exists articles_published_on_idx
  on public.articles (is_published, published_on desc nulls last, created_at desc);

alter table public.sidebar_panels
  add column if not exists category_slug text references public.categories(slug) on delete set null;

update public.sidebar_panels sp
set category_slug = c.slug
from public.categories c
where sp.category_slug is null
  and sp.see_all_href = '/' || c.slug;

delete from public.homepage_sections hs
where not exists (
  select 1 from public.categories c where c.slug = hs.id
);

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
