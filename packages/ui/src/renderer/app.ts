/** App shell: state, topbar, sidebar, view switching, IPC wiring. */
import type { Advisory, DocType, Issue, VeriDocument } from '@veri/core';
import type { ContextPackage, PaletteResult } from '@veri/mcp';
import type { Snapshot } from '../lib/snapshot.ts';
import { api } from './api.ts';
import type { ProjectInfo, TemplateInfo, VeriApi } from './api.ts';
import { h } from './dom.ts';
import { TYPE_META, relTime, statusColor, tint } from './theme.ts';
import { advisoriesByDoc, docsById, isPending, issuesByDoc, packageSummary } from './derive.ts';
import { composeTarget, isValidProjectName } from './newproject.ts';
import type { ActivityRow, DocsById, PackageSummary } from './derive.ts';
import type { McpStatus } from '../lib/mcpconfig.ts';
import type { RuntimeProbe } from '../lib/noderuntime.ts';
import type { VerifyResult } from '../lib/verify.ts';
import type { AgentInfo } from '../lib/agents.ts';
import { kickoffPrompt } from './derive.ts';
import { readerView } from './views/reader.ts';
import { homeView } from './views/home.ts';
import { mcpView } from './views/mcp.ts';
import { welcomeView } from './views/welcome.ts';
import { workOrderView } from './views/workorder.ts';
import { boardView } from './views/board.ts';
import { graphView } from './views/graph.ts';
import { decisionsView } from './views/decisions.ts';
import { VIEW_META, activateTab, closeTab, cycleTab, isViewKey, openTab, pinTab, reorderTab, retainTabs } from './tabs.ts';
import type { Tab, TabState } from './tabs.ts';
import { EditorIsland } from './editor.ts';
import { ipcErrorMessage, reconcileDisk } from './editlogic.ts';
import { editorScreen } from './views/editor.ts';
import { paletteRows } from './palette.ts';
import type { PaletteRow } from './palette.ts';
import { TPL_TYPES, templatesView } from './views/templates.ts';
import { DEAD_LABEL, isLiving, pushRecent, treeSection, visibleRecents } from './sidebar.ts';

export type View = 'home' | 'workorder' | 'homeview' | 'board' | 'graph' | 'decisions' | 'mcp' | 'templates';

export interface OpenDocOpts {
  preview?: boolean;
  background?: boolean;
}

export interface State {
  /** Ordered tab strip (SRC-004): ids are doc ids or view keys. */
  tabs: Tab[];
  activeTabId: string | null;
  /** SRC-004 settings flag — false makes every click open a pinned tab. */
  previewTabs: boolean;
  /** Derived from the active tab; views keep reading these. */
  view: View;
  docId: string | null;
  expanded: Set<string>;
  graphSel: string | null;
  editorText: string;
  editorFocused: boolean;
  copied: boolean;
  kickoffCopied: boolean;
  /** Agent picker (WO-011): open flag, fresh detection results, and feedback. */
  agentsOpen: boolean;
  agents: AgentInfo[] | null;
  agentLaunching: string | null;
  agentLaunchMsg: { ok: boolean; text: string } | null;
  /** Working set (WO-014): per-project pins and recents, persisted in userData. */
  pinned: string[];
  recents: string[];
  /** Sidebar session state (WO-014): per-type collapse and dead-doc expansion. */
  sectionCollapsed: Partial<Record<DocType, boolean>>;
  showDead: Partial<Record<DocType, boolean>>;
  /** Which rail item's instant tooltip is showing (view key or 'mcp'). */
  railTip: string | null;
  /** Review banner (SRC-006): approve-confirm popover and note composer. */
  reviewPop: boolean;
  /** Non-null while the request-changes composer is open; holds its draft. */
  reviewText: string | null;
  /** Transient bottom-center toast (SRC-006 approve/return feedback). */
  toast: string | null;
  /** Command palette (WO-013): overlay flag, raw query, selection, ranked result. */
  paletteOpen: boolean;
  paletteQuery: string;
  paletteSel: number;
  paletteResult: PaletteResult | null;
  projectSwitcherOpen: boolean;
  projectError: string | null;
  /** Non-null while the New project sheet is up (WO-018, SRC-007). */
  newProject: NewProjectState | null;
  /** New-document popover (WO-022, SRC-008): type + title, nothing else.
      `anchor` is the sidebar `+` position; null centers it (⌘N). */
  newDoc: { type: DocType; title: string; anchor: { x: number; y: number } | null } | null;
  /** Save/Discard/Cancel prompt for closing a dirty editor tab (SRC-008). */
  closeConfirm: { id: string; x: number; y: number } | null;
  /** Templates settings view (WO-024, SRC-009): active type + reset confirm. */
  tplType: DocType;
  tplResetConfirm: boolean;
  /** Green "opened the existing project" chip, shown after the reload. */
  projectNotice: string | null;
  mcpStatus: McpStatus | null;
  /** Drives the restart banner; cleared by re-run checks or leaving the panel. */
  mcpWrote: boolean;
  /** Drives the external-edit banner; cleared by re-run checks. */
  mcpExternal: boolean;
  mcpBuildCopied: boolean;
  mcpCmdCopied: boolean;
  /** LIVE CHECK (WO-030, SRC-013): transient — never persisted, never fed
      to the sidebar footer. Null is the rest state. */
  mcpVerify: 'busy' | VerifyResult | null;
  /** The one copy-action's "✓ Copied" flip inside a verify failure block. */
  mcpVerifyCopied: boolean;
  /** Passive runtime pre-check for the not-set-up hero (DEC-031). */
  mcpPrecheck: RuntimeProbe | null;
  /** Welcome screen's inline notice (cold-start mode only). */
  welcomeNotice: { text: string } | null;
}

/** The New project sheet's own state — one directory, one toggle, one error. */
export interface NewProjectState {
  dir: string;
  name: string;
  demo: boolean;
  busy: boolean;
  error: string | null;
}

export interface CachedPackage {
  text: string;
  summary: PackageSummary;
}

/** Everything views need: snapshot, state, and actions. */
export interface Ctx {
  snap: Snapshot;
  byId: DocsById;
  issues: Map<string, Issue[]>;
  advisories: Map<string, Advisory[]>;
  state: State;
  pkg: Map<string, CachedPackage>;
  api: VeriApi;
  doc(): VeriDocument | null;
  update(patch: Partial<State>): void;
  openDoc(id: string, opts?: OpenDocOpts): void;
  setView(view: View): void;
  /** Pin/unpin a doc in the sidebar working set (WO-014). */
  togglePin(id: string): void;
  refresh(): Promise<void>;
  loadPackage(id: string): void;
  refreshMcp(): Promise<void>;
  toggleAgentPicker(): void;
  launchAgent(info: AgentInfo): void;
  copyKickoff(): void;
  flashCopied(): void;
  /** Show a transient bottom-center toast (auto-dismissed). */
  flashToast(text: string): void;
  /** Editor state for a doc tab (WO-022): null when never opened for editing. */
  editFor(id: string): EditState | null;
  /** Flip a doc tab between the rendered reader and the editor (⌘E). */
  setEditMode(id: string, mode: 'read' | 'edit'): void;
  /** Everything the editor screen renders for the active doc. */
  editView(): ActiveEdit | null;
  /** ⌘S: guarded verbatim save of the active editor buffer. */
  saveActive(): void;
  /** Templates view (WO-024): chip state for a type row, null while loading. */
  tplChip(type: DocType): boolean | null;
  /** The active type's editor card state; null while its first read is in flight. */
  tplView(): ActiveTpl | null;
  tplSelect(type: DocType): void;
  tplSave(): void;
  tplReset(): void;
  tplSetResetConfirm(open: boolean): void;
  tplResolveConflict(action: 'reload' | 'keep'): void;
  /** Reload / Keep mine / Restore / Close tab on a conflict banner. */
  resolveConflict(action: 'reload' | 'keep' | 'restore' | 'closetab'): void;
  /** Sidebar `+` / ⌘N: open the type-plus-title creation popover. */
  openNewDoc(type: DocType, anchor: { x: number; y: number } | null): void;
  flashMcpCmdCopied(): void;
  /** LIVE CHECK (WO-030): one spawn per click; result is transient state. */
  runVerify(): void;
  /** Kick off the not-set-up hero's passive runtime pre-check once per visit. */
  ensureRuntimePrecheck(): void;
  sessionLog(id: string, row: ActivityRow): void;
  sessionRows(id: string): ActivityRow[];
  /** Every session-logged action across docs, newest first (Home feed). */
  sessionAll(): Array<{ id: string; row: ActivityRow }>;
  rel(date: string): string;
}

const TYPE_ORDER = ['requirement', 'decision', 'work-order', 'source'] as const;

export interface EditState {
  mode: 'read' | 'edit';
  dirty: boolean;
}

export interface ActiveEdit {
  id: string;
  dom: HTMLElement;
  dirty: boolean;
  conflict: 'none' | 'disk-changed' | 'deleted';
  notice: { text: string; warn: boolean } | null;
}

/** What the Templates view renders for the active type (WO-024). */
export interface ActiveTpl {
  type: DocType;
  dom: HTMLElement;
  dirty: boolean;
  customized: boolean;
  conflict: 'none' | 'disk-changed';
  notice: { text: string; warn: boolean } | null;
}

/** Per-type template editing state; the island holds buffer and history. */
interface TplEdit {
  island: EditorIsland | null;
  dirty: boolean;
  conflict: 'none' | 'disk-changed';
  notice: { text: string; warn: boolean } | null;
  noticeTimer?: ReturnType<typeof setTimeout>;
}

/** Per-doc editing state (WO-022). The island holds the buffer, cursor, and
    undo history; this record holds what the shell renders around it. */
interface DocEdit {
  file: string;
  mode: 'read' | 'edit';
  island: EditorIsland | null;
  conflict: 'none' | 'disk-changed' | 'deleted';
  dirty: boolean;
  notice: { text: string; warn: boolean } | null;
  noticeTimer?: ReturnType<typeof setTimeout>;
}

