-- CMS multi-role: expand is_admin() write gate + map legacy admin → super_admin

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

-- Promote legacy role claim only (do not touch users without a CMS role)
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"super_admin"}'::jsonb
where coalesce(raw_app_meta_data ->> 'role', '') = 'admin';
