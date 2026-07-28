# ArticleDetailPage Specification

## Overview
- **Target file:** `src/components/ArticleDetailPage.tsx`
- **Route:** `src/app/[year]/[month]/[day]/[slug]/page.tsx`
- **Interaction model:** static + share links (click)

## DOM Structure
- Share sidebar (absolute left, circular social icons)
- Breadcrumbs: Trang chủ » Category
- Category label (uppercase purple)
- H1 title (~27.2px bold)
- Meta row with clock icon + datetime
- Featured image
- Author credit (right-aligned)
- Body: headings (uppercase), paragraphs, bullet lists; glossary terms linked in purple
- Author bio box (lavender background)
- Related articles (3-col ArticleCard grid)

## Key CSS
- Content max-width: 750px
- Body font: 18px / 1.6
- Brand highlight links: `#b809b1`
- Category: 16px bold uppercase `#b809b1`
