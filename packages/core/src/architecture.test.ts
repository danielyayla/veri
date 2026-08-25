import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProject } from './load.ts';
import { checkProject } from './check.ts';
import { assembleArchitecture, checkArchitecture, checkObservedArchitecture, moduleRegistry, renderArchitecture } from './architecture.ts';
import type { ImportEdge } from './architecture.ts';

// --- Fixture builders (DEC-058's canonical shapes) ---

const WORKFLOW_WITH_MODULES = `---
id: WF-001
type: workflow
title: W
status: accepted
approved: 2026-08-01
created: 2026-08-01
updated: 2026-08-01
modules:
  - name: core
    path: packages/core
    purpose: Pure domain logic
  - name: ui
    path: packages/ui
    purpose: Desktop app
  - name: cli
    path: packages/cli
    purpose: Terminal surface
---
Rules.
`;

function decision(id: string, status: string, architecture: string): string {
  const superseded = status === 'superseded' ? `superseded_by: DEC-099\n` : '';
  return `---
id: ${id}
type: decision
title: T ${id}
status: ${status}
approved: 2026-08-01
created: 2026-08-01
updated: 2026-08-01
${superseded}${architecture}---
## Choice

Something.
`;
}

function project(t: TestContext, files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-arch-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'decisions'), { recursive: true });
  writeFileSync(join(dir, 'workflow.md'), files['workflow.md'] ?? WORKFLOW_WITH_MODULES);
  for (const [file, content] of Object.entries(files)) {
    if (file !== 'workflow.md') writeFileSync(join(dir, file), content);
  }
  return dir;
}

const WELL_FORMED = `architecture:
  constraints:
    - from: core
      to: [ui, cli]
      allowed: false
`;

// --- Schema: well-formed passes, malformed is an issue naming the file ---

test('a well-formed architecture block referencing known modules passes check', async (t) => {
  const dir = project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'active', WELL_FORMED) });
  const load = await loadProject(dir);
  assert.deepEqual(checkProject(load).issues, []);
  const { rules } = assembleArchitecture(load.documents);
  assert.deepEqual(rules, [
    { from: 'core', to: 'ui', allowed: false, decisionId: 'DEC-001' },
    { from: 'core', to: 'cli', allowed: false, decisionId: 'DEC-001' },
  ]);
});

const MALFORMED: Array<[string, string]> = [
  ['missing allowed', 'architecture:\n  constraints:\n    - from: core\n      to: ui\n'],
  ['wrong shape', 'architecture:\n  constraints: not-a-list\n'],
  ['non-string non-list to', 'architecture:\n  constraints:\n    - from: core\n      to: 5\n      allowed: false\n'],
  ['empty to list', 'architecture:\n  constraints:\n    - from: core\n      to: []\n      allowed: false\n'],
];

for (const [label, block] of MALFORMED) {
  test(`a malformed architecture block (${label}) is a check issue naming the document`, async (t) => {
    const dir = project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'active', block) });
    const load = await loadProject(dir);
    const issues = checkProject(load).issues;
    assert.ok(issues.length > 0, 'expected at least one issue');
    assert.ok(
      issues.every(
        (issue) => issue.kind === 'invalid-frontmatter' && issue.file === 'decisions/DEC-001-arch.md',
      ),
      JSON.stringify(issues, null, 2),
    );
  });
}

// --- Registry resolution: the typo case ---

test('a constraint naming a module absent from the registry is a check issue', async (t) => {
  const block = 'architecture:\n  constraints:\n    - from: core\n      to: electron\n      allowed: false\n';
  const dir = project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'active', block) });
  const load = await loadProject(dir);
  const issues = checkProject(load).issues;
  assert.partialDeepStrictEqual(issues, [
    { kind: 'arch-unknown-module', id: 'DEC-001', module: 'electron', file: 'decisions/DEC-001-arch.md' },
  ]);
  assert.match(issues[0].message, /known modules: core, ui, cli/);
});

test('an empty registry makes every constraint an issue, with the declare-modules hint', async (t) => {
  const noModules = WORKFLOW_WITH_MODULES.replace(/modules:[\s\S]*?---/, '---');
  const dir = project(t, {
    'workflow.md': noModules,
    'decisions/DEC-001-arch.md': decision('DEC-001', 'proposed', WELL_FORMED),
  });
  const load = await loadProject(dir);
  const issues = checkArchitecture(load.documents);
  assert.equal(issues.length, 3); // core, ui, cli all unknown
  assert.match(issues[0].message, /no modules are declared/);
});

