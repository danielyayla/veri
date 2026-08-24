import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ID_RE, typeOfId } from './ids.ts';
import { nextIdNumber, recordIssuedId, type IdPrefix } from './idstore.ts';
import { loadProject } from './load.ts';
import { parseDocument } from './parse.ts';

/**
 * Atomic id renumber (DEC-070, REQ-026): move one document to a new id and
 * rewrite the id line, the filename's id prefix, and inbound references in
 * one computed-then-written pass — every planned file re-parses before
 * anything touches disk (the approve.ts guard posture), and veri/ids is
 * bumped so neither number is ever reissued.
 *
 * Reference policy per DEC-070: when the old id is uniquely held, every
 * inbound frontmatter link, superseded_by, and inline [[ref]] is rewritten —
 * nothing dangles, nothing is left behind. When the id is CONTESTED
 * (duplicate claimants — the team-merge case), references are never
 * rewritten by guessing: they keep resolving to the remaining claimant, and
 * the result lists each one for review; `refs` names the files whose
 * references the resolver wants rewritten to the new id.
 */

export interface RemainingRef {
  /** veri/-relative path of the file still referencing the contested id. */
  file: string;
  /** 1-based line number of the reference. */
  line: number;
  text: string;
}

export interface RenumberResult {
  from: string;
  to: string;
  /** The moved document's veri/-relative path before the rename. */
  file: string;
  /** Its path after — the filename's id prefix follows the id. */
  renamedTo: string;
  /** Whether `from` had duplicate claimants (the merge-collision case). */
  contested: boolean;
  /** Other files whose references to `from` were rewritten to `to`. */
  rewrittenFiles: string[];
  /** Contested only: references left pointing at the remaining claimant. */
  remainingRefs: RemainingRef[];
}

export interface RenumberOptions {
  /** Target id; defaults to the next free id of the document's type. */
  to?: string;
  /** Which claimant moves — required when `from` is contested. */
  file?: string;
  /** Contested only: files whose references to `from` should follow the
      moved document to its new id. */
  refs?: string[];
}

