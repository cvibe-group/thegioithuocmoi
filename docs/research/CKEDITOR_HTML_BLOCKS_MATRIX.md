# CKEditor HTML ↔ ArticleBlock mapping

License: CKEditor 5 open-source via `ckeditor5` + `@ckeditor/ckeditor5-react`.  
`licenseKey`: `NEXT_PUBLIC_CKEDITOR_LICENSE_KEY` hoặc `"GPL"` (self-hosted GPL).

## Whitelist (sanitize)

Allowed tags: `p`, `br`, `h2`, `h3`, `ul`, `ol`, `li`, `strong`, `em`, `b`, `i`, `span`, `a`, `img`, `blockquote`, `figure`, `figcaption`, `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `colgroup`, `col`.

Allowed attrs:

| Tag | Attrs |
|-----|--------|
| `a` | `href`, `title`, `rel`, `target`, `style` (color) |
| `img` | `src`, `alt` |
| `span` / inline | `style` (color) |
| `td` / `th` | `colspan`, `rowspan`, `style` (color/text-align/width), `class` |
| `p` / headings / `table` / `figure` | `style` (color/text-align/width), `class` (`table`, alignment) |
| others | none (unsafe style/class stripped) |

`href`/`src` must be `http:`, `https:`, or relative `/…`. Reject `javascript:`.

## Mapping HTML → blocks (`htmlToBlocks`)

| HTML | Block |
|------|--------|
| `h2` / `h3` (also `h1`/`h4–h6` normalized) | `{ type: "heading", text }` (inner tags stripped) |
| `p`, `blockquote` | `{ type: "paragraph", text }` (inner tags stripped; bold/link lost in blocks) |
| `ul` / `ol` > `li` | `{ type: "list", items: string[] }` |
| `img` / `figure>img` | `{ type: "image", src, alt }` |
| `table` | not represented in blocks (kept in `content_html` only) |
| other | flatten text into paragraph or drop |

## Mapping blocks → HTML (`blocksToHtml`)

| Block | HTML |
|-------|------|
| heading | `<h2>…</h2>` |
| paragraph | `<p>…</p>` |
| list | `<ul><li>…</li></ul>` |
| image | `<figure><img src alt /><figcaption>alt</figcaption></figure>` when alt set |

## Toolbar

Heading, bold, italic, **font color**, link, **alignment**, list, blockquote, **insert table**, image upload, undo/redo.