test('a superseded decision with a stale module name is history, not an issue', async (t) => {
  const block = 'architecture:\n  constraints:\n    - from: gone\n      to: core\n      allowed: false\n';
  const dir = project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'superseded', block) });
  const load = await loadProject(dir);
  // DEC-099 doesn't exist → broken-link fires, but no arch issue.
  assert.deepEqual(checkArchitecture(load.documents), []);
});

// --- Projection: active only, DEC ids, statuses, determinism ---

test('proposed decisions contribute nothing; superseding retires rules with no other edit', async (t) => {
  const files = (status: string): Record<string, string> => ({
    'decisions/DEC-001-arch.md': decision('DEC-001', status, WELL_FORMED),
  });
  const active = await loadProject(project(t, files('active')));
  assert.equal(assembleArchitecture(active.documents).rules.length, 2);

  const proposed = await loadProject(project(t, files('proposed')));
  assert.deepEqual(assembleArchitecture(proposed.documents).rules, []);
  assert.ok(!renderArchitecture(proposed.documents).includes('DEC-001'));

  const superseded = await loadProject(project(t, files('superseded')));
  assert.deepEqual(assembleArchitecture(superseded.documents).rules, []);
});

test('the registry lists workflow modules in declaration order', async (t) => {
  const load = await loadProject(project(t, {}));
  assert.deepEqual(
    moduleRegistry(load.documents).map((entry) => entry.name),
    ['core', 'ui', 'cli'],
  );
});

test('the printout lists modules with purposes and every constraint with its DEC id', async (t) => {
  const dir = project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'active', WELL_FORMED) });
  const load = await loadProject(dir);
  const text = renderArchitecture(load.documents);
  assert.match(text, /core\s+packages\/core\s+Pure domain logic/);
  assert.match(text, /core → ui\s+forbidden\s+\(DEC-001\)/);
  assert.match(text, /core → cli\s+forbidden\s+\(DEC-001\)/);
});

test('projection output is byte-identical across repeated runs on the same files', async (t) => {
  const dir = project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'active', WELL_FORMED) });
  const first = renderArchitecture((await loadProject(dir)).documents);
  const second = renderArchitecture((await loadProject(dir)).documents);
  assert.equal(first, second);
});

// --- Conflicts ---

test('two active decisions asserting opposite allowed for one edge conflict in check and printout', async (t) => {
  const allow = 'architecture:\n  constraints:\n    - from: ui\n      to: core\n      allowed: true\n';
  const forbid = 'architecture:\n  constraints:\n    - from: ui\n      to: core\n      allowed: false\n';
  const dir = project(t, {
    'decisions/DEC-001-allow.md': decision('DEC-001', 'active', allow),
    'decisions/DEC-002-forbid.md': decision('DEC-002', 'active', forbid),
  });
  const load = await loadProject(dir);
  const issues = checkProject(load).issues;
  assert.partialDeepStrictEqual(issues, [
    {
      kind: 'arch-conflict',
      from: 'ui',
      to: 'core',
      allowedBy: ['DEC-001'],
      forbiddenBy: ['DEC-002'],
      file: 'decisions/DEC-002-forbid.md',
    },
  ]);
  const text = renderArchitecture(load.documents);
  assert.match(text, /Conflicts/);
  assert.match(text, /ui → core: allowed by DEC-001 but forbidden by DEC-002/);
});

// --- Observed architecture (WO-067): pure comparison over fixture edges ---

const OBSERVED_CORE_UI: ImportEdge[] = [
  { from: 'core', to: 'ui', file: 'packages/core/src/render.ts', specifier: '@x/ui' },
];

