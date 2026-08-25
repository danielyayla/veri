#!/usr/bin/env node
import { approve, architecture, check, context, implemented, importFile, importPrompt, init, intent, list, migrate, newDoc, next, open, renumber, start } from './commands.ts';
import type { CmdResult } from './commands.ts';

/** The value following `--flag`, or undefined when the flag is absent. */
function flagValue(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at >= 0 ? args[at + 1] : undefined;
}

const USAGE = `usage: veri <command>

  veri init [--demo] [--starter <name>]
                             scaffold a veri/ directory (--demo: the sample
                             project; --starter: draft seed docs per project type)
  veri new <type> "<title>"  create a document with the next free id
  veri check                 report knowledge-base issues (exit 1 if any)
  veri approve <id> [--as <maintainer>]
                             approve a pending document (stamps approved: today);
                             a backlog work order promotes to ready — cleared
                             for dispatch
  veri next                  print the next ready work order (id, title, path,
                             tab-separated); exit 1 when nothing is ready
  veri start <WO-id> [--as <session>]
                             flip a ready work order to in-progress, recording
                             the claim (--as defaults from git user.name)
  veri renumber <id> [--to <new-id>] [--file <path>] [--refs <path,path>]
                             move a document to a new id, rewriting inbound links
  veri migrate               bring veri/ to the current on-disk format
  veri import [file]         with a file: import it as a source document, original
                             preserved (.md .txt .eml); bare: print the kickoff
                             prompt for mining this repo into proposals
  veri context <WO-id>       print the context package an agent receives
  veri architecture          print the compiled intended architecture
  veri implemented <path>    work orders whose commits touched the path
  veri intent <path>         the documents governing a code path — bindings,
                             receipts, and the module registry, never an index
  veri list [type]           list documents: id, status, title
  veri open [dir]            open the project in the Veri desktop app
`;

const [command, ...rest] = process.argv.slice(2);
const cwd = process.cwd();

let result: CmdResult;
switch (command) {
  case 'init':
    // A bare `--starter` (no name) reaches init as '' so it can answer
    // with the list of available starters instead of scaffolding plain.
    result = init(cwd, {
      demo: rest.includes('--demo'),
      starter: rest.includes('--starter') ? (flagValue(rest, '--starter') ?? '') : undefined,
    });
    break;
  case 'new':
    result = await newDoc(cwd, rest[0], rest[1]);
    break;
  case 'check':
    result = await check(cwd);
    break;
  case 'approve':
    result = await approve(cwd, rest[0], flagValue(rest, '--as'));
    break;
  case 'next':
    result = await next(cwd);
    break;
  case 'start':
    result = await start(cwd, rest[0], flagValue(rest, '--as'));
    break;
  case 'renumber':
    result = await renumber(cwd, rest[0], {
      to: flagValue(rest, '--to'),
      file: flagValue(rest, '--file'),
      refs: flagValue(rest, '--refs')
        ?.split(',')
        .map((path) => path.trim())
        .filter((path) => path !== ''),
    });
    break;
  case 'migrate':
    result = migrate(cwd);
    break;
  case 'import':
    // With a file argument: intake (WO-094). Bare: the brownfield kickoff
    // prompt (REQ-024) — one verb, split on the argument (DEC-093).
    result = rest[0] === undefined ? importPrompt(cwd) : await importFile(cwd, rest[0]);
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
  case 'intent':
    result = await intent(cwd, rest[0]);
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
