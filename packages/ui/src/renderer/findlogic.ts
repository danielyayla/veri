/**
 * Find in document (WO-057, SRC-029) — the pure half. Case-insensitive
 * substring matching over plain strings and over rendered-text segments,
 * wrap-around index math, and the bar's state reducer. No DOM: the DOM walk,
 * CSS Custom Highlights painting, and CM6 glue live in find.ts / editor.ts
 * and stay thin.
 */

export interface MatchRange {
  from: number;
  to: number;
}

/**
 * Non-overlapping case-insensitive substring matches — the same semantics
 * @codemirror/search's highlight/matchAll cursor uses (each match resumes
 * after the previous one), so the edit-mode count agrees with what CM6
 * paints. Empty queries match nothing.
 */
export function matchRanges(text: string, query: string): MatchRange[] {
  if (query === '') return [];
  const hay = text.toLowerCase();
  const needle = query.toLowerCase();
  const out: MatchRange[] = [];
  let at = hay.indexOf(needle);
  while (at !== -1) {
    out.push({ from: at, to: at + needle.length });
    at = hay.indexOf(needle, at + needle.length);
  }
  return out;
}

/** One rendered text node's content, with a flag marking a block boundary
    between it and the previous part (matches never cross those). */
export interface FindPart {
  text: string;
  breakBefore: boolean;
}

export interface SegPoint {
  /** Index into the parts (= text nodes) array. */
  seg: number;
  /** Character offset inside that part. */
  off: number;
}

/** A match over segmented text: start is inclusive, end exclusive, possibly
    spanning several parts (inline boundaries only). */
export interface SegMatch {
  start: SegPoint;
  end: SegPoint;
}

/**
 * matchRanges over a rendered document's text nodes: parts are joined in
 * order — with a `\n` separator at every block boundary, which no query can
 * contain (the bar's input is single-line) — matched as one string, and the
 * hits mapped back to (part, offset) pairs. Matches may span parts within a
 * block ("foo **bar**" finds "foo bar") but never cross a block break.
 */
export function segmentMatches(parts: readonly FindPart[], query: string): SegMatch[] {
  if (query === '' || query.includes('\n')) return [];
  let joined = '';
  const starts: number[] = [];
  for (const part of parts) {
    if (part.breakBefore && joined !== '') joined += '\n';
    starts.push(joined.length);
    joined += part.text;
  }
  return matchRanges(joined, query).map((r) => ({
    start: locate(starts, parts, r.from, false),
    end: locate(starts, parts, r.to, true),
  }));
}

/** Map a joined-string offset back to a (part, offset) pair. Ends are
    exclusive, so an end landing on a part boundary belongs to the part it
    closes, not the one it starts. */
function locate(starts: readonly number[], parts: readonly FindPart[], pos: number, isEnd: boolean): SegPoint {
  for (let i = starts.length - 1; i >= 0; i--) {
    const off = pos - starts[i];
    if (off > 0 || (off === 0 && !isEnd) || i === 0) {
      // Clamp inside the part: matched characters are never separators, so
      // this only trims the exclusive end back onto its own part.
      return { seg: i, off: Math.min(Math.max(off, 0), parts[i].text.length) };
    }
  }
  return { seg: 0, off: 0 };
}

/** ‹ › / Enter / Shift+Enter: advance with wrap in either direction. */
export function stepFind(current: number, total: number, dir: 1 | -1): number {
  if (total <= 0) return 0;
  return (current + dir + total) % total;
}

/** Keep the current index meaningful when the match set shrinks. */
export function clampFind(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(0, current), total - 1);
}

/** The visible `3/17` (1-based); zero matches read `0/0`. */
export function countLabel(current: number, total: number): string {
  return total === 0 ? '0/0' : `${clampFind(current, total) + 1}/${total}`;
}

/**
 * The current index after a CM6 findNext/findPrevious moved the selection:
 * the exact match when the selection sits on one of ours, else how many
 * matches precede the selection (CM6 can land on an overlapping match our
 * non-overlapping count skips).
 */
export function currentIndex(ranges: readonly MatchRange[], from: number, to: number): number {
  const exact = ranges.findIndex((r) => r.from === from && r.to === to);
  if (exact !== -1) return exact;
  let before = 0;
  for (const r of ranges) if (r.from < from) before++;
  return clampFind(before, ranges.length);
}

/** The bar's transient state: nothing else — the query is never persisted
    (SRC-029), and the match set is derived, not stored. */
export interface FindBarState {
  query: string;
  current: number;
}

export type FindEvent =
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'query'; query: string }
  | { type: 'step'; dir: 1 | -1; total: number }
  | { type: 'clamp'; total: number };

/**
 * The bar's state machine. Opening an already-open bar keeps its query
 * (the "previous query of this bar instance" prefill — the shell refocuses
 * and selects the input); a fresh open starts empty. A query edit resets
 * the cursor to the first match; stepping wraps; clamp follows the match
 * set as the document or backend changes.
 */
export function findReduce(state: FindBarState | null, ev: FindEvent): FindBarState | null {
  switch (ev.type) {
    case 'open':
      return state ?? { query: '', current: 0 };
    case 'close':
      return null;
    case 'query':
      return state === null ? null : { query: ev.query, current: 0 };
    case 'step':
      return state === null ? null : { query: state.query, current: stepFind(state.current, ev.total, ev.dir) };
    case 'clamp':
      return state === null ? null : { query: state.query, current: clampFind(state.current, ev.total) };
  }
}
