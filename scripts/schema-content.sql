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
  layout text check (layout is null or layout in ('card', 'wide', 'featured')),
  blocks jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  published_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_category_label_idx on public.articles (category_label);
create index if not exists articles_year_month_day_slug_idx on public.articles (year, month, day, slug);
create index if not exists articles_published_on_idx
  on public.articles (is_published, published_on desc nulls last, created_at desc);

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

-- Public read policies
create policy "Public read categories" on public.categories for select to anon, authenticated using (true);
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

-- Expose to Data API
grant select on public.categories to anon, authenticated;
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