-- Track CMS user who created / last updated each article

alter table public.articles
  add column if not exists created_by_id uuid,
  add column if not exists created_by_email text,
  add column if not exists updated_by_id uuid,
  add column if not exists updated_by_email text;

create index if not exists articles_created_by_id_idx
  on public.articles (created_by_id);

create index if not exists articles_updated_by_id_idx
  on public.articles (updated_by_id);

comment on column public.articles.created_by_id is 'Supabase Auth user id who created the article in CMS';
comment on column public.articles.updated_by_id is 'Supabase Auth user id who last updated the article in CMS';
comment on column public.articles.created_by_email is 'Email snapshot of creator at write time';
comment on column public.articles.updated_by_email is 'Email snapshot of last editor at write time';
