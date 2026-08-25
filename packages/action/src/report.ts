/** Pure mapping from the CLI's CheckReport to GitHub workflow commands
    (WO-076, REQ-025). All checking lives in @verikb/cli — this module only
    renders its verdict as annotations and decides the exit code. */
import type { CheckReport } from '@verikb/cli';

export interface ActionInputs {
  /** Project root relative to the workspace — the directory containing veri/. */
  path: string;
  /** Escalate the DEC-025 advisory tier to failures. */
  strictAdvisories: boolean;
}

export function readInputs(env: Record<string, string | undefined>): ActionInputs {
  const path = (env['INPUT_PATH'] ?? '').trim();
  return {
    path: path === '' ? '.' : path,
    strictAdvisories: (env['INPUT_STRICT-ADVISORIES'] ?? '').trim().toLowerCase() === 'true',
  };
}

/** Workflow-command data escaping, per GitHub's rules. */
function escData(value: string): string {
  return value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

/** Property values additionally escape `:` and `,` (the command delimiters). */
function escProp(value: string): string {
  return escData(value).replaceAll(':', '%3A').replaceAll(',', '%2C');
}

/** Repo-relative annotation path for a veri/-relative document file. */
function annotationPath(inputPath: string, file: string): string {
  const prefix = inputPath === '.' ? '' : `${inputPath.replace(/\/+$/, '')}/`;
  return `${prefix}veri/${file}`;
}

export interface Verdict {
  /** Workflow-command and log lines, in print order. */
  lines: string[];
  /** Markdown for the job summary. */
  summary: string;
  code: number;
}

export function noProject(inputs: ActionInputs): Verdict {
  const where = inputs.path === '.' ? 'the repository root' : `'${inputs.path}'`;
  const message = `no veri/ directory at ${where} — is the 'path' input pointing at the project root?`;
  return { lines: [`::error title=veri check::${escData(message)}`], summary: `**veri check** — ${message}`, code: 1 };
}

export function render(report: CheckReport, inputs: ActionInputs): Verdict {
  const lines: string[] = [report.formatLine];

  // Gate violations fail the run, one annotation per claiming file — a
  // duplicate-id issue names several, comma-separated (see CheckReport).
  for (const issue of report.issues) {
    for (const file of issue.file.split(', ')) {
      lines.push(`::error file=${escProp(annotationPath(inputs.path, file))},title=veri check::${escData(issue.message)}`);
    }
  }

  // Advisories annotate without blocking (DEC-025), unless escalated below.
  for (const advisory of report.advisories) {
    lines.push(
      `::warning file=${escProp(annotationPath(inputs.path, advisory.file))},title=veri advisory (${escProp(advisory.kind)})::${escData(advisory.message)}`,
    );
  }

  for (const skip of report.skips) {
    const hint = skip.includes('shallow clone')
      ? ' Set fetch-depth: 0 on actions/checkout so receipt verification can run.'
      : '';
    lines.push(`::notice title=veri check::${escData(skip + hint)}`);
  }

  const escalated = inputs.strictAdvisories && report.advisories.length > 0;
  if (escalated) {
    lines.push(
      `::error title=veri check::strict-advisories is set and ${String(report.advisories.length)} advisory(ies) are present — see the warning annotations`,
    );
  }

  const verdict =
    report.issues.length > 0
      ? `${String(report.issues.length)} issue(s)`
      : escalated
        ? 'advisories escalated to failure'
        : 'ok';
  lines.push(`veri check: ${verdict} — ${String(report.documentCount)} documents, ${String(report.advisories.length)} advisories`);

  const summary = [
    `**veri check** — ${verdict}`,
    '',
    `| | count |`,
    `|---|---|`,
    `| documents | ${String(report.documentCount)} |`,
    `| issues | ${String(report.issues.length)} |`,
    `| advisories | ${String(report.advisories.length)} |`,
    ...(report.skips.length > 0 ? ['', ...report.skips.map((skip) => `- ${skip}`)] : []),
  ].join('\n');

  return { lines, summary, code: report.issues.length > 0 || escalated ? 1 : 0 };
}
