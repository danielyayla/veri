import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AMENDMENTS_DIR,
  METHODS_DIR,
  SKILL_EMITTERS,
  checkCorpusIntegrity,
  checkTriggerCorpus,
  claudeCodeEmitter,
  judgeInputFor,
  loadProject,
  methodTriggerLineup,
  parseDocument,
  parseJudgeAnswer,
  parseTriggerCorpus,
  planMethodUpgrade,
  planSkillInstall,
  scoreTriggerEval,
  shippedMethodFrom,
} from '@verikb/core';
import type { CollectedShell, JudgeAnswer, ShellFactsInput, ShippedMethod, SkillEmitter, TriggerCorpus, TriggerSkill } from '@verikb/core';
import type { CmdResult } from './commands.ts';

/**
 * `veri skills install` and `veri skills upgrade` (REQ-040, DEC-125, WO-135):
 * the host half of the shell emitter.
 *
 * Every derivation is core's — which shells should exist, what belongs in
 * them, which shipped methods differ from the project's copies, and what a
 * proposal says. This module is the adapter: it reads the harness directory
 * and the shipped library off disk, asks before it writes, and writes what
 * the plan named. The split is DEC-040's, the same one the provenance
 * advisories already use — a pure emitter in core, the filesystem here,
 * because `.claude/skills/` is outside `veri/` and core does not reach there.
 */

/** How the command asks. `undefined` means it cannot ask — a non-interactive
    session — and the command defers instead of guessing (DEC-125: installing
    is a statement of interest, not consent to restructure a repository). */
export type Confirm = (question: string) => Promise<boolean>;

/**
 * Veri's shipped method library: the same nine method documents this
 * repository authors under `veri/methods/`, packaged beside the demo and the
 * starter bundles (DEC-007, WO-091) so `upgrade` has something to compare
 * against in an installed CLI. `methods-shipped.test.ts` holds the copy to
 * the authored originals byte for byte.
 */
export const SHIPPED_METHODS_ROOT = fileURLToPath(new URL('../methods/', import.meta.url));

/** Read the shipped library. A malformed shipped file is a build error, not a
    value to carry half-valid — the same posture the trigger corpus takes. */
export function loadShippedMethods(root: string = SHIPPED_METHODS_ROOT): ShippedMethod[] {
  if (!existsSync(root)) return [];
  const files = readdirSync(root)
    .filter((name) => name.endsWith('.md'))
    .sort();
  return files.map((name) => {
    const outcome = parseDocument(`${METHODS_DIR}/${name}`, readFileSync(join(root, name), 'utf8'));
    if (outcome.document === undefined) {
      throw new Error(`shipped method ${name} does not parse: ${outcome.issues.map((issue) => issue.message).join('; ')}`);
    }
    return shippedMethodFrom(outcome.document);
  });
}

/** Every file under the emitter's directory that the emitter could have
    written, repo-root-relative with forward slashes. */
export function collectShells(root: string, emitter: SkillEmitter): CollectedShell[] {
  const base = join(root, ...emitter.directory.split('/'));
  if (!existsSync(base)) return [];
  const found: CollectedShell[] = [];
  const walk = (dir: string, depth: number): void => {
    if (depth > 4) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      const rel = relative(root, full).replaceAll('\\', '/');
      if (!emitter.owns(rel)) continue;
      found.push({ path: rel, content: readFileSync(full, 'utf8') });
    }
  };
  walk(base, 0);
  return found.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/**
 * The shell-facts collector `veri check` feeds core's drift comparator
 * (WO-136), on the `collectGitFacts` pattern (DEC-040): the host reads, core
 * judges. Unavailability is a state, never an error — an unknown harness
 * name is reported so the tier degrades loudly (REQ-021).
 *
 * A missing harness directory is not unavailability: it is the fact that no
 * shell was ever installed, which `collectShells` returns as an empty list
 * and which both rules answer with silence. A project that never ran
 * `veri skills install` has no drift and is never nagged about it.
 */
export function collectShellFacts(cwd: string, harness?: string): ShellFactsInput {
  const emitter = resolveEmitter(harness);
  if (typeof emitter === 'string') return { kind: 'unavailable', reason: emitter };
  return { kind: 'ok', harness: emitter.harness, shells: collectShells(cwd, emitter) };
}

