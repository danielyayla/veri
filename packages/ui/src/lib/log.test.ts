import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LOG_FILE, LOG_FILE_OLD, MAX_LOG_BYTES, createLogger, updaterLogger } from './log.ts';

test('lines land as timestamp, level, message', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-log-'));
  const log = createLogger(dir);
  log.info('app 0.1.3 launched');
  log.error('update check failed: net::ERR_INTERNET_DISCONNECTED');
  const lines = (await readFile(join(dir, LOG_FILE), 'utf-8')).trimEnd().split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0]!, /^\d{4}-\d{2}-\d{2}T[\d:.]+Z info app 0\.1\.3 launched$/);
  assert.match(lines[1]!, /^\d{4}-\d{2}-\d{2}T[\d:.]+Z error update check failed: net::ERR_INTERNET_DISCONNECTED$/);
});

test('creates the directory on first write', async () => {
  const dir = join(await mkdtemp(join(tmpdir(), 'veri-log-')), 'nested', 'logs');
  createLogger(dir).info('first line');
  assert.match(await readFile(join(dir, LOG_FILE), 'utf-8'), /first line/);
});

test('rotates past the size cap: main.log becomes main.old.log, fresh file starts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-log-'));
  await writeFile(join(dir, LOG_FILE), 'x'.repeat(MAX_LOG_BYTES));
  const log = createLogger(dir);
  log.info('after rotation');
  const fresh = await readFile(join(dir, LOG_FILE), 'utf-8');
  assert.match(fresh, /after rotation/);
  assert.ok(fresh.length < 1024, 'rotated file starts fresh');
  assert.equal((await stat(join(dir, LOG_FILE_OLD))).size, MAX_LOG_BYTES);
});

test('rotation replaces a previous .old file rather than erroring', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-log-'));
  await writeFile(join(dir, LOG_FILE_OLD), 'ancient');
  await writeFile(join(dir, LOG_FILE), 'y'.repeat(MAX_LOG_BYTES));
  createLogger(dir).info('second rotation');
  const old = await readFile(join(dir, LOG_FILE_OLD), 'utf-8');
  assert.equal(old, 'y'.repeat(MAX_LOG_BYTES));
});

test('updater adapter prefixes and drops debug', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-log-'));
  const adapted = updaterLogger(createLogger(dir));
  adapted.info('Checking for update');
  adapted.error(new Error('feed unreachable'));
  adapted.debug('chatty http detail');
  const text = await readFile(join(dir, LOG_FILE), 'utf-8');
  assert.match(text, /info updater: Checking for update/);
  assert.match(text, /error updater: Error: feed unreachable/);
  assert.doesNotMatch(text, /chatty/);
});

test('updater adapter flattens newlines and truncates header dumps to one bounded line', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-log-'));
  const adapted = updaterLogger(createLogger(dir));
  adapted.error(`HttpError: 404\nHeaders: {\n${'  "x-filler": "y",\n'.repeat(100)}}`);
  const lines = (await readFile(join(dir, LOG_FILE), 'utf-8')).trimEnd().split('\n');
  assert.equal(lines.length, 1);
  assert.ok(lines[0]!.length < 500, `line stays bounded, got ${lines[0]!.length}`);
  assert.match(lines[0]!, /error updater: HttpError: 404 ⏎ Headers:/);
});
