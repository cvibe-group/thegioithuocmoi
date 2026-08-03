"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { prepareGlossaryTerms } from "@/lib/glossary-highlight";
import type { GlossaryTooltipTerm } from "@/types/content";

function highlightTextNode(
  textNode: Text,
  terms: GlossaryTooltipTerm[],
  excludeHref: string,
  keyPrefix: string,
) {
  const text = textNode.nodeValue ?? "";
  if (!text.trim()) return;

  const prepared = prepareGlossaryTerms(terms, excludeHref);
  if (!prepared.length) return;

  const lower = text.toLocaleLowerCase("vi");
  type Span = { start: number; end: number; term: GlossaryTooltipTerm };
  const candidates: Span[] = [];

  for (const term of prepared) {
    const needle = term.term.toLocaleLowerCase("vi");
    if (!needle) continue;
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      candidates.push({
        start: idx,
        end: idx + needle.length,
        term,
      });
      from = idx + 1;
    }
  }

  candidates.sort(
    (a, b) => a.start - b.start || b.end - a.start - (a.end - a.start),
  );

  const accepted: Span[] = [];
  let cursor = 0;
  for (const span of candidates) {
    if (span.start < cursor) continue;
    accepted.push(span);
    cursor = span.end;
  }
  if (!accepted.length) return;

  const frag = document.createDocumentFragment();
  const roots: Root[] = [];
  let pos = 0;
  accepted.forEach((span, index) => {
    if (span.start > pos) {
      frag.appendChild(document.createTextNode(text.slice(pos, span.start)));
    }
    const mount = document.createElement("span");
    mount.dataset.glossaryMount = "1";
    frag.appendChild(mount);
    const root = createRoot(mount);
    roots.push(root);
    root.render(
      <GlossaryTerm
        key={`${keyPrefix}-${index}`}
        term={text.slice(span.start, span.end)}
        href={span.term.href}
        excerpt={span.term.excerpt}
      />,
    );
    pos = span.end;
  });
  if (pos < text.length) {
    frag.appendChild(document.createTextNode(text.slice(pos)));
  }

  textNode.parentNode?.replaceChild(frag, textNode);
  return roots;
}

function walkAndHighlight(
  rootEl: HTMLElement,
  terms: GlossaryTooltipTerm[],
  excludeHref: string,
): Root[] {
  const skip = new Set(["A", "SCRIPT", "STYLE", "CODE", "PRE"]);
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (skip.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[data-glossary-mount]")) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  const roots: Root[] = [];
  textNodes.forEach((node, i) => {
    const created = highlightTextNode(node, terms, excludeHref, `html-g-${i}`);
    if (created) roots.push(...created);
  });
  return roots;
}

export function ArticleBodyHtml({
  html,
  glossaryTerms = [],
  articlePath,
}: {
  html: string;
  glossaryTerms?: GlossaryTooltipTerm[];
  articlePath: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<Root[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    rootsRef.current.forEach((root) => {
      try {
        root.unmount();
      } catch {
        // ignore
      }
    });
    rootsRef.current = [];

    // Re-apply HTML in case a prior highlight pass mutated the DOM.
    el.innerHTML = html;

    if (glossaryTerms.length) {
      rootsRef.current = walkAndHighlight(el, glossaryTerms, articlePath);
    }

    return () => {
      rootsRef.current.forEach((root) => {
        try {
          root.unmount();
        } catch {
          // ignore
        }
      });
      rootsRef.current = [];
    };
  }, [html, glossaryTerms, articlePath]);

  return (
    <div
      ref={containerRef}
      className="article-body space-y-4 text-[18px] leading-[1.6] text-[#0a0a0a]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
