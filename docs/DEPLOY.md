# Thế Giới Thuốc Mới

Next.js clone of [thegioithuocmoi.com](https://thegioithuocmoi.com) with a Supabase-backed public site and CMS admin.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres + Auth + Storage)

## Local development

```bash
npm install
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## Admin CMS (`/admin`)

1. Create a user in **Supabase Dashboard → Authentication → Users**.
2. Set **App Metadata** to include admin role:

```json
{ "role": "admin" }
```

3. Sign in at `/admin/login`.
4. Existing users were promoted to `admin` by migration `20260731_admin_role_fts_tags` — **sign out and sign in again** so the JWT picks up `app_metadata.role`.

Write access is gated by RLS `public.is_admin()` (JWT claim) and Next.js middleware.

## Database

Apply the canonical schema, then incremental migrations:

```bash
# Supabase SQL Editor or CLI
scripts/schema-content.sql
scripts/migrations/20260729_homepage_sidebar_auto_content.sql
scripts/migrations/20260731_admin_role_fts_tags.sql
scripts/migrations/20260731_vi_unaccent_search.sql
scripts/migrations/20260803_article_content_html.sql
```

Backfill CKEditor HTML from existing blocks (after `content_html` column exists). Prefer service role or SQL:

```sql
update public.articles
set content_html = public.blocks_to_html(blocks)
where (content_html is null or content_html = '')
  and jsonb_typeof(blocks) = 'array'
  and jsonb_array_length(blocks) > 0;
```

```bash
# Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (anon key fails RLS writes)
npx tsx scripts/backfill-content-html.ts --dry-run
npx tsx scripts/backfill-content-html.ts
```

CKEditor (admin): set `NEXT_PUBLIC_CKEDITOR_LICENSE_KEY` if not using GPL self-host; default is `GPL`.

## Deploy (Docker — chosen path)

Production deploys use **Docker standalone** (`Dockerfile` + `docker-compose.yml`).

```bash
# Ensure .env / .env.local has:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# NEXT_PUBLIC_SITE_URL=https://your-domain.com

docker compose up -d --build app
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, and build on `master`.

After publishing content in CMS, ArticleForm calls `POST /api/revalidate` so public pages refresh (layout also uses `revalidate = 60`).

## Useful routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/tim-kiem?q=` | Search (FTS + pagination) |
| `/admin` | CMS dashboard |
| `/admin/media` | Image library |
| `/admin/settings` | Branding |

## Visual QA

See [docs/research/VISUAL_QA_CHECKLIST.md](docs/research/VISUAL_QA_CHECKLIST.md).
