# CKEditor HTML ↔ ArticleBlock mapping

License: CKEditor 5 open-source via `ckeditor5` + `@ckeditor/ckeditor5-react`.  
`licenseKey`: `NEXT_PUBLIC_CKEDITOR_LICENSE_KEY` hoặc `"GPL"` (self-hosted GPL).

## Whitelist (sanitize)

Allowed tags: `p`, `br`, `h2`, `h3`, `ul`, `ol`, `li`, `strong`, `em`, `b`, `i`, `a`, `img`, `blockquote`, `figure`, `figcaption`.

Allowed attrs:

| Tag | Attrs |
|-----|--------|
| `a` | `href`, `title`, `rel`, `target` |
| `img` | `src`, `alt` |
| others | none (class/style stripped) |

`href`/`src` must be `http:`, `https:`, or relative `/…`. Reject `javascript:`.

## Mapping HTML → blocks (`htmlToBlocks`)

| HTML | Block |
|------|--------|
| `h2` / `h3` (also `h1`/`h4–h6` normalized) | `{ type: "heading", text }` (inner tags stripped) |
| `p`, `blockquote` | `{ type: "paragraph", text }` (inner tags stripped; bold/link lost in blocks) |
| `ul` / `ol` > `li` | `{ type: "list", items: string[] }` |
| `img` / `figure>img` | `{ type: "image", src, alt }` |
| other | flatten text into paragraph or drop |

## Mapping blocks → HTML (`blocksToHtml`)

| Block | HTML |
|-------|------|
| heading | `<h2>…</h2>` |
| paragraph | `<p>…</p>` |
| list | `<ul><li>…</li></ul>` |
| image | `<figure><img src alt /><figcaption>alt</figcaption></figure>` when alt set |

## Toolbar MVP

Heading, bold, italic, link, bulleted/numbered list, upload/insert image, undo/redo.