test('an observed edge a decision forbids is a violation citing file, specifier, and DEC id', async (t) => {
  const dir = project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'active', WELL_FORMED) });
  const load = await loadProject(dir);
  const { issues, violations } = checkObservedArchitecture(load.documents, OBSERVED_CORE_UI);
  assert.deepEqual(issues, []);
  assert.partialDeepStrictEqual(violations, [
    {
      kind: 'arch-violation',
      file: 'packages/core/src/render.ts',
      id: 'DEC-001',
      from: 'core',
      to: 'ui',
      specifier: '@x/ui',
      forbiddenBy: ['DEC-001'],
    },
  ]);
  assert.match(violations[0].message, /imports "@x\/ui"/);
  assert.match(violations[0].message, /forbidden by DEC-001/);
});

test('allowed and unconstrained observed edges produce no findings', async (t) => {
  const allow = 'architecture:\n  constraints:\n    - from: ui\n      to: core\n      allowed: true\n';
  const dir = project(t, { 'decisions/DEC-001-allow.md': decision('DEC-001', 'active', allow) });
  const load = await loadProject(dir);
  const edges: ImportEdge[] = [
    { from: 'ui', to: 'core', file: 'packages/ui/src/app.ts', specifier: '@x/core' }, // allowed
    { from: 'cli', to: 'core', file: 'packages/cli/src/run.ts', specifier: '@x/core' }, // unconstrained
  ];
  assert.deepEqual(checkObservedArchitecture(load.documents, edges), { issues: [], violations: [] });
});

test('a proposed decision forbidding an edge fires no violation until approved', async (t) => {
  const dir = project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'proposed', WELL_FORMED) });
  const load = await loadProject(dir);
  assert.deepEqual(checkObservedArchitecture(load.documents, OBSERVED_CORE_UI), { issues: [], violations: [] });
});

test('a conflicted edge is an issue, not a violation — silent until one decision is retired', async (t) => {
  const allow = 'architecture:\n  constraints:\n    - from: core\n      to: ui\n      allowed: true\n';
  const forbid = 'architecture:\n  constraints:\n    - from: core\n      to: ui\n      allowed: false\n';
  const dir = project(t, {
    'decisions/DEC-001-allow.md': decision('DEC-001', 'active', allow),
    'decisions/DEC-002-forbid.md': decision('DEC-002', 'active', forbid),
  });
  const load = await loadProject(dir);
  assert.equal(checkArchitecture(load.documents).length, 1); // the arch-conflict issue owns this edge
  assert.deepEqual(checkObservedArchitecture(load.documents, OBSERVED_CORE_UI), { issues: [], violations: [] });
});

test('the printout gains a violations section only when observed facts are supplied', async (t) => {
  const dir = project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'active', WELL_FORMED) });
  const load = await loadProject(dir);
  const base = renderArchitecture(load.documents);
  assert.ok(!base.includes('Violations'));
  const withViolation = renderArchitecture(load.documents, OBSERVED_CORE_UI);
  assert.ok(withViolation.startsWith(base)); // the WO-066 printout is byte-identical up front
  assert.match(withViolation, /Violations — observed imports vs the intended architecture/);
  assert.match(withViolation, /core → ui\s+packages\/core\/src\/render\.ts imports "@x\/ui"\s+\(forbidden by DEC-001\)/);
  const clean = renderArchitecture(load.documents, []);
  assert.match(clean, /\(none — observed imports respect every active constraint\)/);
});

// --- Constraint severity (DEC-062, WO-069) ---

const ERROR_SEVERITY = `architecture:
  constraints:
    - from: core
      to: [ui, cli]
      allowed: false
      severity: error
`;

test('severity compiles into the projection; rules without the field carry no severity key', async (t) => {
  const dir = project(t, {
    'decisions/DEC-001-hard.md': decision('DEC-001', 'active', ERROR_SEVERITY),
    'decisions/DEC-002-soft.md': decision('DEC-002', 'active', 'architecture:\n  constraints:\n    - from: ui\n      to: core\n      allowed: true\n'),
  });
  const load = await loadProject(dir);
  assert.deepEqual(checkProject(load).issues, []);
  assert.deepEqual(assembleArchitecture(load.documents).rules, [
    { from: 'core', to: 'ui', allowed: false, decisionId: 'DEC-001', severity: 'error' },
    { from: 'core', to: 'cli', allowed: false, decisionId: 'DEC-001', severity: 'error' },
    { from: 'ui', to: 'core', allowed: true, decisionId: 'DEC-002' },
  ]);
});

