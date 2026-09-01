#!/usr/bin/env node
import { approve, architecture, check, context, del, implemented, importFile, importPrompt, init, intent, list, migrate, newDoc, next, open, renumber, start, supersede, withdraw } from './commands.ts';
import type { CmdResult } from './commands.ts';
import { askTerminal, skillsInstall, skillsUpgrade } from './skills.ts';

/** The value following `--flag`, or undefined when the flag is absent. */
function flagValue(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at >= 0 ? args[at + 1] : undefined;
}

const USAGE = `usage: veri <command>

  veri init [--demo] [--starter <name>]
                             scaffold a veri/ directory (--demo: the sample
                             project; --starter: draft seed docs per project type)
  veri new <type> "<title>" [--approve [--as <maintainer>]]
                             create a document with the next free id;
                             --approve: when you are the author, the filing
                             carries your stamp — born promoted, same gates
                             as veri approve, one commit
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
  veri withdraw <id>         take a document out of play — the terminal
                             withdrawn status; the file, its id, and inbound
                             [[links]] all stay
  veri delete <id>           remove a document's file outright; refused unless
                             it was never approved and nothing references it
                             (the id stays spent — veri/ids is a floor)
  veri supersede <DEC-id> --by <DEC-id>
                             retire an active decision, naming the active
                             decision that now governs (approve the successor
                             first — an unapproved one binds nothing)
  veri renumber <id> [--to <new-id>] [--file <path>] [--refs <path,path>]
                             move a document to a new id, rewriting inbound links
  veri migrate               bring veri/ to the current on-disk format
  veri import [file] [--approve]
                             with a file: import it as a source document, original
                             preserved (.md .txt .eml); bare: print the kickoff
                             prompt for mining this repo into proposals
                             (--approve is accepted for symmetry — a source is
                             born in play and needs no stamp)
  veri context <WO-id>       print the context package an agent receives
  veri architecture          print the compiled intended architecture
  veri implemented <path>    work orders whose commits touched the path
  veri intent <path>         the documents governing a code path — bindings
                             and the module registry, never an index
  veri list [type]           list documents: id, status, title
  veri open [dir]            open the project in the Veri desktop app
  veri skills install [--all] [--yes] [--harness <name>]
                             write a skill shell per accepted method — a
                             trigger description and a pointer, never the
                             coaching (--all: the advanced tier too)
  veri skills upgrade [--yes]
                             compare this project's methods against the ones
                             this build ships and propose the differences
                             under veri/amendments/ — never an overwrite
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
    result = await newDoc(cwd, rest[0], rest[1], {
      approve: rest.includes('--approve'),
      as: flagValue(rest, '--as'),
    });
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
  case 'withdraw':
    result = await withdraw(cwd, rest[0]);
    break;
  case 'delete':
    result = await del(cwd, rest[0]);
    break;
  case 'supersede':
    result = await supersede(cwd, rest[0], flagValue(rest, '--by'));
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
    // With a file argument: intake (WO-094). Bare (or flags only): the
    // brownfield kickoff prompt (REQ-024) — one verb, split on the argument
    // (DEC-093). --approve is acknowledged, never stamped (WO-142, DEC-147).
    result =
      rest[0] === undefined || rest[0].startsWith('--')
        ? importPrompt(cwd)
        : await importFile(cwd, rest[0], { approve: rest.includes('--approve') });
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
  case 'skills': {
    // Asking is the point (DEC-125): a terminal with a human on it gets the
    // question, and anything else defers to --yes rather than guessing.
    const interactive = process.stdin.isTTY === true && process.stdout.isTTY === true;
    const confirm = interactive ? askTerminal : undefined;
    const yes = rest.includes('--yes');
    if (rest[0] === 'install') {
      result = await skillsInstall(cwd, { yes, all: rest.includes('--all'), harness: flagValue(rest, '--harness') }, confirm);
    } else if (rest[0] === 'upgrade') {
      result = await skillsUpgrade(cwd, { yes }, confirm);
    } else {
      result = { code: 1, lines: ['usage: veri skills install [--all] [--yes] [--harness <name>] | veri skills upgrade [--yes]'] };
    }
    break;
  }
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
