import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProject } from './load.ts';
import { checkProject } from './check.ts';

test("this repository's own veri/ directory yields zero issues", async () => {
  const load = await loadProject(new URL('../../../veri', import.meta.url));
  assert.ok(load.documents.length >= 11, `expected the full knowledge base, got ${load.documents.length} documents`);
  const { issues, advisories } = checkProject(load);
  assert.deepEqual(issues, []);
  // WO-025: this repo also holds itself to its own templates. Epistemic
  // open-loop advisories are exempt: an untested bet (REQ-033), a stale
  // focus (REQ-037), or an unkinded outcome source (REQ-038, WO-154) is
  // designed to persist until the user judges evidence — a live project
  // legitimately carries them, and only the user closes them (kind backfill
  // on existing sources is PRD-004's evidence-backfill thread).
  const OPEN_LOOP_KINDS = new Set(['untested-bet', 'stale-focus', 'intuition-only', 'outcome-unkinded']);
  assert.deepEqual(advisories.filter((advisory) => !OPEN_LOOP_KINDS.has(advisory.kind)), []);
});