class App implements Ctx {
  snap!: Snapshot;
  byId!: DocsById;
  issues!: Map<string, Issue[]>;
  advisories!: Map<string, Advisory[]>;
  pkg = new Map<string, CachedPackage>();
  api = api();
  state: State = {
    tabs: [],
    activeTabId: null,
    previewTabs: true,
    view: 'home',
    docId: null,
    expanded: new Set(),
    graphSel: null,
    editorText: '',
    editorFocused: false,
    copied: false,
    kickoffCopied: false,
    agentsOpen: false,
    agents: null,
    agentLaunching: null,
    agentLaunchMsg: null,
    pinned: [],
    recents: [],
    sectionCollapsed: { source: true },
    showDead: {},
    railTip: null,
    reviewPop: false,
    reviewText: null,
    toast: null,
    paletteOpen: false,
    paletteQuery: '',
    paletteSel: 0,
    paletteResult: null,
    projectSwitcherOpen: false,
    projectError: null,
    newProject: null,
    newDoc: null,
    closeConfirm: null,
    tplType: 'requirement',
    tplResetConfirm: false,
    projectNotice: null,
    mcpStatus: null,
    mcpWrote: false,
    mcpExternal: false,
    mcpBuildCopied: false,
    mcpCmdCopied: false,
    mcpVerify: null,
    mcpVerifyCopied: false,
    mcpPrecheck: null,
    welcomeNotice: null,
  };
  /** Editing state per doc tab (WO-022); islands survive re-renders here. */
  private docEdit = new Map<string, DocEdit>();
  /** Template settings (WO-024): per-type buffers and the last-read info.
      Info comes from core over IPC on every read — never a UI-side cache
      of customized-ness beyond the current render cycle. */
  private tplEdit = new Map<DocType, TplEdit>();
  private tplInfo = new Map<DocType, TemplateInfo>();
  private tplLoading = new Set<DocType>();
  private sessionActivity = new Map<string, ActivityRow[]>();
  private sessionFeed: Array<{ id: string; row: ActivityRow }> = [];
  /** Doc-tab activation order, most recent first — drives the Documents nav. */
  private docMru: string[] = [];
  private dragIdx: number | null = null;
  private pinDragIdx: number | null = null;
  /** The rendered palette rows' open actions, for the global Enter handler. */
  private palRowActions: Array<{ open(pinned: boolean): void }> = [];
  /** Caret position to restore after a name-edit re-render of the sheet. */
  private npNameCaret: number | null = null;
  /** Per-tab scroll positions (SRC-004 "State Management"), saved on re-render. */
  private scrollPos = new Map<string, number[]>();
  private sidebarScroll = 0;
  private renderedTabId: string | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | undefined;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private kickoffTimer: ReturnType<typeof setTimeout> | undefined;
  private mcpCmdTimer: ReturnType<typeof setTimeout> | undefined;
  private root: HTMLElement;
  private recentProjects: ProjectInfo[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
  }

  /** Cold-start mode (WO-030, SRC-013): no project is open, so no snapshot,
      no watchers, no sidebar — just the welcome screen and the create/open
      flows, which reload this window into the project they land on. */
  private welcomeMode = false;