test('an observed edge forbidden at severity error is a check issue naming file, specifier, and DEC', async (t) => {
  const dir = project(t, { 'decisions/DEC-001-hard.md': decision('DEC-001', 'active', ERROR_SEVERITY) });
  const load = await loadProject(dir);
  const { issues, violations } = checkObservedArchitecture(load.documents, OBSERVED_CORE_UI);
  assert.deepEqual(violations, []);
  assert.partialDeepStrictEqual(issues, [
    {
      kind: 'arch-violation',
      file: 'packages/core/src/render.ts',
      id: 'DEC-001',
      from: 'core',
      to: 'ui',
      specifier: '@x/ui',
      forbiddenBy: ['DEC-001'],
    },
  ]);
  assert.match(issues[0].message, /imports "@x\/ui"/);
  assert.match(issues[0].message, /forbidden by DEC-001/);
  assert.match(issues[0].message, /severity: error/);
});

test('an explicit severity: advisory behaves exactly like the absent default (WO-067 byte-identical)', async (t) => {
  const explicit = WELL_FORMED.replace('allowed: false\n', 'allowed: false\n      severity: advisory\n');
  const explicitLoad = await loadProject(
    project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'active', explicit) }),
  );
  const defaulted = await loadProject(
    project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'active', WELL_FORMED) }),
  );
  const explicitFindings = checkObservedArchitecture(explicitLoad.documents, OBSERVED_CORE_UI);
  const defaultFindings = checkObservedArchitecture(defaulted.documents, OBSERVED_CORE_UI);
  assert.deepEqual(explicitFindings.issues, []);
  assert.deepEqual(explicitFindings.violations, defaultFindings.violations);
  assert.equal(
    defaultFindings.violations[0].message,
    'imports "@x/ui" — the core → ui edge is forbidden by DEC-001',
  );
});

test('an invalid severity value is an invalid-frontmatter issue naming the document', async (t) => {
  const bad = WELL_FORMED.replace('allowed: false\n', 'allowed: false\n      severity: blocking\n');
  const dir = project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'active', bad) });
  const load = await loadProject(dir);
  const issues = checkProject(load).issues;
  assert.ok(issues.length > 0, 'expected an issue');
  assert.ok(
    issues.every((issue) => issue.kind === 'invalid-frontmatter' && issue.file === 'decisions/DEC-001-arch.md'),
    JSON.stringify(issues, null, 2),
  );
});

test('a conflicted edge produces no violation at either severity — the conflict issue stands alone', async (t) => {
  const allow = 'architecture:\n  constraints:\n    - from: core\n      to: ui\n      allowed: true\n';
  for (const forbid of [WELL_FORMED, ERROR_SEVERITY]) {
    const dir = project(t, {
      'decisions/DEC-001-allow.md': decision('DEC-001', 'active', allow),
      'decisions/DEC-002-forbid.md': decision('DEC-002', 'active', forbid),
    });
    const load = await loadProject(dir);
    assert.equal(checkArchitecture(load.documents).length, 1); // arch-conflict owns the edge
    assert.deepEqual(checkObservedArchitecture(load.documents, OBSERVED_CORE_UI), { issues: [], violations: [] });
  }
});

test('a multiply-forbidden edge with mixed severities reports once, as an issue (DEC-086)', async (t) => {
  const soft = 'architecture:\n  constraints:\n    - from: core\n      to: ui\n      allowed: false\n';
  const hard = 'architecture:\n  constraints:\n    - from: core\n      to: ui\n      allowed: false\n      severity: error\n';
  const dir = project(t, {
    'decisions/DEC-001-soft.md': decision('DEC-001', 'active', soft),
    'decisions/DEC-002-hard.md': decision('DEC-002', 'active', hard),
  });
  const load = await loadProject(dir);
  const { issues, violations } = checkObservedArchitecture(load.documents, OBSERVED_CORE_UI);
  assert.deepEqual(violations, []);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].id, 'DEC-001'); // still anchored on the oldest forbidding decision (DEC-061)
  assert.deepEqual(issues[0].forbiddenBy, ['DEC-001', 'DEC-002']);
});

