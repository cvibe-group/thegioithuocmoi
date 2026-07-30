# SiteFooter — thegioithuocmoi.com

## Source
https://thegioithuocmoi.com/ `#footer.footer-wrapper`

## Structure
```
footer#footer.footer-wrapper
  .absolute-footer.dark (bg brand magenta, centered)
    .container (max-width 1140px, px 15px)
      .footer-primary
        ul#menu-footer-menu (About us link)
        .copyright-footer (copyright text)
  a#top-link.back-to-top (fixed circle, outside bar flow)
```

## Visual
- Bar background: `#b809b1` (rgb(184, 9, 177))
- Padding: `10px 0 15px`
- Text align: center
- About us: white `#fff`, 18px, Open Sans, link to `/about-us/`
- Copyright: white `#fff`, ~14.4px — `thegioithuocmoi.com © All Rights Reserved - 2023`
- NOT a 3-column row; stacked centered

## Back to top
- Fixed `right: 20px; bottom: 20px`
- Circle ~39×39px, `border: 1px solid #0a0a0a`, transparent bg
- Angle-up icon dark `#0a0a0a`
- Default: opacity 0, pointer-events none, translateY(30%)
- `.active` after scroll: opacity 1, pointer-events auto, translateY(0)
- Hidden on medium/mobile (`hide-for-medium`, max-width 849px)
- aria-label: Go to top; href #top

## Interaction
- INTERACTION MODEL: scroll-driven visibility for back-to-top; click scrolls to top
