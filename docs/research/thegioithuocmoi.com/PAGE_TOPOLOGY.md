# Page Topology — thegioithuocmoi.com

## Layout
- **Scroll container:** Native window scroll (no Lenis)
- **Page template:** Right sidebar layout for home + category archives; full-width for glossary + article detail
- **Max content width:** ~1140px centered (article body ~750px)
- **Z-index layers:** Header z-index 1001 (sticky), search overlay 1100

## Routes
| Route | Template |
|-------|----------|
| `/` | Homepage (featured + sections + sidebar) |
| `/thuoc`, `/vaccines`, … | Category archive |
| `/thuoc/[slug]`, `/lieu-phap-gene-te-bao/[slug]` | Subcategory archive |
| `/benh-hoc`, `/xet-nghiem-chi-so`, `/thuat-ngu` | Glossary index |
| `/[year]/[month]/[day]/[slug]` | Article detail |

## Homepage sections (top → bottom)
| # | Name | Interaction |
|---|------|-------------|
| 1 | SiteHeader | click/hover (dropdowns, search overlay, mobile menu) |
| 2 | FeaturedNews | static |
| 3 | Article sections | static |
| 4 | SidebarPanels | static links |
| 5 | SiteFooter | static |

## Article detail sections
| # | Name | Interaction |
|---|------|-------------|
| 1 | ShareSidebar | click (social share) |
| 2 | Breadcrumbs + title + meta | static |
| 3 | Featured image + body | glossary term links |
| 4 | Author bio | static |
| 5 | Related articles | static |
