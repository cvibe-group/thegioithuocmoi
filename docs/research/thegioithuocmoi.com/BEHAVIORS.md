# Behaviors — thegioithuocmoi.com

## Scroll
- No smooth scroll library (Lenis: false)
- scroll-snap: none
- Header has `sticky-jump` class — sticky on scroll with background transition
- **Trigger:** scroll > ~0px
- **Transition:** `background-color 0.3s, opacity 0.3s`

## Header Navigation
- **INTERACTION MODEL:** click/hover-driven dropdowns
- Nav items with dropdown: Thuốc, Liệu pháp Gene – Tế bào
- Search icon opens search overlay (Ajax Search Pro)
- Mobile (<850px): hamburger menu replaces horizontal nav

## Hover States
- Article title links: color stays purple `rgb(184, 9, 177)`, underline on hover
- Nav links: opacity/color change on hover
- "Xem thêm" / "Xem tất cả" links: purple `rgb(184, 9, 177)`

## Responsive
- **Desktop 1440px:** 2-col featured hero, 3-col news grid, main+sidebar layout
- **Tablet 768px:** sidebar moves below main content
- **Mobile 390px:** single column, hamburger nav, stacked articles
