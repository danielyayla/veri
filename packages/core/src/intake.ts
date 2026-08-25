/**
 * Evidence intake (REQ-031, WO-094): pure derivations that turn one
 * already-read evidence file into the pieces of a source document — the
 * extracted text, a title, the preserved-original path, and the document
 * text itself. No fs access anywhere in this module: hosts read the file
 * and write the results (the DEC-040 posture applied to intake).
 */

/** The formats `veri import <file>` accepts (DEC-093): text-bearing, with
    extraction that needs no dependencies. Everything else is refused by
    naming this set — never filed as an empty shell (REQ-031). */
export const INTAKE_EXTENSIONS = ['md', 'txt', 'eml'] as const;
export type IntakeKind = (typeof INTAKE_EXTENSIONS)[number];

export type IntakeExtraction =
  | { ok: true; kind: IntakeKind; text: string }
  | { ok: false; message: string };

const REFUSAL = `supported formats: ${INTAKE_EXTENSIONS.map((e) => '.' + e).join(' ')} — audio, PDF, and office formats need extraction Veri does not ship (no network, no heavy dependencies in v1)`;

function intakeKind(filename: string): IntakeKind | null {
  const at = filename.lastIndexOf('.');
  if (at < 0) return null;
  const ext = filename.slice(at + 1).toLowerCase();
  return (INTAKE_EXTENSIONS as readonly string[]).includes(ext) ? (ext as IntakeKind) : null;
}

/** Decode quoted-printable (RFC 2045 §6.7): soft line breaks vanish, =XX
    byte escapes decode. UTF-8 multi-byte sequences arrive as consecutive
    escapes, so decode to bytes first and interpret once at the end. */
