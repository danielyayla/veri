/** GitHub Action entry (WO-076, REQ-025): run the CLI's own check derivation
    against the checkout and speak the result as workflow commands. The
    verdict logic is checkReport's alone — this file is inputs and I/O. */
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkReport } from '@veri/cli';
import { noProject, readInputs, render } from './report.ts';

const inputs = readInputs(process.env);
const root = resolve(process.env['GITHUB_WORKSPACE'] ?? process.cwd(), inputs.path);
const report = await checkReport(root);
const verdict = report === null ? noProject(inputs) : render(report, inputs);

for (const line of verdict.lines) console.log(line);

const summaryFile = process.env['GITHUB_STEP_SUMMARY'];
if (summaryFile !== undefined && summaryFile !== '') appendFileSync(summaryFile, verdict.summary + '\n');

const outputFile = process.env['GITHUB_OUTPUT'];
if (outputFile !== undefined && outputFile !== '') {
  appendFileSync(outputFile, `issues=${String(report?.issues.length ?? 0)}\nadvisories=${String(report?.advisories.length ?? 0)}\n`);
}

process.exitCode = verdict.code;