test('the printout gains a severity column only when a rule declares one, and splits violations by tier', async (t) => {
  // Severity-free corpus: no column — the WO-066/067 printout byte-for-byte.
  const plain = await loadProject(
    project(t, { 'decisions/DEC-001-arch.md': decision('DEC-001', 'active', WELL_FORMED) }),
  );
  assert.ok(!renderArchitecture(plain.documents).includes('advisory'));

  const dir = project(t, {
    'decisions/DEC-001-hard.md': decision('DEC-001', 'active', ERROR_SEVERITY),
    'decisions/DEC-002-soft.md': decision('DEC-002', 'active', 'architecture:\n  constraints:\n    - from: cli\n      to: core\n      allowed: false\n'),
  });
  const load = await loadProject(dir);
  const text = renderArchitecture(load.documents, [
    ...OBSERVED_CORE_UI,
    { from: 'cli', to: 'core', file: 'packages/cli/src/run.ts', specifier: '@x/core' },
  ]);
  // Severity column: declared value, or the advisory default.
  assert.match(text, /core → ui\s+forbidden\s+error\s+\(DEC-001\)/);
  assert.match(text, /cli → core\s+forbidden\s+advisory\s+\(DEC-002\)/);
  // Error violations take the issues position, ahead of the violations section.
  assert.match(text, /Issues — error-severity violations \(these fail veri check\)/);
  assert.ok(
    text.indexOf('Issues — error-severity violations') < text.indexOf('Violations — observed imports'),
    text,
  );
  assert.match(text, /core → ui\s+packages\/core\/src\/render\.ts imports "@x\/ui"\s+\(forbidden by DEC-001\)/);
  assert.match(text, /cli → core\s+packages\/cli\/src\/run\.ts imports "@x\/core"\s+\(forbidden by DEC-002\)/);
  // Deterministic across runs.
  assert.equal(
    text,
    renderArchitecture((await loadProject(dir)).documents, [
      ...OBSERVED_CORE_UI,
      { from: 'cli', to: 'core', file: 'packages/cli/src/run.ts', specifier: '@x/core' },
    ]),
  );

  // Only error violations observed: the violations section says so honestly.
  const onlyError = renderArchitecture(load.documents, OBSERVED_CORE_UI);
  assert.match(onlyError, /\(none at advisory severity\)/);
  assert.ok(!onlyError.includes('(none — observed imports respect every active constraint)'));
});

test('agreeing decisions on the same edge are not a conflict', async (t) => {
  const forbid = 'architecture:\n  constraints:\n    - from: ui\n      to: core\n      allowed: false\n';
  const dir = project(t, {
    'decisions/DEC-001-a.md': decision('DEC-001', 'active', forbid),
    'decisions/DEC-002-b.md': decision('DEC-002', 'active', forbid),
  });
  const load = await loadProject(dir);
  assert.deepEqual(checkProject(load).issues, []);
  assert.ok(!renderArchitecture(load.documents).includes('Conflicts'));
});

// ---- Registry responsibilities (WO-068, DEC-089 proposed) -----------------

test('a registry entry may declare responsibilities; the list rides moduleRegistry typed', async (t) => {
  const workflow = `---
id: WF-001
type: workflow
title: W
status: accepted
approved: 2026-08-01
created: 2026-08-01
updated: 2026-08-01
modules:
  - name: core
    path: packages/core
    purpose: Pure domain logic
    responsibilities:
      - Owns every business rule
      - Pure functions only
---
Rules.
`;
  const dir = project(t, { 'workflow.md': workflow });
  const load = await loadProject(dir);
  assert.deepEqual(load.issues, []);
  assert.deepEqual(moduleRegistry(load.documents)[0].responsibilities, [
    'Owns every business rule',
    'Pure functions only',
  ]);
});

test('a malformed responsibilities list is an invalid-frontmatter issue, never a silent no-op', async (t) => {
  const workflow = `---
id: WF-001
type: workflow
title: W
status: accepted
approved: 2026-08-01
created: 2026-08-01
updated: 2026-08-01
modules:
  - name: core
    path: packages/core
    purpose: Pure domain logic
    responsibilities: everything
---
Rules.
`;
  const dir = project(t, { 'workflow.md': workflow });
  const load = await loadProject(dir);
  assert.equal(load.issues.length, 1);
  assert.equal(load.issues[0].kind, 'invalid-frontmatter');
  assert.match(load.issues[0].message, /responsibilities/);
});
