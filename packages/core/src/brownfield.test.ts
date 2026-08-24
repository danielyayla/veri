import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assembleImportInstructions, importKickoffPrompt, isBrownfieldRoot, isUnpopulated } from './brownfield.ts';
import type { VeriDocument } from './types.ts';

function tmpRoot(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-brownfield-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function doc(partial: Partial<VeriDocument> & { id: string; type: VeriDocument['type'] }): VeriDocument {
  return {
    title: partial.id,
    status: 'draft',
    created: '2026-08-24',
    updated: '2026-08-24',
    links: [],
    file: `x/${partial.id}.md`,
    body: '',
    ...partial,
  } as VeriDocument;
}

test('importKickoffPrompt points at the MCP instruction package', () => {
  const prompt = importKickoffPrompt();
  assert.match(prompt, /get_import_instructions/);
  assert.match(prompt, /binding/);
});

test('isBrownfieldRoot: veri/, dotfiles, and node_modules do not count', (t) => {
  const root = tmpRoot(t);
  mkdirSync(join(root, 'veri'));
  mkdirSync(join(root, 'node_modules'));
  writeFileSync(join(root, '.gitignore'), '');
  assert.equal(isBrownfieldRoot(root), false);

  writeFileSync(join(root, 'package.json'), '{}');
  assert.equal(isBrownfieldRoot(root), true);
});

test('isUnpopulated: only the workflow document means unpopulated', () => {
  assert.equal(isUnpopulated([doc({ id: 'WF-001', type: 'workflow' })]), true);
  assert.equal(isUnpopulated([doc({ id: 'WF-001', type: 'workflow' }), doc({ id: 'REQ-001', type: 'requirement' })]), false);
});

test('assembleImportInstructions carries rules, census, and templates', (t) => {
  const root = tmpRoot(t);
  const veriDir = join(root, 'veri');
  mkdirSync(veriDir);

  const empty = assembleImportInstructions(veriDir, [doc({ id: 'WF-001', type: 'workflow' })]);
  assert.match(empty, /file ONE import manifest first/i);
  assert.match(empty, /rel: imported-via/);
  assert.match(empty, /rel: derived-from/);
  assert.match(empty, /file_receipt on MANIFEST/);
  assert.match(empty, /\(empty — this is a fresh knowledge base\)/);
  assert.match(empty, /## Requirement template/);
  assert.match(empty, /## Decision template/);

  const populated = assembleImportInstructions(veriDir, [
    doc({ id: 'WF-001', type: 'workflow' }),
    doc({ id: 'REQ-001', type: 'requirement', title: 'Existing requirement', status: 'accepted' }),
  ]);
  assert.match(populated, /- REQ-001 {2}requirement {2}accepted {2}Existing requirement/);
  assert.doesNotMatch(populated, /WF-001/); // the workflow is not census material
});