function decodeQuotedPrintable(text: string): string {
  const joined = text.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < joined.length; i++) {
    if (joined[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(joined.slice(i + 1, i + 3))) {
      bytes.push(parseInt(joined.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(joined.charCodeAt(i));
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

interface EmlPart {
  headers: Map<string, string>;
  body: string;
}

function splitHeaders(raw: string): EmlPart {
  const at = raw.search(/\r?\n\r?\n/);
  const head = at < 0 ? raw : raw.slice(0, at);
  const body = at < 0 ? '' : raw.slice(raw.indexOf('\n', at) + 1).replace(/^\n/, '');
  const headers = new Map<string, string>();
  let current: string | null = null;
  for (const line of head.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && current !== null) {
      headers.set(current, `${headers.get(current)} ${line.trim()}`);
    } else {
      const colon = line.indexOf(':');
      if (colon > 0) {
        current = line.slice(0, colon).toLowerCase();
        headers.set(current, line.slice(colon + 1).trim());
      }
    }
  }
  return { headers, body };
}

/** The first text/plain leaf of a (possibly multipart) message, decoded per
    its Content-Transfer-Encoding. Base64 and nested multiparts beyond one
    level are left to the refusal path — this is deliberately the minimal
    reader for the mail people export, not a MIME implementation. */
function emlText(raw: string): string | null {
  const { headers, body } = splitHeaders(raw);
  const contentType = headers.get('content-type') ?? 'text/plain';
  const boundary = /boundary="?([^";]+)"?/i.exec(contentType)?.[1];
  const decode = (part: EmlPart): string | null => {
    const encoding = (part.headers.get('content-transfer-encoding') ?? '').toLowerCase();
    if (encoding === 'base64') return null;
    return encoding === 'quoted-printable' ? decodeQuotedPrintable(part.body) : part.body;
  };
  if (boundary === undefined) {
    if (!/text\/(plain|markdown)/i.test(contentType) && !contentType.startsWith('text')) return null;
    return decode({ headers, body });
  }
  for (const chunk of body.split(`--${boundary}`)) {
    const part = splitHeaders(chunk.replace(/^\r?\n/, ''));
    if (/text\/plain/i.test(part.headers.get('content-type') ?? '')) {
      const text = decode(part);
      if (text !== null) return text;
    }
  }
  return null;
}

/** Headline facts of an email, rendered as the body's preamble so the
    source document reads as evidence without opening the original. */
function emlPreamble(headers: Map<string, string>): string {
  const rows = (['from', 'to', 'date', 'subject'] as const)
    .filter((h) => headers.has(h))
    .map((h) => `- ${h[0].toUpperCase()}${h.slice(1)}: ${headers.get(h)}`);
  return rows.length === 0 ? '' : `${rows.join('\n')}\n\n`;
}

/**
 * Extract the text a source document will carry from one evidence file.
 * Refusals carry the message the CLI prints verbatim: the supported set,
 * named plainly (REQ-031's loud-and-honest bar).
 */
export function extractIntake(filename: string, content: Uint8Array | string): IntakeExtraction {
  const kind = intakeKind(filename);
  if (kind === null) {
    return { ok: false, message: `cannot import ${filename}: ${REFUSAL}` };
  }
  const raw = typeof content === 'string' ? content : new TextDecoder('utf-8', { fatal: false }).decode(content);
  if (raw.includes('\u0000')) {
    return { ok: false, message: `cannot import ${filename}: the file is not text — ${REFUSAL}` };
  }
  let text: string;
  if (kind === 'eml') {
    const body = emlText(raw);
    if (body === null) {
      return { ok: false, message: `cannot import ${filename}: no readable text/plain part in the message — ${REFUSAL}` };
    }
    text = `${emlPreamble(splitHeaders(raw).headers)}${body}`;
  } else {
    text = raw;
  }
  const trimmed = text.replace(/\r\n/g, '\n').trim();
  if (trimmed === '') {
    return { ok: false, message: `cannot import ${filename}: no text to extract — refusing to file an empty source` };
  }
  return { ok: true, kind, text: trimmed };
}

/** A human title for the imported source: the markdown H1, the email
    subject, or the filename stem with separators opened up. */
export function deriveIntakeTitle(filename: string, extraction: { kind: IntakeKind; text: string }): string {
  if (extraction.kind === 'md') {
    const h1 = /^#\s+(.+)$/m.exec(extraction.text)?.[1].trim();
    if (h1 !== undefined && h1 !== '') return h1.slice(0, 120);
  }
  if (extraction.kind === 'eml') {
    const subject = /^- Subject: (.+)$/m.exec(extraction.text)?.[1].trim();
    if (subject !== undefined && subject !== '') return subject.slice(0, 120);
  }
  const stem = filename.split('/').pop()!.replace(/\.[^.]+$/, '');
  const opened = stem.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const titled = opened === '' ? 'Imported file' : opened[0].toUpperCase() + opened.slice(1);
  return titled.slice(0, 120);
}

/** Where the unmodified original lands, veri/-relative (DEC-094): keyed by
    the source id so names never collide, under originals/ — a directory
    loadProject skips the way it skips templates/ (DEC-023 precedent). */
export function originalStoragePath(id: string, filename: string): string {
  const base = filename.split('/').pop()!;
  const safe = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return `originals/${id}-${safe === '' ? 'original' : safe}`;
}

export interface ImportedSourceInput {
  id: string;
  title: string;
  /** Local calendar date, YYYY-MM-DD (DEC-076). */
  date: string;
  /** veri/-relative path of the preserved original. */
  original: string;
  text: string;
}

/** The complete source document text: frontmatter (status imported, the
    `original:` reference) plus the extracted text as the body. */
export function buildImportedSource(input: ImportedSourceInput): string {
  return [
    '---',
    `id: ${input.id}`,
    'type: source',
    `title: ${JSON.stringify(input.title)}`,
    'status: imported',
    `created: ${input.date}`,
    `updated: ${input.date}`,
    `original: ${JSON.stringify(input.original)}`,
    '---',
    '',
    input.text,
    '',
  ].join('\n');
}
