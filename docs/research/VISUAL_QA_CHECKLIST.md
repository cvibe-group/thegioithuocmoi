# Visual QA Checklist — Thế Giới Thuốc Mới

So sánh với site gốc và `docs/design-references/` + specs trong `docs/research/thegioithuocmoi.com/`.

## Desktop (≥1024px)

- [ ] Header sticky khi scroll (`BEHAVIORS.md`)
- [ ] Logo + nav + search mở đúng
- [ ] Nav dropdown (Thuốc / Liệu pháp…) hover/click
- [ ] Homepage: featured + secondary 3 cột (border-top `#ebbee7`) + sections
- [ ] Sidebar panels: border brand, list inset, không sticky (theo yêu cầu gần đây)
- [ ] Category archive: 3 cột text cards + pagination
- [ ] Article detail: breadcrumb, hero, blocks, share sidebar, related
- [ ] Glossary tabs + letter sections
- [ ] Footer magenta bar + About us + back-to-top
- [ ] Search results + pagination

## Mobile (≤640px)

- [ ] Header collapse / menu mobile
- [ ] Search overlay usable
- [ ] Single-column homepage / archive
- [ ] Article readable; share sidebar không che nội dung
- [ ] Footer / back-to-top

## CMS smoke

- [ ] Login chỉ với `app_metadata.role = admin`
- [ ] Tạo/sửa bài → publish → `/api/revalidate` → thấy trên public trong ~60s
- [ ] Preview draft: `/path?preview=1` khi chưa publish
- [ ] Upload media + Copy URL + chọn ảnh trong ArticleForm
- [ ] Filter articles theo chuyên mục (optgroup theo archive)
- [ ] CKEditor body: heading / bold / list / link / ảnh (upload + Media)
- [ ] Bài có `content_html` render HTML; bài chỉ `blocks` vẫn fallback OK

## SEO

- [ ] Article có canonical + OG title/description/image
- [ ] View-source có JSON-LD Article + BreadcrumbList
- [ ] `/sitemap.xml` và `/robots.txt` reachable

## CKEditor body

- [ ] Admin: mở bài cũ → nội dung hiện trong CKEditor (từ `content_html` hoặc `blocksToHtml`)
- [ ] Public: bold/link/ảnh trong body khi đã save HTML
- [ ] Glossary highlight trên HTML body (client) + blocks fallback
- [ ] Sanitize: payload `<script>` / `onerror` không render