/**
 * The sidecar application (WO-073, DEC-063): everything the Electron main
 * process did in Node, behind the stdio protocol instead of ipcMain. One
 * method per window.veri capability, same lib/ modules, same guarded core
 * paths — the renderer cannot tell which shell hosts it (SRC-038). What was
 * native in Electron (window, menus, dialogs, clipboard, updater) now lives
 * in the Rust shell; what was Node stays here, unmodified where possible.
 */
import { watch } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  BODY_TEMPLATES,
  ProjectExistsError,
  classifyFormat,
  createDocument,
  deleteDocument,
  deleteRefusal,
  formatStatement,
  getTemplate,
  isCustomized,
  isOperableFormat,
  loadProject,
  saveDocumentFile,
  scaffoldProject,
  templateFile,
  withdrawDocument,
} from '@verikb/core';
import type { DocType } from '@verikb/core';
import { DEMO_ROOT } from '@verikb/cli';
import { assembleContext, paletteSearch } from '@verikb/mcp';
import { findProjectRoot, isVeriProject } from '../lib/root.ts';
import { fixRootArg, mcpStatus, writeVeriEntry } from '../lib/mcpconfig.ts';
import { probeNodeRuntime } from '../lib/noderuntime.ts';
import { verifyConnection } from '../lib/verify.ts';
import type { VerifyResult } from '../lib/verify.ts';
import { cleanupLaunchScripts, connectAgent, detectAgents, launchAgent } from '../lib/agents.ts';
import type { AgentId } from '../lib/agents.ts';
import { SnapshotBuilder, countProjectDocs } from '../lib/snapshot.ts';
import { isThemePref, loadThemePref, saveThemePref } from '../lib/appearance.ts';
import type { ThemePref } from '../lib/appearance.ts';
import { loadWorkspaceState, saveWorkspaceState } from '../lib/workspace.ts';
import type { WorkspaceState } from '../lib/workspace.ts';
import { appendNote, appendReviewNote, approveDoc, setLinks, setStatus } from '../lib/write.ts';
import { commitIntake, inspectIntake } from '../lib/intakehost.ts';
import type { CommitRequest } from '../lib/intakehost.ts';
import { createLogger } from '../lib/log.ts';
import { buildIssueUrl } from '../lib/report.ts';
import type { ProjectInfo } from '../renderer/api.ts';
import type { Method } from './protocol.ts';
import { classifyRootEvent, createDebouncer } from './watchlogic.ts';

const execFileP = promisify(execFile);

export interface SidecarOptions {
  /** The shell's version — the one authority (tauri.conf.json ← package.json). */
  appVersion: string;
  /** Installed bundle vs dev run; steers app-info and the config dir choice. */
  packaged: boolean;
  /** Where MRU/workspace/theme state lives — the Electron userData layout. */
  configDir: string;
  /** ~/Library/Logs/Veri (WO-031/DEC-034) — paths and outcomes, never content. */
  logDir: string;
  /** The user's positional launch argument, if the shell got one. */
  explicitRoot: string | undefined;
  /** The shell's working directory — the walk-up start for dev launches. */
  cwd: string;
  /** Push one protocol event at the shell (it forwards to the WebView). */
  emit: (event: string, data?: unknown) => void;
}

/** What the shell needs to run the launch chain (main.ts's whenReady port):
    the resolved candidate root and whether it can be opened as-is. */
export interface LaunchResolution {
  root: string | null;
  operable: boolean;
  statement: string | null;
}

export interface DirClassification {
  project: boolean;
  operable: boolean;
  statement: string | null;
}

export type WelcomeOpen =
  | null
  | { kind: 'opened' }
  | { kind: 'not-a-project'; dir: string }
  | { kind: 'error'; message: string };

export type NewProjectPick =
  | null
  | { kind: 'existing'; dir: string }
  | { kind: 'new'; dir: string; name: string };

/** A read may only touch markdown inside veri/ (REQ-009 out-of-scope line). */
export function isDocPath(file: string): boolean {
  return !file.startsWith('/') && !file.split(/[\\/]/).includes('..') && file.endsWith('.md');
}