  private bootWelcome(): void {
    this.welcomeMode = true;
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        this.welcomeOpenFolder();
      } else if (e.key === 'Enter' && this.state.newProject === null) {
        e.preventDefault();
        void this.startNewProject(false);
      } else if (e.key === 'Escape' && this.state.newProject !== null) {
        this.closeNewProject();
      }
    });
    this.render();
  }

  private welcomeOpenFolder(): void {
    this.update({ welcomeNotice: null });
    void this.guardIpc(() => this.api.welcomeOpen()).then((res) => {
      if (res === undefined || res === null || res.kind === 'opened') return;
      const text =
        res.kind === 'not-a-project'
          ? `No veri/ directory inside ${res.dir} — choose another, or create a new project there instead.`
          : res.message;
      this.update({ welcomeNotice: { text } });
    });
  }

  async boot(): Promise<void> {
    if (new URLSearchParams(location.search).get('welcome') === '1') {
      this.bootWelcome();
      return;
    }
    this.applySnapshot(await this.api.snapshot());
    // Workspace state must land before any openDoc call feeds the recents.
    const ws = await this.api.workspaceLoad();
    this.state.pinned = ws.pinned.filter((id) => this.byId.has(id));
    this.state.recents = ws.recents.filter((id) => this.byId.has(id));
    await this.refreshMcp();
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    const doc = params.get('doc');
    // "New project…" on a folder that already had veri/: it was opened, not
    // scaffolded, and the reload is the only channel that survives (SRC-007).
    if (params.get('notice') === 'existing') {
      this.state.projectNotice = 'Opened the existing project — veri/ was already here, nothing was written.';
      setTimeout(() => {
        if (this.state.projectNotice !== null) this.update({ projectNotice: null });
      }, 5000);
    }
    if (doc !== null && this.byId.has(doc)) this.openDoc(doc);
    if (view !== null && isViewKey(view)) this.applyTabs(openTab(this.tabState(), view));
    if (this.state.tabs.length === 0) {
      // Home is the default tab on project open (SRC-005 layer 4).
      this.applyTabs(openTab(this.tabState(), 'homeview', { preview: true, previewTabs: this.state.previewTabs }));
    }
    this.api.onChanged(() => void this.refresh());
    this.api.onMcpChanged((external) => {
      void this.refreshMcp().then(() => {
        if (external) this.update({ mcpExternal: true });
      });
    });
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.togglePalette();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        this.surfaceProjectError(this.api.openProjectFolder());
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (this.state.newProject === null) void this.startNewProject();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        // Plain ⌘N: new document, centered popover (SRC-008).
        e.preventDefault();
        if (this.state.newDoc === null) this.openNewDoc('requirement', null);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        this.toggleEditMode();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveActive();
      } else if (e.key === 'Escape' && this.state.newDoc !== null) {
        this.update({ newDoc: null });
      } else if (e.key === 'Escape' && this.state.closeConfirm !== null) {
        this.update({ closeConfirm: null });
      } else if (e.key === 'Escape' && this.state.tplResetConfirm) {
        this.update({ tplResetConfirm: false });
      } else if (e.key === 'Escape' && this.state.newProject !== null) {
        this.closeNewProject();
      } else if (e.ctrlKey && !e.metaKey && e.key === 'Tab') {
        // ⌃Tab / ⌃⇧Tab: cycle through the strip in order (SRC-004 recommended).
        e.preventDefault();
        this.applyTabs(cycleTab(this.tabState(), e.shiftKey ? -1 : 1));
      } else if (this.state.paletteOpen) {
        // ↑↓ / ↩ / ⌘↩ / esc while the palette is up (SRC-005 layer 2).
        if (e.key === 'Escape') {
          this.update({ paletteOpen: false });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.update({ paletteSel: Math.min(this.state.paletteSel + 1, Math.max(0, this.palRowActions.length - 1)) });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.update({ paletteSel: Math.max(0, this.state.paletteSel - 1) });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const row = this.palRowActions[Math.min(this.state.paletteSel, this.palRowActions.length - 1)];
          if (row !== undefined) row.open(e.metaKey || e.ctrlKey);
        }
      } else if (
        e.key === 'Escape' &&
        (this.state.projectSwitcherOpen ||
          this.state.agentsOpen ||
          this.state.projectError !== null ||
          this.state.projectNotice !== null)
      ) {
        this.update({ projectSwitcherOpen: false, agentsOpen: false, projectError: null, projectNotice: null });
      }
    });
    document.addEventListener('click', () => {
      if (
        this.state.projectSwitcherOpen ||
        this.state.agentsOpen ||
        this.state.projectError !== null ||
        this.state.projectNotice !== null ||
        this.state.newDoc !== null ||
        this.state.closeConfirm !== null
      ) {
        this.update({
          projectSwitcherOpen: false,
          agentsOpen: false,
          projectError: null,
          projectNotice: null,
          newDoc: null,
          closeConfirm: null,
        });
      }
    });
    this.render();
  }

  private applySnapshot(snap: Snapshot): void {
    this.snap = snap;
    this.byId = docsById(snap);
    this.issues = issuesByDoc(snap);
    this.advisories = advisoriesByDoc(snap);
    this.pkg.clear();
    // Tabs for deleted docs close like a × click — except a dirty editor,
    // whose tab stays for the Restore / Close choice (REQ-009 §5).
    const survives = (id: string): boolean => this.byId.has(id) || this.docEdit.get(id)?.dirty === true;
    Object.assign(this.state, this.activationPatch(retainTabs(this.tabState(), survives)));
    if (this.state.docId !== null && !survives(this.state.docId)) this.state.docId = null;
    // Editor state for tabs that no longer exist goes with them.
    for (const id of this.docEdit.keys()) {
      if (!this.state.tabs.some((t) => t.id === id)) this.dropEditor(id);
    }
  }

  private tabState(): TabState {
    return { tabs: this.state.tabs, activeTabId: this.state.activeTabId };
  }

  /**
   * The state that follows from a tab-strip change: derived view/doc for the
   * active tab, the Documents-nav MRU, and — only when the activation actually
   * moved — the per-tab transient resets (popovers, editor draft, feedback).
   */
  private activationPatch(next: TabState): Partial<State> {
    const patch: Partial<State> = { tabs: next.tabs, activeTabId: next.activeTabId };
    const active = next.activeTabId;
    if (active !== null) {
      if (isViewKey(active)) {
        patch.view = active;
      } else {
        patch.docId = active;
        patch.view = this.byId.get(active)?.type === 'work-order' ? 'workorder' : 'home';
        this.docMru = [active, ...this.docMru.filter((id) => id !== active)];
      }
    }
    if (active !== this.state.activeTabId) {
      Object.assign(patch, {
        graphSel: null,
        editorText: '',
        editorFocused: false,
        copied: false,
        kickoffCopied: false,
        agentsOpen: false,
        agentLaunchMsg: null,
        reviewPop: false,
        reviewText: null,
        tplResetConfirm: false,
      });
      if (active !== 'mcp') Object.assign(patch, this.leaveMcpPatch());
    }
    return patch;
  }

  private applyTabs(next: TabState, extra: Partial<State> = {}): void {
    this.update({ ...this.activationPatch(next), ...extra });
  }

  private firstDocId(): string | null {
    for (const type of TYPE_ORDER) {
      const docs = this.snap.documents.filter((d) => d.type === type).sort((a, b) => a.id.localeCompare(b.id));
      if (docs.length > 0) return docs[0].id;
    }
    return null;
  }

  doc(): VeriDocument | null {
    return this.state.docId !== null ? (this.byId.get(this.state.docId) ?? null) : null;
  }

  update(patch: Partial<State>): void {
    Object.assign(this.state, patch);
    this.render();
  }

  /** Doc navigation is tab navigation (SRC-004 rules 1–4). Default is a
      pinned link-open; browsing surfaces pass `preview`. Every doc open
      feeds the persisted recents (WO-014). */
  openDoc(id: string, opts: OpenDocOpts = {}): void {
    if (!this.byId.has(id)) return;
    this.applyTabs(openTab(this.tabState(), id, { ...opts, previewTabs: this.state.previewTabs }), {
      projectSwitcherOpen: false,
      recents: pushRecent(this.state.recents, id),
    });
    this.saveWorkspace();
  }

  togglePin(id: string): void {
    const pinned = this.state.pinned.includes(id)
      ? this.state.pinned.filter((p) => p !== id)
      : [...this.state.pinned, id];
    this.update({ pinned });
    this.saveWorkspace();
  }

  private reorderPin(from: number, to: number): void {
    if (from === to || from < 0 || to < 0 || from >= this.state.pinned.length || to >= this.state.pinned.length) return;
    const pinned = this.state.pinned.slice();
    const [moved] = pinned.splice(from, 1);
    pinned.splice(to, 0, moved);
    this.update({ pinned });
    this.saveWorkspace();
  }

  private saveWorkspace(): void {
    void this.api.workspaceSave({ pinned: this.state.pinned, recents: this.state.recents });
  }

  setView(view: View): void {
    const closed = { projectSwitcherOpen: false };
    if (view === 'home' || view === 'workorder') {
      // Documents nav: focus the most recent doc tab, else open the first doc as preview.
      const open = new Set(this.state.tabs.map((t) => t.id));
      const recent = this.docMru.find((id) => open.has(id)) ?? this.state.tabs.find((t) => !isViewKey(t.id))?.id;
      if (recent !== undefined) {
        this.applyTabs(activateTab(this.tabState(), recent), closed);
      } else {
        const first = this.firstDocId();
        if (first !== null) this.openDoc(first, { preview: true });
      }
      return;
    }
    this.applyTabs(openTab(this.tabState(), view, { preview: true, previewTabs: this.state.previewTabs }), closed);
  }

  /** Leaving the agent-connection panel dismisses its banners and drops the
      transient verify/pre-check results (SRC-002 — nothing is cached). */
  private leaveMcpPatch(): Partial<State> {
    return this.state.view === 'mcp'
      ? { mcpWrote: false, mcpExternal: false, mcpBuildCopied: false, mcpVerify: null, mcpVerifyCopied: false, mcpPrecheck: null }
      : {};
  }

  runVerify(): void {
    if (this.state.mcpVerify === 'busy') return;
    this.update({ mcpVerify: 'busy', mcpVerifyCopied: false });
    void this.api
      .verifyConnection()
      .then((result) => this.update({ mcpVerify: result }))
      .catch((err: unknown) => {
        this.update({ mcpVerify: { kind: 'no-answer', stderr: err instanceof Error ? err.message : String(err) } });
      });
  }

  private precheckInFlight = false;

  ensureRuntimePrecheck(): void {
    if (this.state.mcpPrecheck !== null || this.precheckInFlight) return;
    this.precheckInFlight = true;
    void this.api
      .runtimeProbe()
      .then((probe) => {
        this.precheckInFlight = false;
        // Only meaningful while the panel is still up; a later visit re-probes.
        if (this.state.view === 'mcp') this.update({ mcpPrecheck: probe });
      })
      .catch(() => {
        this.precheckInFlight = false;
      });
  }

  async refresh(): Promise<void> {
    this.applySnapshot(await this.api.snapshot());
    await this.reconcileEditors();
    await this.reconcileTemplates();
    this.render();
  }

  loadPackage(id: string): void {
    void this.api.context(id).then((pkg: ContextPackage) => {
      this.pkg.set(id, { text: pkg.text, summary: packageSummary(pkg.text) });
      this.render();
    });
  }

  async refreshMcp(): Promise<void> {
    this.state.mcpStatus = await this.api.mcpStatus();
    this.render();
  }

  flashCopied(): void {
    clearTimeout(this.copyTimer);
    this.update({ copied: true });
    this.copyTimer = setTimeout(() => this.update({ copied: false }), 1800);
  }

  flashToast(text: string): void {
    clearTimeout(this.toastTimer);
    this.update({ toast: text });
    this.toastTimer = setTimeout(() => this.update({ toast: null }), 2400);
  }

  /** Open = re-detect from disk/PATH right now (DEC-002: nothing cached). */
  toggleAgentPicker(): void {
    if (this.state.agentsOpen) {
      this.update({ agentsOpen: false });
      return;
    }
    this.update({ agentsOpen: true, agents: null, agentLaunchMsg: null });
    void this.api.agents().then((agents) => {
      if (this.state.agentsOpen) this.update({ agents });
    });
  }

  launchAgent(info: AgentInfo): void {
    const doc = this.doc();
    if (doc === null || info.binPath === null || this.state.agentLaunching !== null) return;
    const prompt = kickoffPrompt(doc.id, doc.title);
    this.update({ agentLaunching: info.id });
    void this.api.agentLaunch(info.id, info.binPath, prompt, info.status === 'not-connected').then((err) => {
      if (err === null) {
        this.sessionLog(doc.id, { agent: false, text: `Started a ${info.name} session`, time: 'today' });
        this.update({
          agentsOpen: false,
          agentLaunching: null,
          agentLaunchMsg: { ok: true, text: `✓ Launched ${info.name} — check your terminal` },
        });
        setTimeout(() => {
          if (this.state.agentLaunchMsg?.ok === true) this.update({ agentLaunchMsg: null });
        }, 4000);
      } else {
        // Picker stays open (SRC-003); the row's config state may have changed.
        this.update({
          agentLaunching: null,
          agentLaunchMsg: { ok: false, text: `Couldn't launch ${info.name} — ${err}. Copy the kickoff prompt instead.` },
        });
      }
    });
  }

  copyKickoff(): void {
    const doc = this.doc();
    if (doc === null) return;
    void this.api.copyText(kickoffPrompt(doc.id, doc.title)).then(() => {
      this.sessionLog(doc.id, { agent: false, text: 'Copied the kickoff prompt', time: 'today' });
      clearTimeout(this.kickoffTimer);
      this.update({ kickoffCopied: true, agentsOpen: false });
      this.kickoffTimer = setTimeout(() => this.update({ kickoffCopied: false }), 1800);
    });
  }

  flashMcpCmdCopied(): void {
    clearTimeout(this.mcpCmdTimer);
    this.update({ mcpCmdCopied: true });
    this.mcpCmdTimer = setTimeout(() => this.update({ mcpCmdCopied: false }), 1800);
  }

  sessionLog(id: string, row: ActivityRow): void {
    const rows = this.sessionActivity.get(id) ?? [];
    rows.unshift(row);
    this.sessionActivity.set(id, rows);
    this.sessionFeed.unshift({ id, row });
  }

  sessionRows(id: string): ActivityRow[] {
    return this.sessionActivity.get(id) ?? [];
  }

  sessionAll(): Array<{ id: string; row: ActivityRow }> {
    return this.sessionFeed;
  }

  rel = (date: string): string => relTime(date);

  // ---- direct editing (WO-022, SRC-008) ----

  editFor(id: string): EditState | null {
    const ed = this.docEdit.get(id);
    return ed === undefined ? null : { mode: ed.mode, dirty: ed.dirty };
  }

  setEditMode(id: string, mode: 'read' | 'edit'): void {
    const existing = this.docEdit.get(id);
    if (existing !== undefined) {
      existing.mode = mode;
      this.render();
      if (mode === 'edit') existing.island?.focus();
      return;
    }
    if (mode === 'read') return;
    const doc = this.byId.get(id);
    if (doc === undefined) return;
    const ed: DocEdit = { file: doc.file, mode: 'edit', island: null, conflict: 'none', dirty: false, notice: null };
    this.docEdit.set(id, ed);
    this.render(); // the editor column appears; the island lands when the read resolves
    void this.guardIpc(() => this.api.readDoc(doc.file)).then((text) => {
      if (text === undefined || !this.docEdit.has(id)) return;
      ed.island = new EditorIsland(doc.file, text ?? '', {
        docs: () => this.snap.documents.map((d) => ({ id: d.id, title: d.title, type: d.type })),
        onDirty: (dirty) => {
          ed.dirty = dirty;
          this.render();
        },
        onNotice: (text) => this.editNotice(id, text, true),
        onNavigate: (target) => this.openDoc(target, { background: true }),
      });
      if (text === null) ed.conflict = 'deleted';
      this.render();
      ed.island.focus();
    });
  }

  private toggleEditMode(): void {
    const id = this.state.activeTabId;
    if (id === null || isViewKey(id)) return;
    this.setEditMode(id, this.docEdit.get(id)?.mode === 'edit' ? 'read' : 'edit');
  }

  editView(): ActiveEdit | null {
    const id = this.state.activeTabId;
    if (id === null || isViewKey(id)) return null;
    const ed = this.docEdit.get(id);
    if (ed === undefined || ed.mode !== 'edit') return null;
    // The island loads async; an empty host renders for the in-between tick.
    const dom = ed.island?.view.dom ?? h('div', {});
    return { id, dom, dirty: ed.dirty, conflict: ed.conflict, notice: ed.notice };
  }

  private editNotice(id: string, text: string, warn: boolean): void {
    const ed = this.docEdit.get(id);
    if (ed === undefined) return;
    clearTimeout(ed.noticeTimer);
    ed.notice = { text, warn };
    ed.noticeTimer = setTimeout(() => {
      ed.notice = null;
      this.render();
    }, text === 'saved' ? 1500 : 3000);
    this.render();
  }

  saveActive(): void {
    const id = this.state.activeTabId;
    if (id === null) return;
    if (id === 'templates') {
      this.tplSave();
      return;
    }
    if (isViewKey(id)) return;
    this.saveEditor(id);
  }

  private saveEditor(id: string, then?: () => void): void {
    const ed = this.docEdit.get(id);
    if (ed?.island == null || (!ed.dirty && ed.conflict === 'none')) return;
    const island = ed.island;
    void this.api
      .saveDoc(ed.file, island.text)
      .then((result) => {
        island.markSaved(result.text);
        ed.conflict = 'none';
        ed.dirty = false;
        this.sessionLog(id, { agent: false, text: 'Edited in the app', time: 'today' });
        this.editNotice(id, 'saved', false);
        then?.();
      })
      .catch((err: unknown) => this.editNotice(id, ipcErrorMessage(err), true));
  }

  resolveConflict(action: 'reload' | 'keep' | 'restore' | 'closetab'): void {
    const id = this.state.activeTabId;
    if (id === null) return;
    const ed = this.docEdit.get(id);
    if (ed?.island == null) return;
    if (action === 'reload') {
      void this.api.readDoc(ed.file).then((disk) => {
        if (disk !== null) {
          ed.island?.markSaved(disk);
          ed.conflict = 'none';
          ed.dirty = false;
          this.editNotice(id, 'reloaded from disk', false);
        }
        this.render();
      });
    } else if (action === 'keep') {
      void this.api.readDoc(ed.file).then((disk) => {
        ed.island!.ackDisk = disk;
        ed.conflict = 'none';
        this.editNotice(id, 'kept your edits — ⌘S overwrites', false);
      });
    } else if (action === 'restore') {
      ed.dirty = true; // the buffer is the only copy; force the write through
      this.saveEditor(id);
    } else {
      this.forceCloseTab(id);
    }
  }

  /** External changes (REQ-009 §5): silent reload when clean, banner when
      dirty, restore offer when deleted. Runs on every snapshot refresh. */
  private async reconcileEditors(): Promise<void> {
    for (const [id, ed] of this.docEdit) {
      const doc = this.byId.get(id);
      if (doc !== undefined && doc.file !== ed.file) ed.file = doc.file; // renamed on disk
      const island = ed.island;
      if (island === null) continue;
      const disk = await this.api.readDoc(ed.file).catch(() => null);
      const action = reconcileDisk({ baseText: island.baseText, dirty: island.isDirty, ackDisk: island.ackDisk }, disk);
      if (action === 'reload' && disk !== null) {
        island.markSaved(disk);
        ed.conflict = 'none';
        ed.dirty = false;
        if (ed.mode === 'edit') this.editNotice(id, 'reloaded from disk', false);
      } else if (action === 'conflict') {
        ed.conflict = 'disk-changed';
        ed.mode = 'edit'; // the choice lives in the editor column
      } else if (action === 'deleted') {
        ed.conflict = 'deleted';
        ed.mode = 'edit';
      } else if (action === 'closed') {
        this.dropEditor(id);
      } else if (ed.conflict === 'deleted') {
        ed.conflict = 'none'; // the file came back (e.g. git checkout)
      }
    }
  }

  private dropEditor(id: string): void {
    const ed = this.docEdit.get(id);
    if (ed === undefined) return;
    clearTimeout(ed.noticeTimer);
    ed.island?.destroy();
    this.docEdit.delete(id);
  }

  /** Close ×/middle-click: a dirty editor gets the Save/Discard/Cancel
      prompt (SRC-008); everything else closes like before. */
  private requestCloseTab(id: string, anchor: DOMRect | null): void {
    if (this.docEdit.get(id)?.dirty === true || (id === 'templates' && this.tplAnyDirty())) {
      this.update({
        closeConfirm: { id, x: anchor?.left ?? window.innerWidth / 2 - 130, y: (anchor?.bottom ?? 60) + 8 },
      });
      return;
    }
    this.forceCloseTab(id);
  }

  private forceCloseTab(id: string): void {
    this.dropEditor(id);
    // Closing the Templates tab drops its buffers and infos: the next open
    // reads everything fresh from the files (DEC-002).
    if (id === 'templates') this.dropTemplates();
    this.applyTabs(closeTab(this.tabState(), id), { closeConfirm: null });
  }

  // ---- template settings (WO-024, SRC-009) ----

  tplChip(type: DocType): boolean | null {
    return this.tplInfo.get(type)?.customized ?? null;
  }

  /**
   * The Templates view's render source. Lazily starts the per-type info
   * reads (all five, for the list chips) and synchronously creates the
   * active type's island once its info is in — so the same render pass
   * that has the info also has the editor DOM.
   */
  tplView(): ActiveTpl | null {
    for (const type of TPL_TYPES) {
      if (!this.tplInfo.has(type) && !this.tplLoading.has(type)) {
        this.tplLoading.add(type);
        void this.api.templateRead(type).then((info) => {
          this.tplLoading.delete(type);
          this.tplInfo.set(type, info);
          this.render();
        });
      }
    }
    const type = this.state.tplType;
    const info = this.tplInfo.get(type);
    if (info === undefined) return null;
    let ed = this.tplEdit.get(type);
    if (ed === undefined) {
      ed = { island: null, dirty: false, conflict: 'none', notice: null };
      ed.island = new EditorIsland(`templates/${type}.md`, info.body, {
        // SRC-009: no `[[` autocomplete and no link navigation — templates
        // shouldn't hard-link real ids, so `[[` just types as text.
        docs: () => [],
        onDirty: (dirty) => {
          ed!.dirty = dirty;
          this.render();
        },
        onNotice: (text) => this.tplNotice(type, text, true),
        onNavigate: () => {},
      });
      this.tplEdit.set(type, ed);
    }
    return {
      type,
      dom: ed.island?.view.dom ?? h('div', {}),
      dirty: ed.dirty,
      customized: info.customized,
      conflict: ed.conflict,
      notice: ed.notice,
    };
  }

  tplSelect(type: DocType): void {
    this.update({ tplType: type, tplResetConfirm: false });
    this.tplEdit.get(type)?.island?.focus();
  }

  private tplNotice(type: DocType, text: string, warn: boolean): void {
    const ed = this.tplEdit.get(type);
    if (ed === undefined) return;
    clearTimeout(ed.noticeTimer);
    ed.notice = { text, warn };
    ed.noticeTimer = setTimeout(() => {
      ed.notice = null;
      this.render();
    }, warn ? 3000 : 1500);
    this.render();
  }

  tplSave(): void {
    this.tplSaveType(this.state.tplType);
  }

  /** Verbatim write of the type's buffer, then a fresh info read so the
      chips recompute from the file — never from what we think we wrote. */
  private tplSaveType(type: DocType, then?: () => void): void {
    const ed = this.tplEdit.get(type);
    if (ed?.island == null || (!ed.dirty && ed.conflict === 'none')) return;
    const island = ed.island;
    void this.api
      .templateWrite(type, island.text)
      .then(async () => {
        const info = await this.api.templateRead(type);
        this.tplInfo.set(type, info);
        island.markSaved(info.body);
        ed.conflict = 'none';
        ed.dirty = false;
        this.tplNotice(type, 'saved', false);
        then?.();
      })
      .catch((err: unknown) => this.tplNotice(type, ipcErrorMessage(err), true));
  }

  /** The close prompt's Save for the templates tab: every dirty type. */
  private tplSaveAll(then: () => void): void {
    const dirtyTypes = TPL_TYPES.filter((type) => this.tplEdit.get(type)?.dirty === true);
    if (dirtyTypes.length === 0) {
      then();
      return;
    }
    let remaining = dirtyTypes.length;
    for (const type of dirtyTypes) {
      this.tplSaveType(type, () => {
        remaining -= 1;
        if (remaining === 0) then();
      });
    }
  }

  private tplAnyDirty(): boolean {
    return [...this.tplEdit.values()].some((ed) => ed.dirty);
  }

  tplSetResetConfirm(open: boolean): void {
    this.update({ tplResetConfirm: open });
  }

  /** Confirmed reset (SRC-009): rewrite the file to the built-in default. */
  tplReset(): void {
    const type = this.state.tplType;
    void this.api
      .templateReset(type)
      .then(async () => {
        const info = await this.api.templateRead(type);
        this.tplInfo.set(type, info);
        const ed = this.tplEdit.get(type);
        ed?.island?.markSaved(info.body);
        if (ed !== undefined) {
          ed.dirty = false;
          ed.conflict = 'none';
        }
        this.update({ tplResetConfirm: false });
      })
      .catch((err: unknown) => this.tplNotice(type, ipcErrorMessage(err), true));
  }

  tplResolveConflict(action: 'reload' | 'keep'): void {
    const type = this.state.tplType;
    const ed = this.tplEdit.get(type);
    if (ed?.island == null) return;
    const island = ed.island;
    void this.api.templateRead(type).then((info) => {
      this.tplInfo.set(type, info);
      if (action === 'reload') {
        island.markSaved(info.body);
        ed.dirty = false;
        ed.conflict = 'none';
        this.tplNotice(type, 'reloaded from disk', false);
      } else {
        island.ackDisk = info.body;
        ed.conflict = 'none';
        this.tplNotice(type, 'kept your edits — ⌘S overwrites', false);
      }
    });
  }

  /** External template changes ride the same veri/ watcher as documents:
      silent reload when clean, banner when dirty. A deleted file is not a
      conflict — its effective body is the built-in default (DEC-023). */
  private async reconcileTemplates(): Promise<void> {
    if (!this.state.tabs.some((t) => t.id === 'templates')) return;
    for (const type of [...this.tplInfo.keys()]) {
      const info = await this.api.templateRead(type).catch(() => null);
      if (info === null) continue;
      this.tplInfo.set(type, info);
      const ed = this.tplEdit.get(type);
      const island = ed?.island ?? null;
      if (ed == null || island === null) continue;
      const action = reconcileDisk(
        { baseText: island.baseText, dirty: island.isDirty, ackDisk: island.ackDisk },
        info.body,
      );
      if (action === 'reload') {
        island.markSaved(info.body);
        ed.dirty = false;
        ed.conflict = 'none';
        this.tplNotice(type, 'reloaded from disk', false);
      } else if (action === 'conflict') {
        ed.conflict = 'disk-changed';
      }
    }
  }

  private dropTemplates(): void {
    for (const ed of this.tplEdit.values()) {
      clearTimeout(ed.noticeTimer);
      ed.island?.destroy();
    }
    this.tplEdit.clear();
    this.tplInfo.clear();
  }

  // ---- document creation (REQ-009 §2, SRC-008) ----

  openNewDoc(type: DocType, anchor: { x: number; y: number } | null): void {
    this.update({ newDoc: { type, title: '', anchor }, projectSwitcherOpen: false, paletteOpen: false });
  }

  private submitNewDoc(): void {
    const nd = this.state.newDoc;
    if (nd === null || nd.title.trim() === '') return;
    void this.guardIpc(() => this.api.createDoc(nd.type, nd.title)).then((result) => {
      if (result === undefined) return;
      void this.refresh().then(() => {
        this.update({ newDoc: null });
        this.openDoc(result.id); // pinned, per SRC-008
        this.setEditMode(result.id, 'edit');
        this.sessionLog(result.id, { agent: false, text: 'Created in the app', time: 'today' });
      });
    });
  }

  // ---- rendering ----

  private topbar(): HTMLElement {
    const issueCount = this.snap.issues.length;
    const git = this.snap.git;
    // Deep-links to Home, whose HEALTH card is the full issue list (WO-015).
    const healthChip =
      issueCount > 0
        ? h(
            'div',
            { class: 'tb-health', onClick: () => this.setView('homeview') },
            h('span', { class: 'tb-health-dot' }),
            h('span', {}, `veri check · ${issueCount} issue${issueCount === 1 ? '' : 's'}`),
          )
        : null;

    return h(
      'div',
      { class: 'topbar' },
      h(
        'div',
        { class: 'tb-brand' },
        h('div', { class: 'tb-logo' }, 'v'),
        h('span', { class: 'tb-wordmark' }, 'Veri'),
        h('span', { class: 'tb-slash' }, '/'),
        h(
          'div',
          {
            class: this.state.projectSwitcherOpen ? 'tb-proj-btn tb-proj-btn-open' : 'tb-proj-btn',
            onClick: (e) => {
              e.stopPropagation();
              this.toggleProjectSwitcher();
            },
          },
          h('span', { class: 'tb-proj-name' }, this.snap.projectName),
          h('span', { class: 'tb-proj-caret' }, '▾'),
        ),
        this.state.projectSwitcherOpen ? this.projectSwitcherPopover() : null,
        this.state.projectError !== null
          ? h(
              'div',
              { class: 'proj-err', onClick: (e) => e.stopPropagation() },
              h('span', { class: 'proj-err-dot' }),
              h('span', {}, this.state.projectError),
            )
          : null,
        this.state.projectNotice !== null
          ? h(
              'div',
              { class: 'proj-notice', onClick: (e) => e.stopPropagation() },
              h('span', { class: 'proj-notice-dot' }),
              h('span', {}, this.state.projectNotice),
            )
          : null,
      ),
      h(
        'div',
        { class: 'tb-center' },
        h(
          'div',
          {
            class: 'tb-search',
            onClick: () => {
              if (!this.state.paletteOpen) this.togglePalette();
            },
          },
          h('span', {}, 'Search docs…'),
          h('span', { class: 'tb-kbd' }, '⌘K'),
        ),
      ),
      h('div', { class: 'tb-right' }, healthChip, h(
        'div',
        { class: 'tb-git' },
        h('span', { style: 'color:#7FAF8A;' }, '⎇'),
        h('span', {}, git === null ? 'no git' : `${git.branch} · ${git.dirty ? 'dirty' : 'clean'}`),
      )),
    );
  }

  private toggleProjectSwitcher(): void {
    const opening = !this.state.projectSwitcherOpen;
    if (opening) {
      void this.api.listRecentProjects().then((projects) => {
        this.recentProjects = projects;
        this.render();
      });
    }
    this.update({ projectSwitcherOpen: opening, projectError: null });
  }

  /** Show the error a switch/open attempt resolves to (null means success or cancel). */
  private surfaceProjectError(result: Promise<string | null>): void {
    void result.then((err) => {
      if (err !== null) this.update({ projectError: err });
    });
  }

  // ---- new project (WO-018, SRC-007) ----

  /**
   * Step 1: the native picker. A folder that already has veri/ is opened by
   * the main process (the window reloads, so nothing more to do here); a
   * fresh folder raises the creation sheet.
   */
  private async startNewProject(demo = false): Promise<void> {
    // `demo` pre-enables the sample-seed toggle (SRC-013's one behavioral
    // delta from SRC-007) — the sheet still shows the write and the toggle
    // stays interactive.
    this.update({ projectSwitcherOpen: false, welcomeNotice: null });
    const pick = await this.guardIpc(() => this.api.newProjectPick());
    if (pick === undefined || pick === null || pick.kind === 'opened') return;
    if (pick.kind === 'error') {
      this.update({ projectError: pick.message });
      return;
    }
    this.update({ newProject: { dir: pick.dir, name: pick.name, demo, busy: false, error: null } });
  }

  /**
   * Run an IPC call so a rejection lands in the UI instead of vanishing as an
   * unhandled promise. The case that bit: a main process older than the
   * renderer has no handler for a new channel, and every click looks dead.
   * Returns undefined when the call failed.
   */
  private async guardIpc<T>(call: () => Promise<T>): Promise<T | undefined> {
    try {
      return await call();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.update({
        projectError: /No handler registered/i.test(message)
          ? 'This window is newer than the running app — quit and reopen Veri to finish the update.'
          : message,
      });
      return undefined;
    }
  }

  /** Step 1 again, from the sheet's "Change…" — keeps the toggle as set. */
  private async changeNewProjectDir(): Promise<void> {
    const pick = await this.guardIpc(() => this.api.newProjectPick());
    if (pick === undefined || pick === null || pick.kind === 'opened') return;
    if (pick.kind === 'error') {
      this.update({ projectError: pick.message, newProject: null });
      return;
    }
    const np = this.state.newProject;
    this.update({
      newProject: { dir: pick.dir, name: pick.name, demo: np?.demo ?? false, busy: false, error: null },
    });
  }

  /** Step 2: scaffold and open. On failure the sheet stays up and the MRU is
      untouched — the main process only records the project after a good write. */
  private async createProject(): Promise<void> {
    const np = this.state.newProject;
    if (np === null || np.busy || !isValidProjectName(np.name)) return;
    this.update({ newProject: { ...np, busy: true, error: null } });
    // The composed target, not the picked dir (WO-020): scaffoldProject's
    // recursive mkdir creates the subfolder, and the MRU entry is recorded
    // for the final target — so its name is the final folder's (DEC-010).
    const err = await this.guardIpc(() => this.api.createProject(composeTarget(np.dir, np.name), np.demo));
    if (err === undefined) {
      // guardIpc already surfaced it; just release the sheet's controls.
      const stuck = this.state.newProject;
      if (stuck !== null) this.update({ newProject: { ...stuck, busy: false } });
      return;
    }
    if (err === null) return; // the window is reloading into the new project
    const current = this.state.newProject;
    if (current !== null) this.update({ newProject: { ...current, busy: false, error: err } });
  }

  private newProjectSheet(): HTMLElement | null {
    const np = this.state.newProject;
    if (np === null) return null;
    // The name only composes the target (SRC-007 addendum): the location
    // line and the preview always show the full final write, live — that
    // contract is what disambiguates in-place vs subfolder; no mode toggle.
    const target = composeTarget(np.dir, np.name);
    const validName = isValidProjectName(np.name);
    const prefix = validName && target !== np.dir ? `${np.name}/` : '';
    const tree =
      np.demo
        ? [
            h('span', {}, `${prefix}veri/  ·  the skiff demo project\n`),
            h('span', {}, `${prefix}README.md      `),
            h('span', { class: 'np-skip' }, '← skipped if one already exists\n'),
            h('span', {}, `${prefix}CLAUDE.md      `),
            h('span', { class: 'np-skip' }, '← skipped if one already exists'),
          ]
        : [
            h(
              'span',
              {},
              `${prefix}veri/requirements/\n${prefix}veri/decisions/\n${prefix}veri/work-orders/\n${prefix}veri/sources/`,
            ),
          ];
    const nameInput = h('input', {
      class: 'np-name-input',
      value: np.name,
      disabled: np.busy,
      onInput: (e) => {
        const el = e.target as HTMLInputElement;
        this.npNameCaret = el.selectionStart;
        this.update({ newProject: { ...np, name: el.value } });
      },
    }) as HTMLInputElement;
    nameInput.spellcheck = false;
    const caret = this.npNameCaret;
    if (caret !== null) {
      this.npNameCaret = null;
      queueMicrotask(() => {
        nameInput.focus();
        nameInput.setSelectionRange(caret, caret);
      });
    }
    return h(
      'div',
      { class: 'np-scrim', onClick: () => this.closeNewProject() },
      h(
        'div',
        { class: 'np-sheet', onClick: (e) => e.stopPropagation() },
        h('div', { class: 'micro-label' }, 'NEW PROJECT'),
        h(
          'div',
          { class: 'np-loc' },
          h('span', { class: 'np-path' }, h('bdi', {}, target)),
          h(
            'span',
            {
              class: np.busy ? 'np-change np-disabled' : 'np-change',
              onClick: () => {
                if (!np.busy) void this.changeNewProjectDir();
              },
            },
            'Change…',
          ),
        ),
        h(
          'div',
          { class: 'np-name-line' },
          h('span', { class: 'np-name-label' }, 'Project name'),
          nameInput,
        ),
        h('div', { class: 'np-name-help' }, 'A different name creates a new folder inside the chosen location.'),
        h(
          'div',
          {
            class: np.busy ? 'np-toggle np-disabled' : 'np-toggle',
            onClick: () => {
              if (!np.busy) this.update({ newProject: { ...np, demo: !np.demo } });
            },
          },
          h('span', { class: np.demo ? 'np-sw np-sw-on' : 'np-sw' }, h('i', {})),
          h(
            'div',
            {},
            h('div', { class: 'np-toggle-main' }, 'Seed with the skiff demo project'),
            h(
              'div',
              { class: 'np-toggle-sub' },
              '16 documents from a sample invoicing app — the same content ',
              h('code', {}, 'veri init --demo'),
              ' installs.',
            ),
          ),
        ),
        h('div', { class: 'np-tree' }, ...tree),
        np.error !== null
          ? h(
              'div',
              { class: 'np-err' },
              h('span', { class: 'np-err-dot' }),
              h(
                'div',
                {},
                h('span', {}, "Couldn't create the project — nothing was written, and your project list is unchanged."),
                h('code', {}, np.error),
              ),
            )
          : null,
        h(
          'div',
          { class: 'np-acts' },
          h(
            'button',
            { class: 'np-btn np-btn-ghost', disabled: np.busy, onClick: () => this.closeNewProject() },
            'Cancel',
          ),
          h(
            'button',
            { class: 'np-btn np-btn-primary', disabled: np.busy || !validName, onClick: () => void this.createProject() },
            np.busy ? 'Creating…' : 'Create project',
          ),
        ),
      ),
    );
  }

  private closeNewProject(): void {
    if (this.state.newProject?.busy === true) return;
    this.update({ newProject: null });
  }

  private projectSwitcherPopover(): HTMLElement {
    const rows = this.recentProjects.map((p) => {
      const current = p.dir === this.snap.root;
      const meta = `${p.dir} · ${p.docCount} doc${p.docCount === 1 ? '' : 's'}${p.issueCount > 0 ? ` · ${p.issueCount} issue${p.issueCount === 1 ? '' : 's'}` : ''}`;
      return h(
        'div',
        {
          class: current ? 'proj-row proj-row-current' : 'proj-row',
          onClick: () => {
            this.update({ projectSwitcherOpen: false });
            if (!current) this.surfaceProjectError(this.api.switchProject(p.dir));
          },
        },
        h('span', { class: 'proj-swatch', style: `background:${p.accentColor};` }),
        h(
          'div',
          { class: 'proj-info' },
          h(
            'div',
            { class: 'proj-name-line' },
            h('span', { class: 'proj-name' }, p.name),
            p.issueCount > 0 ? h('span', { class: 'proj-issue-dot' }) : null,
          ),
          h('div', { class: 'proj-meta' }, meta),
        ),
        current ? h('span', { class: 'proj-check' }, '✓') : null,
      );
    });
    return h(
      'div',
      { class: 'proj-pop', onClick: (e) => e.stopPropagation() },
      h('div', { class: 'proj-pop-label' }, 'PROJECTS'),
      ...rows,
      h('div', { class: 'proj-divider' }),
      h(
        'div',
        {
          class: 'proj-open-row',
          onClick: () => {
            this.update({ projectSwitcherOpen: false });
            this.surfaceProjectError(this.api.openProjectFolder());
          },
        },
        // Open keeps its position (muscle memory) but yields '+' to New
        // project below it, where the glyph means what it says (SRC-007).
        h('span', { class: 'proj-open-plus' }, '→'),
        h('span', {}, 'Open project folder…'),
        h('span', { class: 'proj-kbd' }, '⌘O'),
      ),
      h(
        'div',
        { class: 'proj-open-row', onClick: () => void this.startNewProject() },
        h('span', { class: 'proj-open-plus' }, '+'),
        h('span', {}, 'New project…'),
        h('span', { class: 'proj-kbd' }, '⇧⌘N'),
      ),
    );
  }

  // ---- command palette (WO-013, SRC-005 layer 2) ----

  private togglePalette(): void {
    if (this.state.paletteOpen) {
      this.update({ paletteOpen: false });
      return;
    }
    this.update({ paletteOpen: true, paletteQuery: '', paletteSel: 0, paletteResult: null });
    this.fetchPalette('');
  }

  /** docMru feeds the recency boost ("recently opened docs rank higher"). */
  private fetchPalette(q: string): void {
    void this.api.paletteSearch(q, this.docMru).then((result) => {
      if (this.state.paletteOpen && this.state.paletteQuery === q) this.update({ paletteResult: result });
    });
  }

  /** Open semantics mirror the tabs design: Enter/click = shared preview tab,
      palette closes; ⌘Enter/⌘click = pinned tab in background, palette stays. */
  private openPaletteRow(row: PaletteRow, pinned: boolean): void {
    if (row.kind === 'command') {
      // ⌘↩ means nothing for an action row — treat it as a plain activation.
      this.update({ paletteOpen: false });
      void this.startNewProject();
    } else if (row.kind === 'view') {
      this.applyTabs(openTab(this.tabState(), row.view, { preview: true, previewTabs: this.state.previewTabs }), {
        paletteOpen: false,
      });
    } else if (pinned) {
      this.openDoc(row.hit.id, { background: true });
    } else {
      this.openDoc(row.hit.id, { preview: true });
      this.update({ paletteOpen: false });
    }
  }

  private paletteRowEl(row: PaletteRow, i: number, sel: boolean): HTMLElement {
    const doc = row.kind === 'doc' ? row.hit : null;
    const meta = doc !== null ? TYPE_META[doc.type as VeriDocument['type']] : undefined;
    const chipStyle =
      meta !== undefined ? `color:${meta.color};background:${tint(meta.color)};` : 'color:#8B8893;background:#1B1B20;';
    const snippet = doc?.snippet ?? null;
    return h(
      'div',
      {
        class: sel ? 'pal-row pal-row-sel' : 'pal-row',
        onClick: (e) => this.openPaletteRow(row, row.kind === 'doc' && (e.metaKey || e.ctrlKey)),
        onMouseenter: () => {
          if (this.state.paletteSel !== i) this.update({ paletteSel: i });
        },
      },
      doc !== null && (doc.status === 'proposed' || (doc.type === 'requirement' && doc.status === 'draft'))
        ? h('span', { class: 'sb-pending', title: 'Awaiting review' })
        : null,
      h('span', { class: 'pal-chip', style: chipStyle }, doc !== null ? doc.id : (row as { glyph: string }).glyph),
      h(
        'div',
        { class: 'pal-main' },
        h(
          'div',
          { class: 'pal-title-line' },
          h('span', { class: 'pal-title' }, doc !== null ? doc.title : (row as { label: string }).label),
          h(
            'span',
            { class: 'pal-status', style: `color:${doc !== null ? statusColor(doc.status) : '#55525E'};` },
            doc !== null ? doc.status : row.kind === 'command' ? 'command' : 'view',
          ),
        ),
        snippet !== null ? h('div', { class: 'pal-snippet' }, snippet) : null,
      ),
      sel ? h('span', { class: 'pal-enter' }, '↩') : null,
    );
  }

  private paletteEl(): HTMLElement | null {
    if (!this.state.paletteOpen) {
      this.palRowActions = [];
      return null;
    }
    const result = this.state.paletteResult ?? { query: { text: '', type: null, statuses: [] }, hits: [] };
    const rows = paletteRows(result);
    const sel = Math.min(this.state.paletteSel, Math.max(0, rows.length - 1));
    this.palRowActions = rows.map((row) => ({ open: (pinned: boolean) => this.openPaletteRow(row, pinned) }));
    const input = h('input', {
      class: 'pal-input',
      placeholder: 'Search docs or jump to a view — try req: is:backlog',
      value: this.state.paletteQuery,
      onInput: (e) => {
        const q = (e.target as HTMLInputElement).value;
        this.state.paletteQuery = q;
        this.state.paletteSel = 0;
        this.fetchPalette(q);
      },
    }) as HTMLInputElement;
    queueMicrotask(() => input.focus());
    return h(
      'div',
      { class: 'pal-scrim', onClick: () => this.update({ paletteOpen: false }) },
      h(
        'div',
        { class: 'pal-panel', onClick: (e) => e.stopPropagation() },
        h('div', { class: 'pal-head' }, h('span', { class: 'pal-glyph' }, '⌕'), input, h('span', { class: 'pal-esc' }, 'esc')),
        h(
          'div',
          { class: 'pal-list' },
          ...rows.map((row, i) => this.paletteRowEl(row, i, i === sel)),
          rows.length === 0
            ? h(
                'div',
                { class: 'pal-empty' },
                'No matches — try an id, title text, or a filter like ',
                h('span', { class: 'pal-empty-code' }, 'wo: is:backlog'),
              )
            : null,
        ),
        h(
          'div',
          { class: 'pal-foot' },
          h('span', {}, '↑↓ navigate'),
          h('span', {}, '↩ open'),
          h('span', {}, '⌘↩ open pinned tab'),
          h('span', { class: 'pal-foot-grammar' }, 'req: dec: wo: src: · is:proposed is:active is:done'),
        ),
      ),
    );
  }

  /**
   * Icon rail (WO-014): one 32×32 button per view plus the agent-connection
   * button after the flex filler. Custom instant tooltips — native title has
   * a ~1s delay that hurts icon-only nav. Clicks open preview view tabs.
   */
  private rail(): HTMLElement {
    const tip = (key: string, label: string): HTMLElement | null =>
      this.state.railTip === key ? h('span', { class: 'rail-tip' }, label) : null;
    const hover = (key: string) => ({
      onMouseenter: () => {
        if (this.state.railTip !== key) this.update({ railTip: key });
      },
      onMouseleave: () => {
        if (this.state.railTip === key) this.update({ railTip: null });
      },
    });
    const items: Array<[View, string, string]> = [
      ['homeview', 'Home', '⌂'],
      ['board', 'Board', '▤'],
      ['graph', 'Graph', '◉'],
      ['decisions', 'Decisions', '§'],
    ];
    const { healthy, label } = this.mcpSummary();
    return h(
      'div',
      { class: 'rail' },
      ...items.map(([key, name, glyph]) =>
        h(
          'div',
          {
            class: this.state.activeTabId === key ? 'rail-btn rail-btn-active' : 'rail-btn',
            onClick: () => this.setView(key),
            ...hover(key),
          },
          h('span', {}, glyph),
          tip(key, name),
        ),
      ),
      h('div', { class: 'rail-fill' }),
      // Templates settings (WO-024, SRC-009): above the agent button.
      h(
        'div',
        {
          class: this.state.activeTabId === 'templates' ? 'rail-btn rail-btn-active' : 'rail-btn rail-agent',
          onClick: () => this.setView('templates'),
          ...hover('templates'),
        },
        h('span', {}, '⚙'),
        tip('templates', 'Templates'),
      ),
      h(
        'div',
        {
          class: this.state.activeTabId === 'mcp' ? 'rail-btn rail-agent rail-agent-active' : 'rail-btn rail-agent',
          onClick: () => this.setView('mcp'),
          ...hover('mcp'),
        },
        h('span', {}, '⌁'),
        h('span', { class: 'rail-dot', style: `background:${healthy ? '#7FAF8A' : '#D9A03F'};` }),
        tip('mcp', label),
      ),
    );
  }

  /** Honest config state of the agent connection — a static dot (no pulse:
      a pulse would imply liveness), never live client status. */
  private mcpSummary(): { healthy: boolean; label: string } {
    const status = this.state.mcpStatus;
    const notSetup = status === null || status.state === 'missing' || status.state === 'no-entry';
    const healthy = status !== null && status.state === 'ok' && status.executableFound && status.rootMatches;
    const label = notSetup
      ? 'agent connection · not set up'
      : healthy
        ? 'agent connection · configured'
        : 'agent connection · needs attention';
    return { healthy, label };
  }

  /** One PINNED/RECENT row: id chip + title, plus unpin ✕ and drag reorder
      for pins. Clicks keep preview semantics like every browsing surface. */
  private workingSetRow(id: string, pin: { index: number } | null): HTMLElement | null {
    const doc = this.byId.get(id);
    if (doc === undefined) return null;
    const meta = TYPE_META[doc.type];
    return h(
      'div',
      {
        class: 'sb-row',
        draggable: pin !== null,
        onClick: (e) => this.openDoc(id, { preview: true, background: e.metaKey || e.ctrlKey }),
        ...(pin !== null
          ? {
              onDragstart: () => {
                this.pinDragIdx = pin.index;
              },
              onDragover: (e: DragEvent) => {
                e.preventDefault();
                if (this.pinDragIdx !== null && this.pinDragIdx !== pin.index) {
                  this.reorderPin(this.pinDragIdx, pin.index);
                  this.pinDragIdx = pin.index;
                }
              },
              onDrop: (e: DragEvent) => e.preventDefault(),
            }
          : {}),
      },
      h('span', { class: 'sb-row-id', style: `color:${meta.color};` }, id),
      h('span', { class: 'sb-row-title' }, doc.title),
      pin !== null
        ? h(
            'span',
            {
              class: 'sb-unpin',
              title: 'Unpin',
              onClick: (e) => {
                e.stopPropagation();
                this.togglePin(id);
              },
            },
            '✕',
          )
        : null,
    );
  }

  private sidebar(): HTMLElement {
    // Rule 9: the sidebar highlight tracks the active tab, not browsing history.
    const activeTab = this.state.activeTabId;

    const pinnedRows = this.state.pinned.map((id, i) => this.workingSetRow(id, { index: i })).filter((r) => r !== null);
    const recentRows = visibleRecents(this.state.recents, this.state.pinned)
      .map((id) => this.workingSetRow(id, null))
      .filter((r) => r !== null);

    // Ghost hint rows (WO-030, SRC-013): one per empty type section, hint by
    // default, the action on hover (CSS swap). Exists exactly while the
    // section has zero documents — derived from the snapshot, nothing stored.
    const GHOST_HINT: Record<string, string> = {
      requirement: 'What must be true',
      decision: 'What was chosen, and why',
      'work-order': 'Work an agent can pick up',
      source: 'Evidence brought in',
    };

    const tree = TYPE_ORDER.map((type) => {
      const all = this.snap.documents.filter((d) => d.type === type);
      const meta = TYPE_META[type];
      const showDead = this.state.showDead[type] === true;
      const collapsed = this.state.sectionCollapsed[type] === true;
      const sec = treeSection(this.snap.documents, type, showDead);
      const ghostRow =
        all.length === 0 && !collapsed
          ? h(
              'div',
              {
                class: 'sb-ghost',
                onClick: (e) => {
                  e.stopPropagation();
                  const rect = (e.currentTarget as Element).getBoundingClientRect();
                  this.openNewDoc(type, { x: rect.left, y: rect.bottom + 6 });
                },
              },
              h('span', { class: 'sb-ghost-plus' }, '+'),
              h('span', { class: 'sb-ghost-hint' }, GHOST_HINT[type] ?? ''),
              h('span', { class: 'sb-ghost-action' }, `New ${meta.label}…`),
            )
          : null;
      const rows = collapsed
        ? []
        : sec.shown.map((d) => {
            const active = activeTab === d.id;
            const health = (this.issues.get(d.id) ?? []).length > 0;
            const advisoryCount = (this.advisories.get(d.id) ?? []).length;
            const dead = !isLiving(d);
            const pending = isPending(d);
            return h(
              'div',
              {
                class: active ? 'sb-row sb-row-active' : 'sb-row',
                title: pending ? 'Awaiting review' : undefined,
                onClick: (e) => this.openDoc(d.id, { preview: true, background: e.metaKey || e.ctrlKey }),
              },
              pending ? h('span', { class: 'sb-pending' }) : null,
              h('span', { class: 'sb-row-id', style: `color:${meta.color};` }, d.id),
              h('span', { class: active ? 'sb-row-title sb-row-title-active' : 'sb-row-title' }, d.title),
              // One indicator per row, amber issue dot > done ✓ > advisory ring (SRC-010).
              health ? h('span', { class: 'sb-health' }) : null,
              !health && dead ? h('span', { class: 'sb-done' }, '✓') : null,
              !health && !dead && advisoryCount > 0
                ? h('span', {
                    class: 'sb-ring',
                    title: `${advisoryCount} advisor${advisoryCount === 1 ? 'y' : 'ies'} — see document`,
                  })
                : null,
            );
          });
      const expander =
        collapsed || sec.deadCount === 0
          ? null
          : h(
              'div',
              {
                class: 'sb-more',
                onClick: () =>
                  this.update({ showDead: { ...this.state.showDead, [type]: !showDead } }),
              },
              h('span', { class: 'sb-more-chev' }, showDead ? '▾' : '▸'),
              h('span', {}, showDead ? `hide ${DEAD_LABEL[type]}` : `${sec.deadCount} ${DEAD_LABEL[type]}`),
            );
      return h(
        'div',
        { class: 'sb-group' },
        h(
          'div',
          {
            class: 'sb-group-head',
            onClick: () =>
              this.update({ sectionCollapsed: { ...this.state.sectionCollapsed, [type]: !collapsed } }),
          },
          h('span', { class: 'sb-swatch', style: `background:${meta.color};` }),
          h('span', { class: 'sb-group-label' }, meta.group),
          h('span', { class: 'sb-group-count' }, String(sec.livingCount)),
          h(
            'span',
            {
              class: 'sb-add',
              title: `New ${meta.label}`,
              onClick: (e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as Element).getBoundingClientRect();
                this.openNewDoc(type, { x: rect.left, y: rect.bottom + 6 });
              },
            },
            '+',
          ),
        ),
        ...rows,
        ghostRow,
        expander,
      );
    });

    return h(
      'div',
      { class: 'sidebar' },
      h(
        'div',
        { class: 'sb-tree' },
        pinnedRows.length > 0
          ? h('div', { class: 'sb-sec' }, h('div', { class: 'sb-sec-label' }, 'PINNED'), ...pinnedRows)
          : null,
        recentRows.length > 0
          ? h('div', { class: 'sb-sec' }, h('div', { class: 'sb-sec-label' }, 'RECENT'), ...recentRows)
          : null,
        h('div', { class: 'sb-tree-divider' }),
        ...tree,
      ),
    );
  }

  /** One tab: type-colored id chip (docs) or glyph (views), ellipsized title
      — italic for the preview tab — and the close ×. All SRC-004 gestures. */
  private tabEl(t: Tab, i: number): HTMLElement {
    const view = isViewKey(t.id) ? VIEW_META[t.id] : null;
    const doc = view === null ? this.byId.get(t.id) : undefined;
    const title = view?.label ?? doc?.title ?? t.id;
    const active = t.id === this.state.activeTabId;
    const dirty = this.docEdit.get(t.id)?.dirty === true || (t.id === 'templates' && this.tplAnyDirty());
    const close = (el: Element | null): void => this.requestCloseTab(t.id, el?.getBoundingClientRect() ?? null);
    return h(
      'div',
      {
        class: `tab${active ? ' tab-active' : ''}${t.preview ? ' tab-preview' : ''}${dirty ? ' tab-dirty' : ''}`,
        title: (view !== null ? title : `${t.id} — ${title}`) + (t.preview ? ' · preview — double-click to keep open' : ''),
        draggable: true,
        onClick: () => this.applyTabs(activateTab(this.tabState(), t.id)),
        onDblclick: () => this.applyTabs(pinTab(activateTab(this.tabState(), t.id), t.id)),
        onMousedown: (e) => {
          if (e.button === 1) {
            e.preventDefault();
            close(e.currentTarget as Element);
          }
        },
        onDragstart: (e) => {
          this.dragIdx = i;
          if (e.dataTransfer !== null) e.dataTransfer.effectAllowed = 'move';
        },
        onDragover: (e) => {
          e.preventDefault();
          if (this.dragIdx !== null && this.dragIdx !== i) {
            this.applyTabs(reorderTab(this.tabState(), this.dragIdx, i));
            this.dragIdx = i;
          }
        },
        onDrop: (e) => e.preventDefault(),
      },
      h(
        'span',
        { class: 'tab-id', style: `color:${view !== null ? '#8B8893' : TYPE_META[doc!.type].color};` },
        view?.glyph ?? t.id,
      ),
      h('span', { class: 'tab-title' }, title),
      h(
        'span',
        {
          class: 'tab-close',
          title: dirty ? 'Unsaved changes — close tab' : 'Close tab',
          onClick: (e) => {
            e.stopPropagation();
            close(e.currentTarget as Element);
          },
        },
        // VS Code semantics (SRC-008): the dirty dot sits where × was; CSS
        // swaps them back on hover.
        h('span', { class: 'tab-close-x' }, '×'),
        h('span', { class: 'tab-dirty-dot' }),
      ),
    );
  }

  private tabStrip(): HTMLElement {
    return h(
      'div',
      { class: 'tabstrip' },
      ...this.state.tabs.map((t, i) => this.tabEl(t, i)),
      h('div', { class: 'tabstrip-fill' }),
    );
  }

  private emptyState(): HTMLElement {
    return h(
      'div',
      { class: 'empty-tabs' },
      h(
        'div',
        {},
        h('div', { class: 'empty-tabs-label' }, 'NO OPEN TABS'),
        h(
          'div',
          { class: 'empty-tabs-hint' },
          'Pick a document from the sidebar',
          h('br', {}),
          'or press ',
          h('span', { class: 'empty-tabs-kbd' }, '⌘K'),
          ' to search',
        ),
      ),
    );
  }

  /** The active view's scrollable regions, in document order. */
  private static readonly SCROLL_SEL = '.reader, .panel-right, .screen-board, .screen-decisions, .screen-homeview, .mcp-view';

  render(): void {
    if (this.welcomeMode) {
      // Errors from the create/open IPC surface as the inline notice — the
      // welcome screen has no topbar to host projectError.
      const notice = this.state.welcomeNotice ?? (this.state.projectError !== null ? { text: this.state.projectError } : null);
      const sheet = this.newProjectSheet();
      this.root.replaceChildren(
        welcomeView({
          notice,
          createNew: (demo) => void this.startNewProject(demo),
          openExisting: () => this.welcomeOpenFolder(),
        }),
        ...(sheet !== null ? [sheet] : []),
      );
      return;
    }
    // Save the outgoing DOM's scroll positions (per tab, plus the sidebar tree)
    // so full re-renders and tab switches restore them (SRC-004 expectation).
    const oldTree = this.root.querySelector('.sb-tree');
    if (oldTree !== null) this.sidebarScroll = oldTree.scrollTop;
    if (this.renderedTabId !== null) {
      this.scrollPos.set(
        this.renderedTabId,
        Array.from(this.root.querySelectorAll(App.SCROLL_SEL), (el) => el.scrollTop),
      );
    }
    // Editor islands lose their scroll when replaceChildren detaches them.
    for (const ed of this.docEdit.values()) ed.island?.saveScroll();
    for (const ed of this.tplEdit.values()) ed.island?.saveScroll();

    const view = this.state.view;
    const activeEdit = this.editView();
    let screen: HTMLElement;
    if (this.state.tabs.length === 0) screen = this.emptyState();
    else if (activeEdit !== null) screen = editorScreen(this, activeEdit);
    else if (view === 'workorder' && this.doc()?.type === 'work-order') screen = workOrderView(this);
    else if (view === 'homeview') screen = homeView(this);
    else if (view === 'mcp') screen = mcpView(this);
    else if (view === 'board') screen = boardView(this);
    else if (view === 'graph') screen = graphView(this);
    else if (view === 'decisions') screen = decisionsView(this);
    else if (view === 'templates') screen = templatesView(this);
    else screen = readerView(this);
    const palette = this.paletteEl();
    const sheet = this.newProjectSheet();
    const toast = this.state.toast !== null ? h('div', { class: 'toast' }, this.state.toast) : null;
    this.root.replaceChildren(
      this.topbar(),
      h('div', { class: 'body' }, this.rail(), this.sidebar(), h('div', { class: 'editor-area' }, this.tabStrip(), screen)),
      ...(palette !== null ? [palette] : []),
      ...(sheet !== null ? [sheet] : []),
      ...(toast !== null ? [toast] : []),
      ...this.editPopovers(),
    );
    this.state.editorFocused = false;

    const newTree = this.root.querySelector('.sb-tree');
    if (newTree !== null) newTree.scrollTop = this.sidebarScroll;
    this.renderedTabId = this.state.tabs.length === 0 ? null : this.state.activeTabId;
    const saved = this.renderedTabId !== null ? this.scrollPos.get(this.renderedTabId) : undefined;
    if (saved !== undefined) {
      this.root.querySelectorAll(App.SCROLL_SEL).forEach((el, i) => {
        if (saved[i] !== undefined) el.scrollTop = saved[i];
      });
    }
    if (activeEdit !== null) this.docEdit.get(activeEdit.id)?.island?.restoreScroll();
    if (view === 'templates') this.tplEdit.get(this.state.tplType)?.island?.restoreScroll();
  }

  /** The creation popover and the dirty-close prompt (WO-022, SRC-008). */
  private editPopovers(): HTMLElement[] {
    const out: HTMLElement[] = [];
    const nd = this.state.newDoc;
    if (nd !== null) {
      const input = h('input', {
        class: 'nd-title',
        placeholder: 'Title',
        value: nd.title,
        onInput: (e) => {
          // No render: the popover stays put while the user types.
          nd.title = (e.target as HTMLInputElement).value;
        },
        onKeydown: (e) => {
          if (e.key === 'Enter') this.submitNewDoc();
        },
      }) as HTMLInputElement;
      queueMicrotask(() => input.focus());
      const prefixes = { requirement: 'REQ', decision: 'DEC', 'work-order': 'WO', source: 'SRC' } as const;
      const segs = (['requirement', 'decision', 'work-order', 'source'] as const).map((type) => {
        const meta = TYPE_META[type];
        const on = nd.type === type;
        return h(
          'span',
          {
            class: on ? 'nd-seg nd-seg-on' : 'nd-seg',
            style: on ? `color:${meta.color};background:${tint(meta.color)};` : undefined,
            onClick: () => this.update({ newDoc: { ...nd, title: input.value, type } }),
          },
          prefixes[type],
        );
      });
      const style =
        nd.anchor !== null
          ? `top:${Math.min(nd.anchor.y, window.innerHeight - 220)}px;left:${Math.min(nd.anchor.x, window.innerWidth - 340)}px;`
          : 'top:30%;left:calc(50% - 160px);';
      out.push(
        h(
          'div',
          { class: 'nd-pop', style, onClick: (e) => e.stopPropagation() },
          h('div', { class: 'micro-label' }, 'NEW DOCUMENT'),
          h('div', { class: 'nd-segs' }, ...segs),
          input,
          h(
            'div',
            { class: 'nd-acts' },
            h('button', { class: 'nd-btn-ghost', onClick: () => this.update({ newDoc: null }) }, 'Cancel'),
            h('button', { class: 'nd-btn-primary', onClick: () => this.submitNewDoc() }, 'Create'),
          ),
        ),
      );
    }
    const cc = this.state.closeConfirm;
    if (cc !== null) {
      const style = `top:${cc.y}px;left:${Math.max(8, Math.min(cc.x - 120, window.innerWidth - 268))}px;`;
      out.push(
        h(
          'div',
          { class: 'cc-pop', style, onClick: (e) => e.stopPropagation() },
          h('div', { class: 'cc-title' }, 'Unsaved changes'),
          h(
            'div',
            { class: 'cc-text' },
            cc.id === 'templates' ? "Template edits aren't saved." : `${cc.id} has edits that aren't saved.`,
          ),
          h(
            'div',
            { class: 'cc-acts' },
            h('button', { class: 'nd-btn-ghost', onClick: () => this.update({ closeConfirm: null }) }, 'Cancel'),
            h('button', { class: 'nd-btn-ghost', onClick: () => this.forceCloseTab(cc.id) }, 'Discard'),
            h(
              'button',
              {
                class: 'nd-btn-primary',
                onClick: () => {
                  this.update({ closeConfirm: null });
                  if (cc.id === 'templates') this.tplSaveAll(() => this.forceCloseTab(cc.id));
                  else this.saveEditor(cc.id, () => this.forceCloseTab(cc.id));
                },
              },
              'Save',
            ),
          ),
        ),
      );
    }
    return out;
  }
}

const app = new App(document.getElementById('app')!);
void app.boot();
// Console/debug handle (used by the screenshot harness's VERI_UI_EVAL).
(window as unknown as Record<string, unknown>)['__veriApp'] = app;
