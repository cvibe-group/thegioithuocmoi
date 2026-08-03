# Image migration audit notes

## Buckets / folders

- Public bucket: `images`
- WP migrate folder: `thegioithuocmoi/wp-uploads` (protected in MediaManager)
- New uploads: `thegioithuocmoi/` (article-*, brand assets)

## Fallback

Articles without a usable `image` URL use the placeholder resolver in `src/lib/article-image.ts`. Prefer fixing rows that still point at dead WP hosts or empty paths.

## Suggested SQL checks (Supabase SQL Editor)

```sql
-- Published articles missing image
select count(*) from articles
where is_published and (image is null or image = '');

-- Likely placeholder / local-only paths
select path, title, image from articles
where is_published
  and image is not null
  and image not ilike '%supabase.co/storage%'
limit 50;

-- Featured / newest without storage URLs (homepage priority)
select path, title, image, published_on
from articles
where is_published
order by published_on desc nulls last
limit 30;
```

## Fix workflow

1. Open `/admin/media` → `wp-uploads` or upload new assets.
2. Copy URL → paste into article hero or use **Chọn từ Media**.
3. Save → revalidate runs automatically from ArticleForm.
