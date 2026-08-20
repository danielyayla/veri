#!/usr/bin/env node
import { approve, architecture, check, context, implemented, init, list, migrate, newDoc, open } from './commands.ts';
import type { CmdResult } from './commands.ts';

const USAGE = `usage: veri <command>

  veri init [--demo]         scaffold a veri/ directory
  veri new <type> "<title>"  create a document with the next free id
  veri check                 report knowledge-base issues (exit 1 if any)
  veri approve <id>          approve a pending document (stamps approved: today)
  veri migrate               bring veri/ to the current on-disk format
  veri context <WO-id>       print the context package an agent receives
  veri architecture          print the compiled intended architecture
  veri implemented <path>    work orders whose commits touched the path
  veri list [type]           list documents: id, status, title
  veri open [dir]            open the project in the Veri desktop app
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
  case 'migrate':
    result = migrate(cwd);
    break;
  case 'context':
    result = await context(cwd, rest[0]);
    break;
  case 'architecture':
    result = await architecture(cwd);
    break;
  case 'implemented':
    result = await implemented(cwd, rest[0]);
    break;
  case 'open':
    result = open(cwd, rest[0]);
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
