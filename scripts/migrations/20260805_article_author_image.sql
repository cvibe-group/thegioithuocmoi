-- Per-article author avatar URL (Supabase Storage / external)

alter table public.articles
  add column if not exists author_image text;

comment on column public.articles.author_image is
  'Public URL of author avatar (Supabase Storage or external)';