function resolveEmitter(harness: string | undefined): SkillEmitter | string {
  if (harness === undefined) return claudeCodeEmitter;
  const emitter = SKILL_EMITTERS[harness];
  if (emitter !== undefined) return emitter;
  return `unknown harness "${harness}" — this build emits for: ${Object.keys(SKILL_EMITTERS).sort().join(', ')}`;
}

/** The refusal a bare repository gets. Scaffolding is `veri init`'s job (and
    the `init` tool WO-129 landed for agents); nothing here creates a
    knowledge base as a side effect of asking for skills. */
const NO_VERI_DIR: CmdResult = {
  code: 1,
  lines: [
    'no veri/ directory here — nothing was written.',
    'Skills point at method documents, so there has to be a knowledge base to point at: run "veri init" first (agents have the init tool over MCP), then run this again.',
  ],
};

/** The one place a write is gated. Returns whether to proceed, plus the lines
    to print when it is not. */
async function decide(opts: { yes?: boolean }, confirm: Confirm | undefined, question: string): Promise<{ go: boolean; lines: string[] }> {
  if (opts.yes === true) return { go: true, lines: [] };
  if (confirm !== undefined) {
    const answer = await confirm(question);
    return answer ? { go: true, lines: [] } : { go: false, lines: ['Nothing was written.'] };
  }
  return { go: false, lines: ['Nothing was written. Re-run with --yes to apply.'] };
}

export interface SkillsInstallOptions {
  yes?: boolean;
  all?: boolean;
  harness?: string;
}

/**
 * Write one shell per accepted method into the harness directory.
 *
 * Idempotent by construction: the plan compares what is on disk against what
 * each method emits now, so a second run over an unchanged project has an
 * empty plan and says so without touching a file.
 */
export async function skillsInstall(cwd: string, opts: SkillsInstallOptions = {}, confirm?: Confirm): Promise<CmdResult> {
  const veriDir = join(cwd, 'veri');
  if (!existsSync(veriDir)) return NO_VERI_DIR;

  const emitter = resolveEmitter(opts.harness);
  if (typeof emitter === 'string') return { code: 1, lines: [emitter] };

  const load = await loadProject(veriDir);
  const plan = planSkillInstall(load.documents, collectShells(cwd, emitter), { emitter, all: opts.all });

  const lines: string[] = [];
  for (const shell of plan.write) lines.push(`write   ${shell.path} — ${shell.methodId}`);
  for (const stale of plan.remove) lines.push(`remove  ${stale.path} — ${stale.reason}`);
  for (const shell of plan.unchanged) lines.push(`current ${shell.path} — ${shell.methodId}`);
  for (const skip of plan.skipped) lines.push(`skip    ${skip.id} — ${skip.reason}`);

  if (plan.noop) {
    lines.push(
      plan.unchanged.length === 0
        ? `Nothing to install — this project has no accepted method to point at, so no shell belongs in ${plan.directory} (DEC-130).`
        : `Nothing to do — all ${plan.unchanged.length} shell${plan.unchanged.length === 1 ? '' : 's'} in ${plan.directory} already match their methods. No file was written.`,
    );
    return { code: 0, lines };
  }

  const verdict = await decide(
    opts,
    confirm,
    `Write ${plan.write.length} and remove ${plan.remove.length} file(s) under ${plan.directory}?`,
  );
  if (!verdict.go) return { code: 0, lines: [...lines, ...verdict.lines] };

  for (const shell of plan.write) {
    const full = join(cwd, ...shell.path.split('/'));
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, shell.content, 'utf8');
  }
  for (const stale of plan.remove) {
    const full = join(cwd, ...stale.path.split('/'));
    rmSync(full, { force: true });
    // The skill's own directory goes with it when nothing else is in it; the
    // harness directory itself is never removed, it is not ours to delete.
    const dir = dirname(full);
    if (existsSync(dir) && statSync(dir).isDirectory() && readdirSync(dir).length === 0) rmSync(dir, { recursive: true });
  }

  lines.push(
    `Installed ${plan.write.length} shell${plan.write.length === 1 ? '' : 's'} into ${plan.directory}` +
      (plan.remove.length === 0 ? '.' : `, removed ${plan.remove.length}.`),
    'Each is a pointer, not the method: the coaching stays in veri/methods/, where it is versioned, linkable, and yours to amend (DEC-018, DEC-125).',
  );
  return { code: 0, lines };
}

export interface SkillsUpgradeOptions {
  yes?: boolean;
  /** Override the shipped library — the seam the tests use. */
  from?: string;
}

