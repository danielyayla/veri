import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildImportedSource, deriveIntakeTitle, extractIntake, originalStoragePath } from './intake.ts';
import { parseDocument } from './parse.ts';

/**
 * WO-094 — evidence intake. Extraction, refusal, title derivation, and the
 * built document are pure over (filename, content); the round-trip test
 * proves what intake builds is what parseDocument accepts.
 */

test('markdown and plain text extract as-is, trimmed and newline-normalized', () => {
  const md = extractIntake('notes.md', '# Meeting notes\r\n\r\nBody line.\r\n');
  assert.ok(md.ok);
  assert.equal(md.kind, 'md');
  assert.equal(md.text, '# Meeting notes\n\nBody line.');

  const txt = extractIntake('transcript.txt', new TextEncoder().encode('spoken words\n'));
  assert.ok(txt.ok);
  assert.equal(txt.kind, 'txt');
  assert.equal(txt.text, 'spoken words');
});

test('unsupported extensions are refused naming the supported set', () => {
  for (const name of ['scan.pdf', 'deck.pptx', 'call.m4a', 'noext']) {
    const out = extractIntake(name, 'irrelevant');
    assert.ok(!out.ok);
    assert.match(out.message, /supported formats: \.md \.txt \.eml/);
    assert.ok(out.message.includes(name));
  }
});

test('binary content behind a text extension is refused, not filed', () => {
  const out = extractIntake('fake.txt', new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0x01]));
  assert.ok(!out.ok);
  assert.match(out.message, /not text/);
});

test('empty extraction is refused rather than filing an empty shell', () => {
  const out = extractIntake('blank.txt', '  \n\n  ');
  assert.ok(!out.ok);
  assert.match(out.message, /no text to extract/);
});

test('a plain eml keeps headline headers as a preamble above the body', () => {
  const raw = ['From: ops@meridian.example', 'To: daniel@veri.example', 'Subject: Renewal pricing', 'Date: Mon, 24 Aug 2026 09:00:00 +0000', '', 'Two-line body.', 'Second line.'].join('\r\n');
  const out = extractIntake('thread.eml', raw);
  assert.ok(out.ok);
  assert.match(out.text, /^- From: ops@meridian\.example\n/);
  assert.match(out.text, /- Subject: Renewal pricing/);
  assert.match(out.text, /Two-line body\.\nSecond line\.$/);
});

test('a multipart eml takes the first text/plain part and decodes quoted-printable', () => {
  const raw = [
    'Subject: Caf=C3=A9 plans',
    'Content-Type: multipart/alternative; boundary="XYZ"',
    '',
    '--XYZ',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    'Caf=C3=A9 line one=',
    ' continues.',
    '--XYZ',
    'Content-Type: text/html',
    '',
    '<p>ignored</p>',
    '--XYZ--',
  ].join('\r\n');
  const out = extractIntake('plans.eml', raw);
  assert.ok(out.ok);
  assert.match(out.text, /Café line one continues\./);
  assert.doesNotMatch(out.text, /ignored/);
});

test('an eml with no readable text part is refused', () => {
  const raw = ['Subject: x', 'Content-Type: multipart/mixed; boundary="B"', '', '--B', 'Content-Type: image/png', 'Content-Transfer-Encoding: base64', '', 'aGk=', '--B--'].join('\r\n');
  const out = extractIntake('pic.eml', raw);
  assert.ok(!out.ok);
  assert.match(out.message, /no readable text\/plain part/);
});

test('titles derive from the H1, the subject, or the opened filename stem', () => {
  assert.equal(deriveIntakeTitle('x.md', { kind: 'md', text: '# The real title\n\nbody' }), 'The real title');
  assert.equal(deriveIntakeTitle('t.eml', { kind: 'eml', text: '- Subject: Renewal pricing\n\nbody' }), 'Renewal pricing');
  assert.equal(deriveIntakeTitle('meridian-onboarding_interview.txt', { kind: 'txt', text: 'body' }), 'Meridian onboarding interview');
});

test('original storage paths are id-keyed, originals/-rooted, and sanitized', () => {
  assert.equal(originalStoragePath('SRC-045', '/tmp/in box/pricing thread.eml'), 'originals/SRC-045-pricing-thread.eml');
  assert.equal(originalStoragePath('SRC-046', 'ünïcode?.md'), 'originals/SRC-046-n-code-.md');
});

test('the built document round-trips through parseDocument with the original field intact', () => {
  const text = buildImportedSource({
    id: 'SRC-099',
    title: 'A title with "quotes" — and a dash',
    date: '2026-08-25',
    original: 'originals/SRC-099-notes.md',
    text: '# H1\n\nExtracted body.',
  });
  const outcome = parseDocument('sources/SRC-099-a-title.md', text);
  assert.equal(outcome.issues.length, 0);
  assert.ok(outcome.document);
  assert.equal(outcome.document.frontmatter.id, 'SRC-099');
  assert.equal(outcome.document.frontmatter.status, 'imported');
  assert.equal((outcome.document.frontmatter as { original?: string }).original, 'originals/SRC-099-notes.md');
  assert.match(outcome.document.body, /Extracted body\./);
});
