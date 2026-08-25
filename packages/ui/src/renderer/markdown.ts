/**
 * Parser for the markdown subset veri documents actually use (SRC-020): ##
 * headings, paragraphs, dash/ordered/checkbox lists, fenced code, pipe tables,
 * blockquotes, standalone images, and inline [[ID]] / `code` / **bold** /
 * *italic*. Presentation only — link *resolution* stays in @verikb/core.
 */

export type Seg =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'ref'; id: string };

export type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'para'; segs: Seg[] }
  | { kind: 'li'; segs: Seg[] }
  | { kind: 'oli'; num: string; segs: Seg[] }
  | { kind: 'check'; done: boolean; segs: Seg[] }
  | { kind: 'fence'; lang: string; text: string }
  | { kind: 'table'; header: Seg[][]; rows: Seg[][][] }
  | { kind: 'quote'; segs: Seg[] }
  | { kind: 'img'; alt: string; src: string };

// One id space, one regex (REQ-001): WF included so [[WF-001]] chips render
// in read mode too. Bold before italic so ** never half-matches as *.
const INLINE_RE = /(\[\[(?:REQ|DEC|WO|SRC|WF)-\d{3,}\]\])|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;

export function parseInline(text: string): Seg[] {
  const segs: Seg[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    if (m.index > last) segs.push({ kind: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) segs.push({ kind: 'ref', id: m[1].slice(2, -2) });
    else if (m[2] !== undefined) segs.push({ kind: 'code', text: m[2].slice(1, -1) });
    else if (m[3] !== undefined) segs.push({ kind: 'bold', text: m[3].slice(2, -2) });
    else if (m[4] !== undefined) segs.push({ kind: 'italic', text: m[4].slice(1, -1) });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ kind: 'text', text: text.slice(last) });
  return segs;
}

const CHECK_RE = /^[-*]\s+\[([ xX])\]\s+(.*)$/;
const LI_RE = /^[-*]\s+(.*)$/;
const OLI_RE = /^(\d+)\.\s+(.*)$/;
const HEADING_RE = /^(#{2,4})\s+(.*)$/;
const FENCE_RE = /^```(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;
const IMG_RE = /^!\[([^\]]*)\]\(([^()\s]+)\)$/;
/** A table separator row: cells of ---, :---, ---:, :---:. */
const TABLE_SEP_RE = /^[|\s:-]+$/;

/** Split a `| a | b |` row into trimmed cell texts. */
function tableCells(line: string): string[] {
  let inner = line;
  if (inner.startsWith('|')) inner = inner.slice(1);
  if (inner.endsWith('|')) inner = inner.slice(0, -1);
  return inner.split('|').map((c) => c.trim());
}

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paraLines: string[] = [];
  let itemLines: string[] | null = null;
  let itemDone: boolean | null = null;
  let itemNum: string | null = null;
  let fence: { lang: string; lines: string[] } | null = null;
  let quoteLines: string[] | null = null;
  let tableLines: string[] | null = null;

  const flushPara = (): void => {
    if (paraLines.length > 0) {
      blocks.push({ kind: 'para', segs: parseInline(paraLines.join(' ')) });
      paraLines = [];
    }
  };
  const flushItem = (): void => {
    if (itemLines !== null) {
      const segs = parseInline(itemLines.join(' '));
      if (itemNum !== null) blocks.push({ kind: 'oli', num: itemNum, segs });
      else if (itemDone !== null) blocks.push({ kind: 'check', done: itemDone, segs });
      else blocks.push({ kind: 'li', segs });
      itemLines = null;
      itemDone = null;
      itemNum = null;
    }
  };
  const flushQuote = (): void => {
    if (quoteLines !== null) {
      const text = quoteLines.filter((l) => l !== '').join(' ');
      if (text !== '') blocks.push({ kind: 'quote', segs: parseInline(text) });
      quoteLines = null;
    }
  };
  const flushTable = (): void => {
    if (tableLines !== null) {
      const cellRows = tableLines.filter((l) => !TABLE_SEP_RE.test(l)).map(tableCells);
      if (cellRows.length > 0) {
        blocks.push({
          kind: 'table',
          header: cellRows[0].map(parseInline),
          rows: cellRows.slice(1).map((r) => r.map(parseInline)),
        });
      }
      tableLines = null;
    }
  };
  const flushAll = (): void => {
    flushPara();
    flushItem();
    flushQuote();
    flushTable();
  };

  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    // Fence interiors are opaque (SRC-020): a ## line in here is code.
    if (fence !== null) {
      if (trimmed === '```') {
        blocks.push({ kind: 'fence', lang: fence.lang, text: fence.lines.join('\n') });
        fence = null;
      } else {
        fence.lines.push(line);
      }
      continue;
    }
    if (trimmed === '') {
      flushAll();
      continue;
    }
    const open = FENCE_RE.exec(trimmed);
    if (open !== null) {
      flushAll();
      fence = { lang: open[1].trim(), lines: [] };
      continue;
    }
    const heading = HEADING_RE.exec(trimmed);
    if (heading !== null) {
      flushAll();
      blocks.push({ kind: 'heading', text: heading[2] });
      continue;
    }
    // Continuation of a wrapped list item (indented under the dash/number).
    if (/^\s/.test(line) && itemLines !== null) {
      itemLines.push(trimmed);
      continue;
    }
    const quote = QUOTE_RE.exec(trimmed);
    if (quote !== null) {
      flushPara();
      flushItem();
      flushTable();
      if (quoteLines === null) quoteLines = [];
      quoteLines.push(quote[1].trim());
      continue;
    }
    if (trimmed.startsWith('|')) {
      flushPara();
      flushItem();
      flushQuote();
      if (tableLines === null) tableLines = [];
      tableLines.push(trimmed);
      continue;
    }
    const img = IMG_RE.exec(trimmed);
    if (img !== null) {
      flushAll();
      blocks.push({ kind: 'img', alt: img[1], src: img[2] });
      continue;
    }
    const check = CHECK_RE.exec(trimmed);
    if (check !== null) {
      flushAll();
      itemLines = [check[2]];
      itemDone = check[1] !== ' ';
      continue;
    }
    const li = LI_RE.exec(trimmed);
    if (li !== null) {
      flushAll();
      itemLines = [li[1]];
      continue;
    }
    const oli = OLI_RE.exec(trimmed);
    if (oli !== null) {
      flushAll();
      itemLines = [oli[2]];
      itemNum = oli[1];
      continue;
    }
    flushItem();
    flushQuote();
    flushTable();
    paraLines.push(trimmed);
  }
  // An unclosed fence still renders as code, never as swallowed text.
  if (fence !== null) blocks.push({ kind: 'fence', lang: fence.lang, text: fence.lines.join('\n') });
  flushAll();
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
