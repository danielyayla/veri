/**
 * Parser for the markdown subset veri documents actually use: ## headings,
 * paragraphs, dash lists, checkbox lists, and inline [[ID]] / `code` / **bold**.
 * Presentation only — link *resolution* stays in @veri/core.
 */

export type Seg =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'ref'; id: string };

export type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'para'; segs: Seg[] }
  | { kind: 'li'; segs: Seg[] }
  | { kind: 'check'; done: boolean; segs: Seg[] };

const INLINE_RE = /(\[\[(?:REQ|DEC|WO|SRC)-\d{3}\]\])|(`[^`]+`)|(\*\*[^*]+\*\*)/g;

export function parseInline(text: string): Seg[] {
  const segs: Seg[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    if (m.index > last) segs.push({ kind: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) segs.push({ kind: 'ref', id: m[1].slice(2, -2) });
    else if (m[2] !== undefined) segs.push({ kind: 'code', text: m[2].slice(1, -1) });
    else if (m[3] !== undefined) segs.push({ kind: 'bold', text: m[3].slice(2, -2) });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ kind: 'text', text: text.slice(last) });
  return segs;
}

const CHECK_RE = /^[-*]\s+\[([ xX])\]\s+(.*)$/;
const LI_RE = /^[-*]\s+(.*)$/;
const HEADING_RE = /^(#{2,4})\s+(.*)$/;

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paraLines: string[] = [];
  let itemLines: string[] | null = null;
  let itemDone: boolean | null = null;

  const flushPara = (): void => {
    if (paraLines.length > 0) {
      blocks.push({ kind: 'para', segs: parseInline(paraLines.join(' ')) });
      paraLines = [];
    }
  };
  const flushItem = (): void => {
    if (itemLines !== null) {
      const segs = parseInline(itemLines.join(' '));
      blocks.push(itemDone === null ? { kind: 'li', segs } : { kind: 'check', done: itemDone, segs });
      itemLines = null;
      itemDone = null;
    }
  };

  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (trimmed === '') {
      flushPara();
      flushItem();
      continue;
    }
    const heading = HEADING_RE.exec(trimmed);
    if (heading !== null) {
      flushPara();
      flushItem();
      blocks.push({ kind: 'heading', text: heading[2] });
      continue;
    }
    // Continuation of a wrapped list item (indented under the dash).
    if (/^\s/.test(line) && itemLines !== null) {
      itemLines.push(trimmed);
      continue;
    }
    const check = CHECK_RE.exec(trimmed);
    if (check !== null) {
      flushPara();
      flushItem();
      itemLines = [check[2]];
      itemDone = check[1] !== ' ';
      continue;
    }
    const li = LI_RE.exec(trimmed);
    if (li !== null) {
      flushPara();
      flushItem();
      itemLines = [li[1]];
      continue;
    }
    flushItem();
    paraLines.push(trimmed);
  }
  flushPara();
  flushItem();
  return blocks;
}

export function plainText(segs: Seg[]): string {
  return segs.map((s) => (s.kind === 'ref' ? `[[${s.id}]]` : s.text)).join('');
}

/** Split a body into sections by ## heading; blocks before the first heading land under "". */
export function sections(markdown: string): Map<string, Block[]> {
  const out = new Map<string, Block[]>();
  let current = '';
  out.set('', []);
  for (const block of parseBlocks(markdown)) {
    if (block.kind === 'heading') {
      current = block.text;
      if (!out.has(current)) out.set(current, []);
    } else {
      out.get(current)!.push(block);
    }
  }
  return out;
}
