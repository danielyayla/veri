#!/usr/bin/env node
import { approve, check, init, list, newDoc } from './commands.ts';
import type { CmdResult } from './commands.ts';

const USAGE = `usage: veri <command>

  veri init [--demo]         scaffold a veri/ directory
  veri new <type> "<title>"  create a document with the next free id
  veri check                 report knowledge-base issues (exit 1 if any)
  veri approve <id>          approve a pending document (stamps approved: today)
  veri list [type]           list documents: id, status, title
`;

const [command, ...rest] = process.argv.slice(2);
const cwd = process.cwd();

let result: CmdResult;
switch (command) {
  case 'init':
    result = init(cwd, { demo: rest.includes('--demo') });
    break;
  case 'new':
    result = await newDoc(cwd, rest[0], rest[1]);
    break;
  case 'check':
    result = await check(cwd);
    break;
  case 'approve':
    result = await approve(cwd, rest[0]);
    break;
  case 'list':
    result = await list(cwd, rest[0]);
    break;
  case undefined:
  case 'help':
  case '--help':
    result = { code: command === undefined ? 1 : 0, lines: [USAGE] };
    break;
  default:
    result = { code: 1, lines: [`unknown command "${command}"`, '', USAGE] };
}

for (const line of result.lines) console.log(line);
process.exit(result.code);
