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

### Roles (`app_metadata.role`)

| Role | Quyền |
|------|--------|
| `super_admin` | Toàn quyền + quản lý user tại `/admin/users` |
| `editor` | Nội dung & cấu trúc (không settings/users) |
| `author` | Bài viết + media |
| `viewer` | Chỉ xem dashboard / danh sách bài |

Legacy `admin` được map thành `super_admin` (migration `20260805_cms_roles`).

### Tạo user

**Cách 1 (khuyến nghị):** đăng nhập Super Admin → `/admin/users` → tạo email/password + gán role.  
Cần `SUPABASE_SERVICE_ROLE_KEY` trong `.env.local`.

**Cách 2:** Supabase Dashboard → Authentication → Users → App Metadata:

```json
{ "role": "super_admin" }
```

Sau khi đổi role: **đăng xuất / đăng nhập lại** để JWT cập nhật.

Write DB gated bởi RLS `public.is_admin()` (roles ghi: super_admin, admin, editor, author) + middleware/page permission.

## Database

Apply the canonical schema, then incremental migrations:

```bash
# Supabase SQL Editor or CLI
scripts/schema-content.sql
scripts/migrations/20260729_homepage_sidebar_auto_content.sql
scripts/migrations/20260731_admin_role_fts_tags.sql
scripts/migrations/20260731_vi_unaccent_search.sql
scripts/migrations/20260803_article_content_html.sql
scripts/migrations/20260805_cms_roles.sql
scripts/migrations/20260805_article_audit_users.sql
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
| `/admin/users` | Quản lý user & role (super_admin) |
| `/admin/media` | Image library |
| `/admin/settings` | Branding |

## Visual QA

See [docs/research/VISUAL_QA_CHECKLIST.md](docs/research/VISUAL_QA_CHECKLIST.md).