/** Accept paths as veri-relative or repo-relative (leading "veri/"). */
function normalizePath(path: string): string {
  const forward = path.split('\\').join('/').replace(/^\.\//, '');
  return forward.startsWith('veri/') ? forward.slice('veri/'.length) : forward;
}

function escapeRe(id: string): string {
  return id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Rewrite every reference to `from` — frontmatter link lines,
    superseded_by, inline [[refs]] — in one file's raw text. */
function rewriteRefs(raw: string, from: string, to: string): string {
  const id = escapeRe(from);
  return raw
    .replace(new RegExp(`^(\\s*-\\s*id:\\s*)${id}[ \\t]*$`, 'gm'), `$1${to}`)
    .replace(new RegExp(`^(superseded_by:\\s*)${id}[ \\t]*$`, 'm'), `$1${to}`)
    .replace(new RegExp(`\\[\\[${id}\\]\\]`, 'g'), `[[${to}]]`);
}

/** 1-based lines of `raw` that reference `from` as a link, superseded_by, or [[ref]]. */
function referenceLines(raw: string, from: string): Array<{ line: number; text: string }> {
  const id = escapeRe(from);
  const patterns = [
    new RegExp(`^\\s*-\\s*id:\\s*${id}[ \\t]*$`),
    new RegExp(`^superseded_by:\\s*${id}[ \\t]*$`),
    new RegExp(`\\[\\[${id}\\]\\]`),
  ];
  return raw
    .split('\n')
    .map((text, index) => ({ line: index + 1, text: text.trimEnd() }))
    .filter(({ text }) => patterns.some((re) => re.test(text)));
}

export async function renumberDocument(
  veriDir: string | URL,
  from: string,
  options: RenumberOptions = {},
): Promise<RenumberResult> {
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  const wanted = from.toUpperCase();
  if (!ID_RE.test(wanted)) throw new Error(`"${from}" is not a document id (e.g. DEC-070)`);

  const load = await loadProject(root);
  const claimants = load.documents.filter((doc) => doc.id === wanted);
  if (claimants.length === 0) throw new Error(`no document with id ${wanted}`);

  const contested = claimants.length > 1;
  let moving;
  if (options.file !== undefined) {
    const target = normalizePath(options.file);
    moving = claimants.find((doc) => doc.file === target);
    if (moving === undefined) {
      throw new Error(
        `${options.file} does not hold ${wanted} — it is claimed by:\n${claimants.map((doc) => `  veri/${doc.file}`).join('\n')}`,
      );
    }
  } else if (contested) {
    throw new Error(
      `${wanted} is claimed by ${claimants.length} documents — say which one moves with --file:\n${claimants.map((doc) => `  veri/${doc.file}`).join('\n')}`,
    );
  } else {
    moving = claimants[0];
  }

  if (options.refs !== undefined && options.refs.length > 0 && !contested) {
    throw new Error(`${wanted} is held by one document — every reference is rewritten, --refs applies only to contested ids`);
  }

  const prefix = wanted.split('-')[0] as IdPrefix;
  const to = (
    options.to ?? `${prefix}-${String(nextIdNumber(root, prefix, load.documents.map((doc) => doc.id))).padStart(3, '0')}`
  ).toUpperCase();
  if (!ID_RE.test(to)) throw new Error(`"${options.to}" is not a document id (e.g. DEC-074)`);
  if (to === wanted) throw new Error(`${wanted} → ${to} is not a renumber`);
  if (typeOfId(to) !== typeOfId(wanted)) {
    throw new Error(`cannot renumber across types: ${wanted} is a ${typeOfId(wanted)}, ${to} implies ${typeOfId(to)}`);
  }
  if (load.documents.some((doc) => doc.id === to)) throw new Error(`${to} is already taken`);

  // ---- Compute every write before touching disk. ----

  const movingRaw = readFileSync(join(root, moving.file), 'utf8');
  // The moving file: its id line, plus its own [[self]] references.
  const movingNext = rewriteRefs(movingRaw.replace(new RegExp(`^(id:\\s*)${escapeRe(wanted)}[ \\t]*$`, 'm'), `$1${to}`), wanted, to);

  const oldBase = basename(moving.file);
  const newBase = oldBase.startsWith(`${wanted}-`) ? `${to}-${oldBase.slice(wanted.length + 1)}` : oldBase;
  const renamedTo = join(dirname(moving.file), newBase).split('\\').join('/').replace(/^\.\//, '').replace(/^\.$/, '');
  if (renamedTo !== moving.file && existsSync(join(root, renamedTo))) {
    throw new Error(`cannot rename to veri/${renamedTo} — a file already exists there`);
  }

  const followers = new Set((options.refs ?? []).map(normalizePath));
  const planned: Array<{ file: string; next: string }> = [];
  const remainingRefs: RemainingRef[] = [];
  for (const doc of load.documents) {
    if (doc === moving) continue;
    const raw = readFileSync(join(root, doc.file), 'utf8');
    const refs = referenceLines(raw, wanted);
    if (refs.length === 0) continue;
    if (!contested || followers.has(doc.file)) {
      planned.push({ file: doc.file, next: rewriteRefs(raw, wanted, to) });
    } else {
      // Never rewrite a contested reference by guessing (DEC-070): it keeps
      // resolving to the remaining claimant; the resolver reviews the list.
      remainingRefs.push(...refs.map((ref) => ({ file: doc.file, ...ref })));
    }
  }
  const missingFollowers = [...followers].filter((file) => !load.documents.some((doc) => doc.file === file));
  if (missingFollowers.length > 0) {
    throw new Error(`--refs names files that are not documents here: ${missingFollowers.map((file) => `veri/${file}`).join(', ')}`);
  }

  // The re-parse guard: every planned content must still parse, and the
  // moved document must come out holding its new id.
  const movingOutcome = parseDocument(renamedTo, movingNext);
  if (movingOutcome.document === undefined || movingOutcome.document.id !== to) {
    throw new Error(
      `internal error — the renumber edit would corrupt veri/${moving.file}: ${movingOutcome.issues[0]?.message ?? 'unexpected id'}`,
    );
  }
  for (const plan of planned) {
    const outcome = parseDocument(plan.file, plan.next);
    if (outcome.document === undefined) {
      throw new Error(`internal error — the reference rewrite would corrupt veri/${plan.file}: ${outcome.issues[0]?.message}`);
    }
  }

  // ---- Write phase. ----

  for (const plan of planned) writeFileSync(join(root, plan.file), plan.next);
  if (renamedTo === moving.file) {
    writeFileSync(join(root, moving.file), movingNext);
  } else {
    writeFileSync(join(root, renamedTo), movingNext, { flag: 'wx' });
    unlinkSync(join(root, moving.file));
  }
  // Neither number is ever reissued (DEC-037): the old one stays under the
  // floor it already raised; the new one raises it now.
  recordIssuedId(root, prefix, Number.parseInt(to.slice(prefix.length + 1), 10));

  return {
    from: wanted,
    to,
    file: moving.file,
    renamedTo,
    contested,
    rewrittenFiles: planned.map((plan) => plan.file).sort(),
    remainingRefs,
  };
}