/**
 * Propose the shipped method text where a project's copy has diverged.
 *
 * Never an overwrite, and never a write into `veri/methods/`: an accepted
 * method is the user's, and drift from what Veri ships is permitted and
 * visible rather than silent and inevitable (DEC-125). Matching is on
 * `upstream:` alone, so a project-authored method — one with no `upstream:` —
 * is left completely alone even when its title matches a shipped method.
 */
export async function skillsUpgrade(cwd: string, opts: SkillsUpgradeOptions = {}, confirm?: Confirm): Promise<CmdResult> {
  const veriDir = join(cwd, 'veri');
  if (!existsSync(veriDir)) return NO_VERI_DIR;

  const shipped = loadShippedMethods(opts.from);
  if (shipped.length === 0) {
    return { code: 1, lines: ['this build of Veri ships no method library — nothing to compare against, and nothing was written.'] };
  }

  const load = await loadProject(veriDir);
  const plan = planMethodUpgrade(load.documents, shipped);

  const lines: string[] = [];
  for (const amendment of plan.amendments) {
    lines.push(`propose veri/${amendment.file} — ${amendment.id} differs from ${amendment.upstream} in: ${amendment.changed.join(', ')}`);
  }
  for (const id of plan.upToDate) lines.push(`current ${id} — matches what this build ships`);
  for (const id of plan.own) lines.push(`own     ${id} — no upstream:, so it is this project's own method and is never touched (DEC-130)`);
  for (const miss of plan.unmatched) lines.push(`unknown ${miss.id} — upstream ${miss.upstream} names nothing this build ships`);
  for (const slug of plan.absent) lines.push(`absent  ${slug} — shipped, but this project has no method for it; installing new gates is not this command's job`);

  if (plan.noop) {
    lines.push('Nothing to propose — every method matched to a shipped one is already current. No file was written.');
    return { code: 0, lines };
  }

  const verdict = await decide(opts, confirm, `Write ${plan.amendments.length} proposal(s) under veri/${AMENDMENTS_DIR}/?`);
  if (!verdict.go) return { code: 0, lines: [...lines, ...verdict.lines] };

  for (const amendment of plan.amendments) {
    const full = join(veriDir, ...amendment.file.split('/'));
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, amendment.content, 'utf8');
  }

  lines.push(
    `Wrote ${plan.amendments.length} proposal${plan.amendments.length === 1 ? '' : 's'} to veri/${AMENDMENTS_DIR}/. No method document was changed.`,
    'Read each one, apply what you want by editing the method yourself, then delete it. Declining is a legitimate answer — a project that has tuned a gate keeps its tuning.',
  );
  return { code: 0, lines };
}

// --- The trigger corpus's runner (WO-147, DEC-129) ----------------------------

/** Where the corpus lives, cwd-relative — DEC-134's choice, now shared by the
    schema test and this runner. */
export const CORPUS_FILE = 'skills/trigger-corpus.yaml';

export interface SkillsEvalOptions {
  /** The user's judge command, run through the shell once per case. The
      product ships no judge and makes no network call (WO-147's v1
      constraint holds); grading is whatever command the user supplies. */
  judge?: string;
  /** Per-case timeout — a hung judge is a judge error, never a hung run. */
  timeoutMs?: number;
}

/**
 * `veri skills eval`: DEC-129's pre-ship triggering floor, mechanical.
 *
 * Always: parse the corpus, hold its invariants, and hold referential
 * integrity — every declared skill, near-miss pair, and case expectation must
 * name a skill whose method document exists. Any of that failing is a hard
 * failure and nothing gets judged; a corpus graded against phantom skills
 * would report noise as signal.
 *
 * With `--judge`: play every case's utterance against the trigger lineup —
 * the `veri:<slug>` ids and descriptions of the project's method documents,
 * the same descriptions the shell emitter installs — through the judge
 * command, and report per-case pass/fail plus the negative set's
 * false-trigger count. The floor is the committed corpus itself: every case
 * keeps passing, and zero false triggers is its hardest subset. There is no
 * percentage and no side file of tolerated failures (DEC-129).
 */