// Config management for MRU projects.
const PROJECT_COLORS = ['#E8703A', '#7EA6C4', '#CFA83D', '#7FAF8A', '#E7A5D9', '#F0A87E', '#A5D4E8'];

export interface Sidecar {
  methods: Record<string, Method>;
  /** Startup work with side effects, kept out of the constructor. */
  start(): Promise<void>;
  /** Final log line + watcher teardown; the shell closes stdin after. */
  shutdown(): void;
}

export function createSidecar(options: SidecarOptions): Sidecar {
  const log = createLogger(options.logDir);
  let projectRoot = findProjectRoot(options.explicitRoot, options.cwd);

  // The MCP server executable setup writes into .mcp.json: server.js next to
  // @verikb/mcp's resolved entry point (dist/index.js). Inside the installed
  // bundle both are real files under Resources/ — asar-free by construction,
  // where Electron needed asar disabled for the same reason (DEC-028).
  const mcpServerJs = join(dirname(fileURLToPath(import.meta.resolve('@verikb/mcp'))), 'server.js');

  // Writes the panel makes trip the same file watcher as external edits; the
  // timestamp lets the watcher tell the two apart (see watchProject).
  let mcpSelfWriteAt = 0;

  async function mcpWrite(action: () => Promise<void>): Promise<void> {
    mcpSelfWriteAt = Date.now();
    await action();
  }

  async function getRecentProjects(): Promise<ProjectInfo[]> {
    try {
      const content = await readFile(join(options.configDir, 'recent-projects.json'), 'utf-8');
      return JSON.parse(content) as ProjectInfo[];
    } catch {
      return [];
    }
  }

  async function saveRecentProjects(projects: ProjectInfo[]): Promise<void> {
    await mkdir(options.configDir, { recursive: true });
    await writeFile(join(options.configDir, 'recent-projects.json'), JSON.stringify(projects, null, 2));
  }

  async function addProjectToMru(dir: string): Promise<void> {
    const projects = await getRecentProjects();
    const existing = projects.find((p) => p.dir === dir);
    const baseName = dir.split('/').pop() || dir;
    const accentColor = existing?.accentColor ?? PROJECT_COLORS[projects.length % PROJECT_COLORS.length]!;
    const filtered = projects.filter((p) => p.dir !== dir);
    filtered.unshift({ dir, name: baseName, accentColor, docCount: 0, issueCount: 0 });
    await saveRecentProjects(filtered.slice(0, 20));
  }

  // One builder for the sidecar's lifetime (WO-051): the snapshot path is
  // incremental — unchanged documents and an unmoved HEAD cost nothing to
  // rebuild. Caches are in-memory only (DEC-002) and reset on project switch.
  const snapshotBuilder = new SnapshotBuilder();

  async function getProjectStats(dir: string): Promise<{ docCount: number; issueCount: number }> {
    const current = snapshotBuilder.current;
    if (current !== null && current.root === dir) {
      return { docCount: current.documents.length, issueCount: current.issues.length };
    }
    return { docCount: await countProjectDocs(dir), issueCount: 0 };
  }

  // Theme preference (WO-060, SRC-032): app-level, per machine. The shell
  // resolves System and paints the window; this side only persists the pref.
  // VERI_UI_THEME overrides without persisting (screenshot harness).
  let themePref: ThemePref = 'system';

  let watchers: ReturnType<typeof watch>[] = [];
  const veriDebounce = createDebouncer(() => options.emit('changed'));

  function watchProject(): void {
    for (const w of watchers) w.close();
    veriDebounce.cancel();
    watchers = [];
    // Launch resolution guarantees a project before any window, but a
    // throwing watch() here would kill the sidecar — never watch a root
    // that has no veri/.
    if (!isVeriProject(projectRoot)) return;
    // veri/ recursively, plus the project root (non-recursive) for CLAUDE.md —
    // both feed the context package. .mcp.json events instead feed the
    // agent-connection panel; a change not preceded by one of the panel's own
    // writes is an external edit (REQ-005: re-check and say so).
    watchers = [
      watch(join(projectRoot, 'veri'), { recursive: true }, () => veriDebounce.bump()),
      watch(projectRoot, (_event, filename) => {
        const event = classifyRootEvent(filename, mcpSelfWriteAt, Date.now());
        if (event.kind === 'mcp-changed') {
          options.emit('mcp-changed', { external: event.external });
        } else {
          veriDebounce.bump();
        }
      }),
    ];
  }

  /**
   * Re-point the whole sidecar at a project directory. Validates before
   * mutating anything so a bad pick (no veri/ inside) leaves projectRoot,
   * the MRU, and the watchers exactly as they were. Returns an error message
   * or null on success. The window reload that Electron's pointAppAt did is
   * now the shim's job — it reloads the page when this resolves null.
   */
  async function pointAppAt(dir: string): Promise<string | null> {
    if (!isVeriProject(dir)) return `Not a Veri project — no veri/ directory inside ${dir}`;
    // REQ-015: a newer or unreadable format is stated, never opened — opening
    // would misrender; refusing leaves projectRoot and the MRU untouched.
    const format = classifyFormat(join(dir, 'veri'));
    if (!isOperableFormat(format)) return `Cannot open this project: ${formatStatement(format)}`;
    projectRoot = dir;
    // WO-051: caches from one project must never serve another — the new
    // project starts cold.
    snapshotBuilder.reset();
    log.info(`project opened: ${dir}`);
    await addProjectToMru(dir);
    watchProject();
    return null;
  }

  // macOS version for app-info's sibling, the issue URL — Electron's
  // process.getSystemVersion() by other means. Cached: it cannot change
  // under a running app.
  let macos: string | null = null;
  async function macosVersion(): Promise<string> {
    if (macos === null) {
      try {
        macos = (await execFileP('sw_vers', ['-productVersion'])).stdout.trim();
      } catch {
        macos = '';
      }
    }
    return macos;
  }

  const methods: Record<string, Method> = {
    snapshot: () => snapshotBuilder.build(projectRoot),
    context: (id: string) => assembleContext(projectRoot, id),
    'palette-search': (query: string, recents: string[]) => paletteSearch(projectRoot, query, recents),
    // Pins/recents (WO-014): per-project workspace state in the config dir,
    // never veri/.
    'workspace-load': () => loadWorkspaceState(options.configDir, projectRoot),
    'workspace-save': (state: WorkspaceState) => saveWorkspaceState(options.configDir, projectRoot, state),
    // Theme (WO-060): the pref lives app-level in the config dir. The shell
    // resolves System against the OS and fans the flip out to the WebView,
    // so `dark` is no business of this process.
    'theme-get': () => ({ pref: themePref }),
    'theme-set': async (pref: ThemePref) => {
      if (!isThemePref(pref)) throw new Error(`not a theme preference: ${String(pref)}`);
      themePref = pref;
      await saveThemePref(options.configDir, pref);
      return { pref: themePref };
    },
    'set-status': (id: string, status: string) => setStatus(projectRoot, id, status),
    // Direct editing (WO-022): raw file in, guarded verbatim write out. The
    // guards and the updated: bump live in core so CLI/MCP/UI can't drift.
    'read-doc': async (file: string) => {
      if (!isDocPath(file)) throw new Error(`not a veri/ document path: ${file}`);
      try {
        return await readFile(join(projectRoot, 'veri', file), 'utf8');
      } catch {
        return null; // deleted while open — the renderer shows the restore banner
      }
    },
    'save-doc': (file: string, text: string) => saveDocumentFile(join(projectRoot, 'veri'), file, text),
    'create-doc': (type: DocType, title: string) => createDocument(join(projectRoot, 'veri'), type, title),
    // Discard (WO-110, DEC-110): the two verbs over core's own functions —
    // the app never re-implements the guard. `withdraw-doc` flips to the
    // terminal status; `delete-doc` with probe=true returns the guard's
    // verdict without acting (so the popover states a refusal instead of
    // hiding the control, SRC-052), and with probe=false removes the file.
    'withdraw-doc': (id: string) => withdrawDocument(join(projectRoot, 'veri'), id),
    'delete-doc': async (id: string, probe: boolean) => {
      const veriDir = join(projectRoot, 'veri');
      if (probe === true) {
        const { documents } = await loadProject(veriDir);
        const doc = documents.find((d) => d.id === id.toUpperCase());
        if (doc === undefined) throw new Error(`no document with id ${id.toUpperCase()}`);
        return { refusal: deleteRefusal(doc, documents) };
      }
      return deleteDocument(veriDir, id);
    },
    // File import (WO-096, SRC-045): inspect derives what each dropped or
    // picked file would become — writing nothing, so Cancel is free; commit
    // files the accepted rows through core's intake seam (DEC-093, DEC-094).
    'import-inspect': (paths: string[]) => inspectIntake(paths),
    'import-commit': (requests: CommitRequest[]) => commitIntake(projectRoot, requests),
    // Template settings (WO-024): the effective body plus provenance, straight
    // from core (WO-023) — never cached, so chips always match the files.
    'template-read': (type: DocType) => {
      const veriDir = join(projectRoot, 'veri');
      const { body, source } = getTemplate(veriDir, type);
      return { body, source, customized: isCustomized(veriDir, type) };
    },
    'template-write': async (type: DocType, body: string) => {
      const veriDir = join(projectRoot, 'veri');
      // First save in a pre-templates project materializes the directory (SRC-009).
      await mkdir(join(veriDir, 'templates'), { recursive: true });
      await writeFile(join(veriDir, templateFile(type)), body);
    },
    'template-reset': async (type: DocType) => {
      const veriDir = join(projectRoot, 'veri');
      await mkdir(join(veriDir, 'templates'), { recursive: true });
      await writeFile(join(veriDir, templateFile(type)), BODY_TEMPLATES[type]);
    },
    'append-note': (id: string, note: string) => appendNote(projectRoot, id, note),
    // Typed-link editing (WO-056): the full new outbound array in, core's
    // byte-preserving links-block rewrite out. Targets are validated against
    // the project's current documents before anything is written.
    'set-links': (id: string, links: { id: string; rel: string }[]) => setLinks(projectRoot, id, links),
    approve: (id: string) => approveDoc(projectRoot, id),
    'review-note': (id: string, note: string) => appendReviewNote(projectRoot, id, note),
    'mcp-status': () => mcpStatus(projectRoot, mcpServerJs),
    'mcp-setup': async () => {
      await mcpWrite(() => writeVeriEntry(projectRoot, mcpServerJs));
      log.info(`mcp-config: wrote veri entry in ${join(projectRoot, '.mcp.json')}`);
    },
    'mcp-fix-root': async () => {
      await mcpWrite(() => fixRootArg(projectRoot));
      log.info(`mcp-config: fixed root arg in ${join(projectRoot, '.mcp.json')}`);
    },
    // Runtime pre-check (DEC-031): the agent's login shell, never this
    // process's own PATH — a GUI launch inherits launchd's bare PATH and
    // would lie. The bundled sidecar runtime is the app's own affair; agent
    // configs keep command "node", the user's.
    'runtime-probe': () => probeNodeRuntime(),
    // LIVE CHECK (WO-030): launch the configured server once and speak MCP to
    // it. The search id comes from the snapshot so a success proves the server
    // is serving this project's files; a documentless project skips it.
    'verify-connection': async (): Promise<VerifyResult> => {
      const status = await mcpStatus(projectRoot, mcpServerJs);
      if (status.state !== 'ok' || status.serverPathResolved === null || status.rootPathResolved === null) {
        return { kind: 'no-answer', stderr: 'no recognized veri entry to verify — run setup first' };
      }
      const probe = await probeNodeRuntime();
      // WO-051: the builder's current snapshot is enough — verification only
      // needs one sample id, not a fresh full build.
      const snap = snapshotBuilder.current ?? (await snapshotBuilder.build(projectRoot).catch(() => null));
      const searchId = snap?.documents.find((d) => d.type !== 'workflow')?.id ?? null;
      return verifyConnection({
        probe,
        serverPath: status.serverPathResolved,
        rootPath: status.rootPathResolved,
        projectRoot,
        searchId,
      });
    },
    // Settings view (WO-036): identity facts for the Project settings and
    // Updates sections. The format label comes from core's classification of
    // the file on disk (REQ-015) — computed per call, so a project switch or
    // an external `veri migrate` is reflected on the next render.
    'app-info': () => {
      const format = classifyFormat(join(projectRoot, 'veri'));
      return {
        version: options.appVersion,
        packaged: options.packaged,
        home: homedir(),
        formatLabel: format.kind === 'current' ? `veri/format v${format.version}` : (formatStatement(format) ?? ''),
      };
    },
    agents: () => detectAgents(projectRoot),
    // Start agent session (WO-011): optional config write (DEC-011-gated),
    // then spawn the agent in a terminal. Resolves to an error message or null
    // so the picker can stay open and explain a failure.
    'agent-launch': async (id: AgentId, binPath: string, prompt: string, setup: boolean) => {
      try {
        if (setup) {
          await mcpWrite(() => connectAgent(projectRoot, mcpServerJs, id));
          log.info(`mcp-config: wrote ${id} agent config for ${projectRoot}`);
        }
        await launchAgent(projectRoot, id, binPath, prompt);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    },
    'list-recent-projects': async () => {
      const projects = await getRecentProjects();
      // Prune rows that are not (or no longer) Veri projects — deleted dirs
      // and the false positives the old name-only check let in.
      const valid = projects.filter((p) => isVeriProject(p.dir));
      if (valid.length !== projects.length) await saveRecentProjects(valid);
      return Promise.all(
        valid.map(async (p) => {
          const stats = await getProjectStats(p.dir);
          return { ...p, docCount: stats.docCount, issueCount: stats.issueCount };
        }),
      );
    },
    // The shell picks directories natively; these apply / classify them. In
    // Electron, dialog + re-point lived in one main-process handler each.
    'point-at': (dir: string) => pointAppAt(dir),
    'classify-dir': (dir: string): DirClassification => {
      if (!isVeriProject(dir)) return { project: false, operable: false, statement: null };
      const format = classifyFormat(join(dir, 'veri'));
      return { project: true, operable: isOperableFormat(format), statement: formatStatement(format) };
    },
    // Scaffold, then open. Order matters: scaffoldProject throws before
    // pointAppAt runs, so a failed create never touches the MRU list.
    'create-project': async (dir: string, demo: boolean): Promise<string | null> => {
      try {
        scaffoldProject(dir, { demo, demoRoot: DEMO_ROOT });
      } catch (err) {
        if (err instanceof ProjectExistsError) return `${dir} already contains a veri/ directory.`;
        return err instanceof Error ? err.message : String(err);
      }
      return pointAppAt(dir);
    },
    /**
     * The launch chain's first question (DEC-027, ported from whenReady):
     * explicit arg or cwd walk-up first; a launch outside any project falls
     * back to the most recent MRU entry that is still a project. The dialog
     * loop for an inoperable format is the shell's — it owns the dialogs.
     */
    'launch-resolve': async (): Promise<LaunchResolution> => {
      let root: string | null = projectRoot;
      if (!isVeriProject(root)) {
        root = (await getRecentProjects()).find((p) => isVeriProject(p.dir))?.dir ?? null;
      }
      if (root === null) return { root: null, operable: false, statement: null };
      const format = classifyFormat(join(root, 'veri'));
      return { root, operable: isOperableFormat(format), statement: formatStatement(format) };
    },
    'issue-url': async () => buildIssueUrl(options.appVersion, await macosVersion()),
    // The shell's own outcomes (updater above all: REQ-011 keeps failed
    // checks out of the UI, DEC-034 puts them here) ride through this so
    // main.log stays the one record with one writer.
    log: (level: 'info' | 'warn' | 'error', message: string) => {
      if (typeof message !== 'string' || !['info', 'warn', 'error'].includes(level)) return;
      log[level](message);
    },
  };

  return {
    methods,
    async start(): Promise<void> {
      const envPref = process.env['VERI_UI_THEME'];
      themePref = isThemePref(envPref) ? envPref : await loadThemePref(options.configDir);
      log.info(`app ${options.appVersion} launched (macOS ${await macosVersion()})`);
      void cleanupLaunchScripts();
      // The launch chain drives project opening from the shell; watchers and
      // MRU arm in pointAppAt. Nothing to open yet.
    },
    shutdown(): void {
      for (const w of watchers) w.close();
      veriDebounce.cancel();
      log.info('app quit');
    },
  };
}
