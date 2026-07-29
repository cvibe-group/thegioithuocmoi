import type { ReactNode } from "react";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import type { GlossaryTooltipTerm } from "@/types/content";

/** Prepare terms: longest first, dedupe case-insensitive, skip self article path. */
export function prepareGlossaryTerms(
  terms: GlossaryTooltipTerm[],
  excludeHref?: string,
): GlossaryTooltipTerm[] {
  const exclude = excludeHref
    ? (excludeHref.startsWith("/") ? excludeHref : `/${excludeHref}`).toLowerCase()
    : null;
  const byKey = new Map<string, GlossaryTooltipTerm>();

  for (const item of terms) {
    const term = item.term.trim();
    if (!term) continue;
    const href = item.href.startsWith("/") ? item.href : `/${item.href}`;
    if (exclude && href.toLowerCase() === exclude) continue;
    const key = term.toLocaleLowerCase("vi");
    if (byKey.has(key)) continue;
    byKey.set(key, { term, href, excerpt: item.excerpt ?? "" });
  }

  return [...byKey.values()].sort(
    (a, b) => b.term.length - a.term.length || a.term.localeCompare(b.term, "vi"),
  );
}

type MatchSpan = {
  start: number;
  end: number;
  text: string;
  term: GlossaryTooltipTerm;
};

function findNonOverlappingMatches(
  text: string,
  terms: GlossaryTooltipTerm[],
): MatchSpan[] {
  const lower = text.toLocaleLowerCase("vi");
  const candidates: MatchSpan[] = [];

  for (const term of terms) {
    const needle = term.term.toLocaleLowerCase("vi");
    if (!needle) continue;
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      candidates.push({
        start: idx,
        end: idx + needle.length,
        text: text.slice(idx, idx + needle.length),
        term,
      });
      from = idx + 1;
    }
  }

  // Prefer earlier start, then longer match (terms already longest-first but re-sort spans).
  candidates.sort(
    (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start),
  );

  const accepted: MatchSpan[] = [];
  let cursor = 0;
  for (const span of candidates) {
    if (span.start < cursor) continue;
    accepted.push(span);
    cursor = span.end;
  }
  return accepted;
}

/**
 * Split text and wrap every glossary match (all occurrences, longest-first, non-overlapping).
 */
export function highlightGlossaryText(
  text: string,
  terms: GlossaryTooltipTerm[],
  keyPrefix = "g",
  excludeHref?: string,
): ReactNode[] {
  if (!text) return [];
  const prepared = prepareGlossaryTerms(terms, excludeHref);
  if (!prepared.length) return [text];

  const matches = findNonOverlappingMatches(text, prepared);
  if (!matches.length) return [text];

  const nodes: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    if (match.start > cursor) {
      nodes.push(
        <span key={`${keyPrefix}-t-${index}`}>
          {text.slice(cursor, match.start)}
        </span>,
      );
    }
    nodes.push(
      <GlossaryTerm
        key={`${keyPrefix}-m-${index}-${match.term.href}`}
        term={match.text}
        href={match.term.href}
        excerpt={match.term.excerpt}
      />,
    );
    cursor = match.end;
  });
  if (cursor < text.length) {
    nodes.push(
      <span key={`${keyPrefix}-tail`}>{text.slice(cursor)}</span>,
    );
  }
  return nodes;
}