export async function skillsEval(cwd: string, opts: SkillsEvalOptions = {}): Promise<CmdResult> {
  const veriDir = join(cwd, 'veri');
  if (!existsSync(veriDir)) {
    return { code: 1, lines: ['no veri/ directory here — the corpus grades the trigger descriptions of method documents under veri/methods/, and there are none to grade against.'] };
  }
  const corpusPath = join(cwd, ...CORPUS_FILE.split('/'));
  if (!existsSync(corpusPath)) {
    return { code: 1, lines: [`no trigger corpus at ${CORPUS_FILE} — nothing to validate (DEC-134 fixes the corpus's home there).`] };
  }

  let corpus: TriggerCorpus;
  try {
    corpus = parseTriggerCorpus(readFileSync(corpusPath, 'utf8'));
  } catch (err) {
    return { code: 1, lines: [(err as Error).message] };
  }

  const load = await loadProject(veriDir);
  const lineup = methodTriggerLineup(load.documents);
  const problems = [...checkTriggerCorpus(corpus), ...checkCorpusIntegrity(corpus, lineup.map((skill) => skill.id))];

  const lines: string[] = [];
  if (problems.length > 0) {
    for (const problem of problems) lines.push(`issue   ${problem}`);
    lines.push(
      `${CORPUS_FILE} fails validation: ${problems.length} problem${problems.length === 1 ? '' : 's'}. A corpus entry naming a skill with no method document is a hard failure (WO-147); nothing was judged.`,
    );
    return { code: 1, lines };
  }
  lines.push(
    `${CORPUS_FILE} validates clean: ${corpus.cases.length} cases over ${corpus.skills.length} skills, every entry backed by a method document.`,
  );

  if (opts.judge === undefined) {
    lines.push(
      'No judge supplied, so no utterance was played — integrity only. Pass --judge <command> for the judged run:',
      'per case, the command receives {"utterance", "skills": [{"id", "description"}, …]} as JSON on stdin and answers with the id of the one skill that should fire, or `none`; the verdict is the last non-empty line of its stdout.',
    );
    return { code: 0, lines };
  }

  const answers = new Map<string, JudgeAnswer>();
  for (const entry of corpus.cases) {
    answers.set(entry.id, runJudge(opts.judge, lineup, entry.utterance, opts.timeoutMs ?? 120_000));
  }
  const report = scoreTriggerEval(corpus, answers);

  for (const result of report.results) {
    if (result.error !== undefined) lines.push(`error   ${result.id} — ${result.error}`);
    else if (result.falseTrigger) lines.push(`FALSE   ${result.id} — expected nothing, the judge fired ${result.answer}: "${result.utterance}"`);
    else if (result.pass) lines.push(`pass    ${result.id} → ${result.answer}`);
    else lines.push(`fail    ${result.id} — expected ${result.expect}, the judge said ${result.answer}: "${result.utterance}"`);
  }
  lines.push(
    `${report.passed}/${report.results.length} cases pass; negative set: ${report.falseTriggers} false trigger${report.falseTriggers === 1 ? '' : 's'} across ${report.negatives} cases` +
      (report.errors > 0 ? `; ${report.errors} judge error${report.errors === 1 ? '' : 's'}` : '') +
      '.',
    report.ok
      ? "DEC-129's floor holds: no regression against the committed corpus, zero false triggers on the negative set."
      : "DEC-129's floor is broken: every committed case must keep passing, and a false trigger is the failure that gets a library uninstalled.",
  );
  return { code: report.ok ? 0 : 1, lines };
}

/** One judge invocation. The command is the user's, run through the shell so
    "node scripts/judge.mjs" and friends work as typed; everything it is told
    goes through `judgeInputFor`, so the contract has one statement. */
function runJudge(command: string, lineup: TriggerSkill[], utterance: string, timeoutMs: number): JudgeAnswer {
  const run = spawnSync(command, {
    shell: true,
    input: judgeInputFor(lineup, utterance),
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (run.error !== undefined) return { error: `the judge did not run: ${run.error.message}` };
  if (run.status !== 0) {
    const stderr = (run.stderr ?? '').trim().split('\n', 1)[0] ?? '';
    return { error: `the judge exited ${run.status ?? `on signal ${run.signal ?? 'unknown'}`}${stderr === '' ? '' : ` — ${stderr}`}` };
  }
  return parseJudgeAnswer(run.stdout ?? '', lineup);
}

/** The terminal's answer to a write question. Supplied by `cli.ts` only when
    both streams are a TTY: with no human on the other end there is nobody to
    ask, and the command defers to `--yes` instead. */
export async function askTerminal(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}
