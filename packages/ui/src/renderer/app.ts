/** App shell: state, topbar, sidebar, view switching, IPC wiring. */
import type { Advisory, DocType, Issue, VeriDocument } from '@verikb/core';
import { compareIds } from '@verikb/core/ids';
import type { ContextPackage, PaletteResult } from '@verikb/mcp';
import type { Snapshot } from '../lib/snapshot.ts';
import { api } from './api.ts';
import type { AppInfo, ProjectInfo, TemplateInfo, ThemePref, UpdateStatus, VeriApi } from './api.ts';
import { h } from './dom.ts';
import { TYPE_META, relTime, statusColor, tint } from './theme.ts';
import { advisoriesByDoc, docsById, isPending, issuesByDoc, packageSummary } from './derive.ts';
import { composeTarget, isValidProjectName } from './newproject.ts';
import { baseNames, commitRequests, confirmLabel, formatLabel, nextSrcNumber, provisionalIds, sheetFromInspect, sizeLabel, toastText } from './importlogic.ts';
import type { ImportSheet } from './importlogic.ts';
import type { CommittedSource } from './api.ts';
import type { ActivityRow, DocsById, PackageSummary } from './derive.ts';
import type { McpStatus } from '../lib/mcpconfig.ts';
import type { RuntimeProbe } from '../lib/noderuntime.ts';
import type { VerifyResult } from '../lib/verify.ts';
import type { AgentInfo } from '../lib/agents.ts';
import { importKickoffPrompt, kickoffPrompt } from './derive.ts';
import { readerView } from './views/reader.ts';
import { architectureView } from './views/architecture.ts';
import { homeView } from './views/home.ts';
import { importView } from './views/import.ts';
import { welcomeView } from './views/welcome.ts';
import { workOrderView } from './views/workorder.ts';
import { searchView } from './views/search.ts';
import {
  VIEW_META,
  activateTab,
  activeTab,
  activeTarget,
  back,
  closeTab,
  currentTarget,
  cycleTab,
  forward,
  isViewKey,
  pinTab,
  reorderTab,
} from './tabs.ts';
import type { Entry, Surface, Tab, TabState } from './tabs.ts';
import {
  anyEntryPanes,
  clampRatio,
  focusPane,
  navigateFocused,
  openBeside,
  persistPanes,
  restorePanes,
  retainPanes,
  setPane,
  singlePane,
} from './panes.ts';
import type { PaneState } from './panes.ts';
import { EditorIsland } from './editor.ts';
import { clampFind, currentIndex, findReduce, matchRanges, segmentMatches } from './findlogic.ts';
import type { FindBarState, MatchRange, SegMatch } from './findlogic.ts';
import { clearFind, collectParts, findBarEl, paintFind, scrollFindMatch, updateFindBar } from './find.ts';
import type { FindBarRefs } from './find.ts';
import { FOCUSABLE_SEL, resolveFocus, roveIndex, roveKey, trapTarget } from './a11y.ts';
import { dismissPreview, resetChipKeys, setPreviewRoot } from './widgets.ts';
import { ipcErrorMessage, reconcileDisk } from './editlogic.ts';
import { editorScreen } from './views/editor.ts';
import { paletteRows } from './palette.ts';
import type { PaletteRow } from './palette.ts';
import { TPL_TYPES } from './views/templates.ts';
import { settingsView } from './views/settings.ts';
import { DEAD_LABEL, livingCount, livingGroups, panelList, pushRecent } from './sidebar.ts';

export type View = 'home' | 'workorder' | 'homeview' | 'search' | 'settings' | 'import' | 'architecture';

/** Sections of the Settings view (WO-036, SRC-014). */
export type SettingsSection = 'templates' | 'agent' | 'project' | 'updates' | 'appearance';

export interface OpenDocOpts {
  preview?: boolean;
  background?: boolean;
}

export interface State {
  /** Split panes (WO-055, SRC-027): one or two tab surfaces side by side,
      each a complete TabState (SRC-004, SRC-018 mechanics per pane). */
  panes: TabState[];
  /** The focused pane drives everything single-valued — sidebar highlight,
      crumb, editView, per-view transients. */
  focusedPane: number;
  /** Divider position as the first pane's fraction; session state, persisted
      additively while split (WO-055). */
  paneRatio: number;
  /** SRC-004 settings flag — false makes every click open a pinned tab. */
  previewTabs: boolean;
  /** Derived from the active tab; views keep reading these. */
  view: View;
  docId: string | null;
  expanded: Set<string>;
  editorText: string;
  editorFocused: boolean;
  /** Reader links editor (WO-056, SRC-028): the frontmatter card's links row
      expanded flag and the add-link draft — per-doc transients, reset when
      the focused tab's target changes. */
  linksOpen: boolean;
  linkAdd: LinkAddState | null;
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
  /** Type panel (WO-035, SRC-014): open collection, live filter, and the
      dead-doc expander — session state, never persisted. */
  panel: DocType | null;
  panelFilter: string;
  showDead: Partial<Record<DocType, boolean>>;
  /** Settings popover at the sidebar foot (WO-036): transient, grouped. */
  settingsPop: boolean;
  /** The Settings view's open section — session state, never persisted. */
  settingsSection: SettingsSection;
  /** Review banner (SRC-006): approve-confirm popover and note composer. */
  reviewPop: boolean;
  /** Non-null while the request-changes composer is open; holds its draft. */
  reviewText: string | null;
  /** Transient bottom-center toast (SRC-006 approve/return feedback). */
  toast: string | null;
  /** Status-change undo toast (WO-061): one-click revert of the last change. */
  undoToast: { docId: string; from: string; to: string } | null;
  /** File import (WO-096, SRC-045): basenames while an OS drag hovers the
      window — the drop overlay's chips. Null when no drag is in flight. */
  dragImport: string[] | null;
  /** Non-null while the import review sheet is up. */
  importSheet: ImportSheet | null;
  /** Freshly imported source ids, highlighted transiently in the panel. */
  flashRows: string[];
  /** Post-import toast: the count line plus jump links to the new docs
      beyond the one already opened. */
  importToast: { text: string; others: CommittedSource[] } | null;
  /** Command palette (WO-013): overlay flag, raw query, selection, ranked result. */
  paletteOpen: boolean;
  paletteQuery: string;
  paletteSel: number;
  paletteResult: PaletteResult | null;
  /** Search view (WO-048, SRC-022): the singleton tab's one query and its
      ranked result — same grammar and scores as the palette, unsliced. */
  searchQuery: string;
  searchResult: PaletteResult | null;
  projectSwitcherOpen: boolean;
  projectError: string | null;
  /** Non-null while the New project sheet is up (WO-018, SRC-007). */
  newProject: NewProjectState | null;
  /** New-document popover (WO-022, SRC-008): type + title, nothing else.
      `anchor` is the sidebar `+` position; null centers it (⌘N). */
  newDoc: { type: DocType; title: string; anchor: { x: number; y: number } | null } | null;
  /** Save/Discard/Cancel prompt for dropping dirty buffers (SRC-008,
      SRC-018): the docs (and template edits) that would be orphaned. What
      Save/Discard go on to do — close a tab, or reload into another project
      (WO-054, SRC-026) — is the shell's `confirmThen`; Cancel aborts it. */
  closeConfirm: { docs: string[]; settings: boolean; x: number; y: number } | null;
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
  /** Import view (WO-075, SRC-039): copy flash and the prompt disclosure —
      transient; every durable import state derives from files (DEC-068). */
  importKickoffCopied: boolean;
  importPromptOpen: boolean;
  /** START HERE's "Start from scratch" collapse — session-only (SRC-039). */
  importOfferDismissed: boolean;
  /** Find bar (WO-057, SRC-029): bound to the focused pane's active doc
      tab; query and cursor are transient — never persisted. Null = closed. */
  find: FindBarState | null;
  /** Connections-rail overlay flag per pane index (WO-064, SRC-034): the
      user's expand choice in a narrow pane — session state, never persisted.
      Meaningless while the pane is wide (the rail is inline there). */
  connOpen: boolean[];
  /** Architecture view (WO-068, SRC-036): the internal Map|Rules tab, the
      selected module, and the contents drill-down path — session state,
      never persisted, like the Search view's query. */
  archTab: 'map' | 'rules';
  archSel: string | null;
  archDrill: string[];
}

/** The add-link inline row (WO-056): target + rel drafts, the inline error,
    and a one-shot focus request consumed by the render that honors it. */
export interface LinkAddState {
  target: string;
  rel: string;
  error: string | null;
  focus: 'target' | 'rel' | null;
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
  /** Open the Settings tab at a section (WO-036: popover rows, sub-nav). */
  openSettings(section: SettingsSection): void;
  /** Static launch facts for the Settings view; null until the IPC lands. */
  appInfo: AppInfo | null;
  /** Theme (WO-060, SRC-032): the stored preference and the resolved mode. */
  themePref: ThemePref;
  renderDark: boolean;
  setTheme(pref: ThemePref): void;
  /** What the background updater has done; refreshed on Updates opens. */
  updStatus: UpdateStatus | null;
  /** Pin/unpin a doc in the sidebar working set (WO-014). */
  togglePin(id: string): void;
  /** Live type crumb (WO-039): open a collection's type panel. */
  openPanel(type: DocType): void;
  /** Search view (WO-048): update the singleton query and refetch; `caret`
      is restored after the result-driven re-render. */
  setSearchQuery(q: string, caret: number | null): void;
  /** One-shot focus/caret request for the Search view's query field —
      consumed by the render that honors it. */
  svInput(): { focus: boolean; caret: number | null };
  refresh(): Promise<void>;
  loadPackage(id: string): void;
  refreshMcp(): Promise<void>;
  toggleAgentPicker(): void;
  launchAgent(info: AgentInfo): void;
  copyKickoff(): void;
  /** Import view (WO-075): open it, and copy the import kickoff (DEC-067). */
  openImport(): void;
  /** Architecture view (WO-068): the Home card, ⌘K, and every
      `architecture ↗` affordance land here — provisional entry points per
      SRC-036; nothing else may depend on how the view was reached. */
  openArchitecture(tab?: 'map' | 'rules'): void;
  copyImportKickoff(): void;
  flashCopied(): void;
  /** Show a transient bottom-center toast (auto-dismissed). */
  flashToast(text: string): void;
  /** Offer one-click undo after a status change (WO-061). */
  flashUndo(docId: string, from: string, to: string): void;
  /** Write into the one polite live region (SRC-019 rule 4). */
  announce(text: string): void;
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
  /** The pane index the current view build renders into (WO-064): set by
      paneEl around each screen build, 0 outside a split. Lets a view key
      per-pane transients (the Connections-rail overlay) without the pane
      layer leaking into view signatures. */
  renderPane: number;
}

const TYPE_ORDER = ['requirement', 'decision', 'work-order', 'source'] as const;

/** ⌘[ etc. stay out of text-editing surfaces (CM6 binds Mod-[ to indent). */
function inTextTarget(e: KeyboardEvent): boolean {
  return e.target instanceof Element && e.target.closest('.cm-editor, input, textarea') !== null;
}

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
    panes: singlePane().panes,
    focusedPane: 0,
    paneRatio: 0.5,
    previewTabs: true,
    view: 'home',
    docId: null,
    expanded: new Set(),
    editorText: '',
    editorFocused: false,
    linksOpen: false,
    linkAdd: null,
    copied: false,
    kickoffCopied: false,
    agentsOpen: false,
    agents: null,
    agentLaunching: null,
    agentLaunchMsg: null,
    pinned: [],
    recents: [],
    panel: null,
    panelFilter: '',
    showDead: {},
    settingsPop: false,
    settingsSection: 'templates',
    reviewPop: false,
    reviewText: null,
    toast: null,
    undoToast: null,
    dragImport: null,
    importSheet: null,
    flashRows: [],
    importToast: null,
    paletteOpen: false,
    paletteQuery: '',
    paletteSel: 0,
    paletteResult: null,
    searchQuery: '',
    searchResult: null,
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
    importKickoffCopied: false,
    importPromptOpen: false,
    importOfferDismissed: false,
    find: null,
    connOpen: [false, false],
    archTab: 'map',
    archSel: null,
    archDrill: [],
  };
  renderPane = 0;
  appInfo: AppInfo | null = null;
  // Seeded from the first-paint query param; corrected by themeGet on boot.
  themePref: ThemePref = 'system';
  renderDark = document.documentElement.dataset['theme'] !== 'light';
  updStatus: UpdateStatus | null = null;
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
  /** Tab-drag origin: the strip (pane) and index the drag started in. */
  private dragIdx: { pane: number; idx: number } | null = null;
  /** The rendered palette rows' open actions, for the global Enter handler. */
  private palRowActions: Array<{ open(pinned: boolean): void }> = [];
  /** Caret position to restore after a name-edit re-render of the sheet. */
  private npNameCaret: number | null = null;
  /** Per pane, the history entry the current DOM was rendered for — scroll
      positions are captured into it (by reference) before every re-render,
      so back/forward restore them (SRC-018 history rule 4). Scoped per pane
      container (WO-055): a split doubles every SCROLL_SEL match, so capture
      walks each pane's own subtree, aligned by pane index. */
  private renderedEntries: Array<Entry | null> = [];
  /** A pane-focus flip happened on mousedown without a render (WO-055);
      the deferred render runs after the click lands. */
  private paneFocusPending = false;
  private copyTimer: ReturnType<typeof setTimeout> | undefined;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private undoTimer: ReturnType<typeof setTimeout> | undefined;
  private flashRowsTimer: ReturnType<typeof setTimeout> | undefined;
  private importToastTimer: ReturnType<typeof setTimeout> | undefined;
  private kickoffTimer: ReturnType<typeof setTimeout> | undefined;
  private mcpCmdTimer: ReturnType<typeof setTimeout> | undefined;
  private root: HTMLElement;
  private recentProjects: ProjectInfo[] = [];
  /** The one polite live region (SRC-019 rule 4). Lives on <body>, outside
      the rebuilt tree, so announcements survive replaceChildren. */
  private live: HTMLElement;
  /** Find bar (WO-057): the read-mode walk of the rendered pane (nodes,
      parts, matches), rebuilt whenever render() rebuilds the DOM. */
  private findRead: { nodes: Text[]; parts: { text: string; breakBefore: boolean }[]; matches: SegMatch[] } | null = null;
  /** Edit-mode match set over the island's buffer — same pure matcher, so
      both backends count identically. */
  private findEditRanges: MatchRange[] = [];
  private findTotal = 0;
  /** Live bar handles: typing and stepping patch count/buttons in place —
      no re-render, so the input keeps its caret and CM6 its scroll. */
  private findRefs: FindBarRefs | null = null;
  /** One-shot focus request for the bar's input, consumed by the build. */
  private fbFocus = false;
  /** Layer kinds present in the last render, for open/close detection. */
  private renderedLayers: string[] = [];
  /** Invoker fkey per open layer; focus returns there on close (SRC-019). */
  private layerInvoker = new Map<string, string | null>();

  constructor(root: HTMLElement) {
    this.root = root;
    this.live = h('div', { class: 'sr-live', live: 'polite' });
    document.body.append(this.live);
  }

  announce(text: string): void {
    // Clear-then-set so repeating the same message re-announces.
    this.live.textContent = '';
    queueMicrotask(() => {
      this.live.textContent = text;
    });
  }

  /**
   * The open transient layers, topmost first (SRC-019 rule 3): Escape closes
   * the head of this list, Tab cycles inside the first trapping entry, and
   * focus restoration on close uses the invoker recorded when it opened.
   */
  private layerDefs(): Array<{ kind: string; sel: string; trap: boolean; initial?: string; close(): void }> {
    const layers: Array<{ kind: string; sel: string; trap: boolean; initial?: string; close(): void }> = [];
    if (this.state.closeConfirm !== null)
      layers.push({ kind: 'closeConfirm', sel: '.cc-pop', trap: true, close: () => this.update({ closeConfirm: null }) });
    if (this.state.newDoc !== null)
      layers.push({ kind: 'newDoc', sel: '.nd-pop', trap: true, initial: 'nd-title', close: () => this.update({ newDoc: null }) });
    if (this.state.tplResetConfirm)
      layers.push({ kind: 'tplReset', sel: '.tpl-reset-confirm', trap: true, initial: 'tpl-reset-no', close: () => this.update({ tplResetConfirm: false }) });
    if (this.state.reviewPop)
      layers.push({ kind: 'reviewPop', sel: '.rv-pop', trap: true, close: () => this.update({ reviewPop: false }) });
    if (this.state.paletteOpen)
      layers.push({ kind: 'palette', sel: '.pal-panel', trap: true, initial: 'pal-input', close: () => this.update({ paletteOpen: false }) });
    if (this.state.newProject !== null)
      layers.push({ kind: 'newProject', sel: '.np-sheet', trap: true, initial: 'np-name', close: () => this.closeNewProject() });
    if (this.state.importSheet !== null)
      layers.push({ kind: 'importSheet', sel: '.imp-sheet', trap: true, initial: 'imp-cancel', close: () => this.closeImportSheet() });
    if (this.state.settingsPop)
      layers.push({ kind: 'settingsPop', sel: '.settings-pop', trap: true, close: () => this.update({ settingsPop: false }) });
    if (this.state.projectSwitcherOpen)
      layers.push({ kind: 'projSwitcher', sel: '.proj-pop', trap: true, close: () => this.update({ projectSwitcherOpen: false }) });
    if (this.state.agentsOpen)
      layers.push({ kind: 'agents', sel: '.ap-pop', trap: true, close: () => this.update({ agentsOpen: false }) });
    if (this.state.find !== null)
      // Non-trapping, above the type panel: Escape in the bar closes the
      // bar (and only the bar), per SRC-029; popovers still close first.
      layers.push({ kind: 'find', sel: '.fb-bar', trap: false, close: () => this.closeFind() });
    if (this.state.panel !== null)
      layers.push({ kind: 'panel', sel: '.typepanel', trap: false, close: () => this.update({ panel: null }) });
    return layers;
  }

  /** Escape: close the topmost layer; with none open, dismiss notices. */
  private handleEscape(): boolean {
    const top = this.layerDefs()[0];
    if (top !== undefined) {
      top.close();
      return true;
    }
    if (this.state.projectError !== null || this.state.projectNotice !== null) {
      this.update({ projectError: null, projectNotice: null });
      return true;
    }
    return false;
  }

  /** Tab inside the topmost trapping layer cycles instead of leaving. */
  private trapTab(e: KeyboardEvent): boolean {
    const top = this.layerDefs().find((l) => l.trap);
    if (top === undefined) return false;
    const host = this.root.querySelector(top.sel);
    if (host === null) return false;
    const els = Array.from(host.querySelectorAll<HTMLElement>(FOCUSABLE_SEL));
    if (els.length === 0) return false;
    const keys = els.map((el, i) => el.dataset['fkey'] ?? `#${i}`);
    const cur = els.indexOf(document.activeElement as HTMLElement);
    const target = trapTarget(keys, cur === -1 ? null : keys[cur], e.shiftKey);
    if (target === null) return false;
    e.preventDefault();
    els[keys.indexOf(target)].focus();
    return true;
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

  /** Theme wiring (WO-060): runs for both the project and welcome paths. */
  private async initTheme(): Promise<void> {
    const state = await this.api.themeGet();
    this.themePref = state.pref;
    this.applyResolvedTheme(state.dark);
    this.api.onThemeChanged((dark) => this.applyResolvedTheme(dark));
  }

  /** Flip the token layer; idempotent, instant, every surface is CSS-driven. */
  private applyResolvedTheme(dark: boolean): void {
    if (dark) delete document.documentElement.dataset['theme'];
    else document.documentElement.dataset['theme'] = 'light';
    if (dark !== this.renderDark) {
      this.renderDark = dark;
      this.render();
    }
  }

  setTheme(pref: ThemePref): void {
    this.themePref = pref;
    this.announce(`Theme: ${pref}`);
    this.render();
    void this.api.themeSet(pref).then((state) => {
      this.themePref = state.pref;
      this.applyResolvedTheme(state.dark);
      this.render();
    });
  }

  async boot(): Promise<void> {
    void this.initTheme();
    if (new URLSearchParams(location.search).get('welcome') === '1') {
      this.bootWelcome();
      return;
    }
    this.applySnapshot(await this.api.snapshot());
    // Workspace state must land before any openDoc call feeds the recents.
    const ws = await this.api.workspaceLoad();
    this.state.pinned = ws.pinned.filter((id) => this.byId.has(id));
    this.state.recents = ws.recents.filter((id) => this.byId.has(id));
    // Restore the persisted open set (WO-054, SRC-026): unresolvable targets
    // drop, at most one preview tab, single-entry history each. The split's
    // second list and ratio restore additively (WO-055) — absent or emptied,
    // it collapses to one pane. Assigned directly rather than through
    // applyPanes so the restore itself never echoes a save back into the
    // file; the query params below still win.
    if (ws.tabs !== undefined && ws.tabs.length > 0) {
      const restored = restorePanes(ws.tabs, ws.active, ws.tabs2, ws.active2, (id) => this.byId.has(id));
      if (restored.panes.some((p) => p.tabs.length > 0)) Object.assign(this.state, this.activationPatch(restored));
      if (ws.ratio !== undefined) this.state.paneRatio = ws.ratio;
    }
    await this.refreshMcp();
    void this.api.appInfo().then((info) => {
      this.appInfo = info;
      this.render();
    });
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
    if (view !== null && isViewKey(view)) {
      this.applyPanes(navigateFocused(this.paneState(), view, { surface: 'preview', previewTabs: false }));
    }
    if (this.state.panes.every((p) => p.tabs.length === 0)) {
      // Home is the default tab on project open (SRC-005 layer 4).
      this.applyPanes(
        navigateFocused(this.paneState(), 'homeview', { surface: 'preview', previewTabs: this.state.previewTabs }),
      );
    }
    this.api.onChanged(() => void this.refresh());
    // OS file drags (WO-096): the shell forwards native drag-drop, since
    // HTML5 drop events are suppressed by the webview handler (DEC-095).
    this.api.onDragHover((paths) => {
      if (this.state.importSheet === null && paths.length > 0) this.update({ dragImport: baseNames(paths) });
    });
    this.api.onDragCancel(() => {
      if (this.state.dragImport !== null) this.update({ dragImport: null });
    });
    this.api.onDragDrop((paths) => {
      this.update({ dragImport: null });
      if (this.state.importSheet === null) void this.openImportSheet(paths);
    });
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
        this.guardDirtyReload(() => this.surfaceProjectError(this.api.openProjectFolder()));
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
      } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
        // ⌘F: find in the focused pane's active document (WO-057, SRC-029).
        e.preventDefault();
        this.openFindBar();
      } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key === '\\') {
        // ⌘\ "Open beside" (WO-055, SRC-027): the focused pane's current
        // entry opens in the other pane, which takes focus.
        e.preventDefault();
        this.applyPanes(openBeside(this.paneState()));
      } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key === '[' || e.key === ']') && !inTextTarget(e)) {
        // ⌘[ / ⌘] walk the active tab's history (WO-039); the CM6 editor
        // keeps its own Mod-[ indent bindings, hence the target guard.
        e.preventDefault();
        this.applyTabs(e.key === '[' ? back(this.tabState()) : forward(this.tabState()));
      } else if (e.altKey && !e.metaKey && !e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !inTextTarget(e)) {
        // The platform equivalent off-mac (SRC-018).
        e.preventDefault();
        this.applyTabs(e.key === 'ArrowLeft' ? back(this.tabState()) : forward(this.tabState()));
      } else if (e.key === 'Escape') {
        // One rule for every transient layer (SRC-019): topmost closes first.
        if (this.handleEscape()) e.preventDefault();
      } else if (e.ctrlKey && !e.metaKey && e.key === 'Tab') {
        // ⌃Tab / ⌃⇧Tab: cycle through the strip in order (SRC-004 recommended).
        e.preventDefault();
        this.applyTabs(cycleTab(this.tabState(), e.shiftKey ? -1 : 1));
      } else if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey && !e.altKey && this.trapTab(e)) {
        // Focus stayed inside the topmost trapping layer (SRC-019 rule 3).
      } else if (this.state.paletteOpen) {
        // ↑↓ / ↩ / ⌘↩ while the palette is up (SRC-005 layer 2).
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.update({ paletteSel: Math.min(this.state.paletteSel + 1, Math.max(0, this.palRowActions.length - 1)) });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.update({ paletteSel: Math.max(0, this.state.paletteSel - 1) });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (e.metaKey || e.ctrlKey) {
            // ⌘↩ anywhere in the palette: the Search view with the current
            // query (WO-048, SRC-022). ⌘-click on a row still backgrounds.
            this.openSearchView(this.state.paletteQuery);
          } else {
            const row = this.palRowActions[Math.min(this.state.paletteSel, this.palRowActions.length - 1)];
            if (row !== undefined) row.open(false);
          }
        }
      }
    });
    // A mousedown in the unfocused pane flips focus silently (so the click
    // it precedes lands in an intact DOM); the re-render that shows the new
    // focus runs after the click has been dispatched (WO-055).
    document.addEventListener('mouseup', () => {
      if (this.paneFocusPending) {
        setTimeout(() => {
          if (this.paneFocusPending) this.render();
        }, 0);
      }
    });
    document.addEventListener('click', () => {
      if (
        this.state.projectSwitcherOpen ||
        this.state.agentsOpen ||
        this.state.settingsPop ||
        this.state.projectError !== null ||
        this.state.projectNotice !== null ||
        this.state.newDoc !== null ||
        this.state.closeConfirm !== null
      ) {
        this.update({
          projectSwitcherOpen: false,
          agentsOpen: false,
          settingsPop: false,
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
    // retainTabs runs over BOTH panes (WO-055); an emptied pane collapses.
    const survives = (id: string): boolean => this.byId.has(id) || this.docEdit.get(id)?.dirty === true;
    Object.assign(this.state, this.activationPatch(retainPanes(this.paneState(), survives)));
    if (this.state.docId !== null && !survives(this.state.docId)) this.state.docId = null;
    // Editor state lives while some tab's history in either pane still
    // references the doc (SRC-018: navigating away keeps buffer and mode).
    for (const id of this.docEdit.keys()) {
      if (!anyEntryPanes(this.paneState(), id)) this.dropEditor(id);
    }
  }

  /** The focused pane's TabState — everything single-valued reads this. */
  private tabState(): TabState {
    return this.state.panes[this.state.focusedPane];
  }

  private paneState(): PaneState {
    return { panes: this.state.panes, focused: this.state.focusedPane };
  }

  /**
   * The state that follows from a pane-set change: derived view/doc for the
   * FOCUSED pane's active entry (WO-055), the Documents-nav MRU, and — only
   * when the focused target actually changed — the per-view transient resets
   * (popovers, editor draft, feedback).
   */
  private activationPatch(ps: PaneState): Partial<State> {
    const patch: Partial<State> = { panes: ps.panes, focusedPane: ps.focused };
    const target = activeTarget(ps.panes[ps.focused]);
    if (target !== null) {
      if (isViewKey(target)) {
        patch.view = target;
      } else {
        patch.docId = target;
        patch.view = this.byId.get(target)?.type === 'work-order' ? 'workorder' : 'home';
        this.docMru = [target, ...this.docMru.filter((id) => id !== target)];
      }
    }
    // The find bar binds to the focused pane's active tab (WO-057): pane
    // focus change, tab switch, and navigation all close it.
    if (this.state.find !== null && (ps.focused !== this.state.focusedPane || target !== activeTarget(this.tabState()))) {
      patch.find = null;
    }
    if (target !== activeTarget(this.tabState())) {
      Object.assign(patch, {
        editorText: '',
        editorFocused: false,
        linksOpen: false,
        linkAdd: null,
        copied: false,
        kickoffCopied: false,
        agentsOpen: false,
        agentLaunchMsg: null,
        reviewPop: false,
        reviewText: null,
        tplResetConfirm: false,
      });
      if (target !== 'settings') Object.assign(patch, this.leaveMcpPatch());
    }
    return patch;
  }

  private applyPanes(ps: PaneState, extra: Partial<State> = {}): void {
    // Type-panel auto-collapse (WO-064, SRC-034): a split opening when the
    // window cannot hold both panes at the narrow threshold closes the open
    // panel (a picker, not a workspace) and remembers it; the split
    // collapsing restores it — unless the user managed the panel themselves
    // in between (togglePanel/openPanel clear the memo).
    const patch: Partial<State> = { ...this.activationPatch(ps), ...extra };
    const wasSplit = this.state.panes.length === 2;
    const isSplit = ps.panes.length === 2;
    if (!wasSplit && isSplit && this.state.panel !== null && window.innerWidth < App.SPLIT_PANEL_MIN) {
      this.panelAutoClosed = this.state.panel;
      patch.panel = null;
    } else if (wasSplit && !isSplit && this.panelAutoClosed !== null) {
      if (this.state.panel === null && patch.panel === undefined) patch.panel = this.panelAutoClosed;
      this.panelAutoClosed = null;
    }
    this.update(patch);
    // Every tab-set change persists (WO-054, SRC-026) — open, close, reorder,
    // pin, activate, in-place navigation — fire-and-forget, like pins.
    this.saveWorkspace();
  }

  /** A tab op on the focused pane (the common case). */
  private applyTabs(next: TabState, extra: Partial<State> = {}): void {
    this.applyPanes(setPane(this.paneState(), this.state.focusedPane, next), extra);
  }

  private firstDocId(): string | null {
    for (const type of TYPE_ORDER) {
      const docs = this.snap.documents.filter((d) => d.type === type).sort((a, b) => compareIds(a.id, b.id));
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

  /** Doc navigation is tab navigation (SRC-018). Default is an in-place
      link-follow on the active tab; browsing surfaces pass `preview` (the
      shared preview tab); ⌘-click passes `background` (new pinned tab).
      Every doc open feeds the persisted recents (WO-014). */
  openDoc(id: string, opts: OpenDocOpts = {}): void {
    if (!this.byId.has(id)) return;
    const surface: Surface = opts.background === true ? 'background' : opts.preview === true ? 'preview' : 'inplace';
    // Every browsing surface opens in the FOCUSED pane (WO-055 routing).
    this.applyPanes(navigateFocused(this.paneState(), id, { surface, previewTabs: this.state.previewTabs }), {
      projectSwitcherOpen: false,
      recents: pushRecent(this.state.recents, id),
    });
  }

  togglePin(id: string): void {
    const pinned = this.state.pinned.includes(id)
      ? this.state.pinned.filter((p) => p !== id)
      : [...this.state.pinned, id];
    this.update({ pinned });
    this.saveWorkspace();
  }

  private saveWorkspace(): void {
    const ps = this.paneState();
    void this.api.workspaceSave({
      pinned: this.state.pinned,
      recents: this.state.recents,
      ...persistPanes(ps),
      // The ratio persists only while split (WO-055): a single-pane save
      // stays byte-identical to the WO-054 shape.
      ...(ps.panes.length === 2 ? { ratio: this.state.paneRatio } : {}),
    });
  }

  setView(view: View): void {
    // Selecting any view closes the type panel and the settings popover (SRC-014).
    const closed = { projectSwitcherOpen: false, panel: null, settingsPop: false };
    if (view === 'home' || view === 'workorder') {
      // Documents nav: focus the tab showing the most recent doc — searching
      // the focused pane first, then the other (WO-055) — else open the
      // first doc as preview.
      const ps = this.paneState();
      const order = ps.panes.length === 2 ? [ps.focused, 1 - ps.focused] : [0];
      const lookup = (pred: (target: string) => boolean): { pane: number; key: string } | null => {
        for (const pi of order) {
          const tab = ps.panes[pi].tabs.find((t) => pred(currentTarget(t)));
          if (tab !== undefined) return { pane: pi, key: tab.key };
        }
        return null;
      };
      const recent = this.docMru.find((id) => lookup((t) => t === id) !== null);
      const hit = recent !== undefined ? lookup((t) => t === recent) : lookup((t) => !isViewKey(t));
      if (hit !== null) {
        this.applyPanes(setPane(ps, hit.pane, activateTab(ps.panes[hit.pane], hit.key), hit.pane), closed);
      } else {
        const first = this.firstDocId();
        if (first !== null) this.openDoc(first, { preview: true });
      }
      return;
    }
    this.applyPanes(
      navigateFocused(this.paneState(), view, { surface: 'preview', previewTabs: this.state.previewTabs }),
      closed,
    );
  }

  /** Leaving the agent-connection section dismisses its banners and drops the
      transient verify/pre-check results (SRC-002 — nothing is cached). */
  private leaveMcpPatch(): Partial<State> {
    return this.state.view === 'settings' && this.state.settingsSection === 'agent'
      ? { mcpWrote: false, mcpExternal: false, mcpBuildCopied: false, mcpVerify: null, mcpVerifyCopied: false, mcpPrecheck: null }
      : {};
  }

  /** Popover rows and the sub-nav land here: one Settings tab (preview
      semantics like Board), opened at the invoked section (WO-036). */
  openSettings(section: SettingsSection): void {
    if (section === 'updates') this.refreshUpdateStatus();
    this.applyPanes(navigateFocused(this.paneState(), 'settings', { surface: 'preview', previewTabs: this.state.previewTabs }), {
      settingsSection: section,
      ...(section !== 'agent' ? this.leaveMcpPatch() : {}),
      projectSwitcherOpen: false,
      panel: null,
      settingsPop: false,
    });
  }

  private refreshUpdateStatus(): void {
    void this.api.updateStatus().then((upd) => {
      this.updStatus = upd;
      this.render();
    });
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
        // Only meaningful while the section is still up; a later visit re-probes.
        if (this.state.view === 'settings' && this.state.settingsSection === 'agent') this.update({ mcpPrecheck: probe });
      })
      .catch(() => {
        this.precheckInFlight = false;
      });
  }

  async refresh(): Promise<void> {
    this.applySnapshot(await this.api.snapshot());
    await this.reconcileEditors();
    await this.reconcileTemplates();
    // Files changed under the Search view's result set: refetch the same
    // query so the rows never show deleted or stale docs (WO-048).
    if (this.state.searchResult !== null && anyEntryPanes(this.paneState(), 'search')) this.fetchSearch(this.state.searchQuery);
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
    this.announce('Copied the full context package');
    this.update({ copied: true });
    this.copyTimer = setTimeout(() => this.update({ copied: false }), 1800);
  }

  flashToast(text: string): void {
    clearTimeout(this.toastTimer);
    this.announce(text);
    this.update({ toast: text });
    this.toastTimer = setTimeout(() => this.update({ toast: null }), 2400);
  }

  /** Inspect dropped or picked files and raise the review sheet (SRC-045).
      Inspect writes nothing, so closing the sheet abandons cleanly. */
  async openImportSheet(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const rows = await this.guardIpc(() => this.api.importInspect(paths));
    if (rows === undefined) return;
    this.update({ importSheet: sheetFromInspect(rows), dragImport: null });
  }

  /** The Sources panel's "Import files…" — same sheet via the native picker. */
  async startImportPicker(): Promise<void> {
    const paths = await this.api.pickImportFiles();
    if (paths !== null && paths.length > 0) await this.openImportSheet(paths);
  }

  closeImportSheet(): void {
    if (this.state.importSheet?.busy) return;
    this.update({ importSheet: null });
  }

  /** File the accepted rows, refresh, open the first as a preview tab, and
      flash the new rows plus the quiet toast (SRC-045's filed state). */
  private async submitImport(): Promise<void> {
    const sheet = this.state.importSheet;
    if (sheet === null || sheet.busy) return;
    const requests = commitRequests(sheet);
    if (requests.length === 0) return;
    this.update({ importSheet: { ...sheet, busy: true, error: null } });
    let committed: CommittedSource[];
    try {
      committed = await this.api.importCommit(requests);
    } catch (err) {
      this.update({ importSheet: { ...sheet, busy: false, error: ipcErrorMessage(err) } });
      return;
    }
    await this.refresh();
    this.update({ importSheet: null, flashRows: committed.map((c) => c.id) });
    clearTimeout(this.flashRowsTimer);
    this.flashRowsTimer = setTimeout(() => this.update({ flashRows: [] }), 2400);
    const first = committed[0];
    if (first !== undefined) this.openDoc(first.id, { preview: true });
    this.announce(toastText(committed));
    this.update({ importToast: { text: toastText(committed), others: committed.slice(1) } });
    clearTimeout(this.importToastTimer);
    this.importToastTimer = setTimeout(() => this.update({ importToast: null }), 6000);
    for (const c of committed) this.sessionLog(c.id, { agent: false, text: `Imported — original preserved at veri/${c.original}`, time: 'today' });
  }

  /** The drag-hover drop target (SRC-045 board 1): scrim below the topbar,
      dashed ember frame, the incoming files as chips, the accepted set. */
  private importDropEl(): HTMLElement | null {
    const names = this.state.dragImport;
    if (names === null) return null;
    const shown = names.slice(0, 3);
    const more = names.length - shown.length;
    return h(
      'div',
      { class: 'imp-drop' },
      h('div', { class: 'imp-frame' }),
      h(
        'div',
        { class: 'imp-drop-inner' },
        h('div', { class: 'imp-drop-glyph' }, '⇪'),
        h('div', { class: 'imp-drop-title' }, 'Drop to import'),
        h(
          'div',
          { class: 'imp-drop-sub' },
          `${names.length === 1 ? '1 file becomes a source document' : `${names.length} files become source documents`} — ready to link, pack, and distill. Originals are preserved.`,
        ),
        h('div', { class: 'imp-chips' }, ...shown.map((name) => h('span', { class: 'imp-chip' }, h('span', { class: 'imp-chip-swatch' }), name)), more > 0 ? h('span', { class: 'imp-chip' }, `+${more} more`) : null),
        h('div', { class: 'imp-formats' }, 'md · txt · eml'),
      ),
    );
  }

  /** The review sheet (SRC-045 board 2): one card per file — accepted cards
      carry the provisional id chip and an editable title; refused cards say
      why, naming the supported set. Cancel abandons with nothing filed. */
  private importSheetEl(): HTMLElement | null {
    const sheet = this.state.importSheet;
    if (sheet === null) return null;
    const ids = provisionalIds(sheet, nextSrcNumber(this.byId.keys()));
    const src = TYPE_META.source;
    const accepted = commitRequests(sheet).length;
    const cards = sheet.rows.map((row, i) =>
      row.ok
        ? h(
            'div',
            { class: 'imp-file' },
            h(
              'div',
              { class: 'imp-file-head' },
              h('span', { class: 'imp-chip-swatch' }),
              h('span', { class: 'imp-file-name' }, row.name),
              h('span', { class: 'imp-file-note' }, `${sizeLabel(row.size)} · ${formatLabel(row)}`),
              h('span', { class: 'imp-id-chip', style: `color:${src.color};background:${tint(src.color)};` }, ids[i] ?? ''),
            ),
            h('div', { class: 'imp-field-label' }, 'Title'),
            h('input', {
              class: 'imp-title-input',
              fkey: `imp-title-${i}`,
              value: row.editedTitle,
              onInput: (e) => {
                row.editedTitle = (e.target as HTMLInputElement).value;
              },
            }),
          )
        : h(
            'div',
            { class: 'imp-file imp-refused' },
            h('div', { class: 'imp-file-head' }, h('span', { class: 'imp-file-name' }, row.name), h('span', { class: 'imp-file-note' }, row.size > 0 ? sizeLabel(row.size) : '')),
            h('div', { class: 'imp-refused-msg' }, row.message ?? 'refused'),
          ),
    );
    return h(
      'div',
      { class: 'imp-scrim', onClick: () => this.closeImportSheet() },
      h(
        'div',
        { class: 'imp-sheet', role: 'dialog', modal: true, label: 'Import files', onClick: (e) => e.stopPropagation() },
        h('div', { class: 'imp-head' }, h('span', { class: 'imp-head-title' }, accepted === 1 ? 'Import 1 file as a source' : `Import ${accepted} files as sources`)),
        h('div', { class: 'imp-files' }, ...cards),
        h('div', { class: 'imp-note' }, 'Originals preserved in ', h('span', { class: 'imp-note-path' }, 'veri/originals/'), ' — the source document keeps a link to the unmodified file.'),
        sheet.error !== null ? h('div', { class: 'imp-err' }, sheet.error) : null,
        h(
          'div',
          { class: 'imp-acts' },
          h('button', { class: 'imp-btn-ghost', fkey: 'imp-cancel', onClick: () => this.closeImportSheet(), disabled: sheet.busy ? true : undefined }, 'Cancel'),
          h(
            'button',
            { class: 'imp-btn-primary', fkey: 'imp-confirm', onClick: () => void this.submitImport(), disabled: sheet.busy || accepted === 0 ? true : undefined },
            sheet.busy ? 'Importing…' : confirmLabel(sheet),
          ),
        ),
      ),
    );
  }

  flashUndo(docId: string, from: string, to: string): void {
    clearTimeout(this.undoTimer);
    this.announce(`${docId} status set to ${to.replace(/-/g, ' ')} — undo available`);
    this.update({ undoToast: { docId, from, to } });
    this.undoTimer = setTimeout(() => this.update({ undoToast: null }), 6000);
  }

  /** Revert the last status change through the same setStatus write path —
      the file on disk goes back exactly as it was (WO-061). */
  private undoStatus(): void {
    const u = this.state.undoToast;
    if (u === null) return;
    clearTimeout(this.undoTimer);
    void this.api.setStatus(u.docId, u.from).then(() => {
      this.sessionLog(u.docId, { agent: false, text: `Status change undone — back to ${u.from.replace(/-/g, ' ')}`, time: 'today' });
      this.update({ undoToast: null });
      return this.refresh();
    });
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
      this.announce('Copied the kickoff prompt');
      this.update({ kickoffCopied: true, agentsOpen: false });
      this.kickoffTimer = setTimeout(() => this.update({ kickoffCopied: false }), 1800);
    });
  }

  openImport(): void {
    this.applyPanes(navigateFocused(this.paneState(), 'import', { surface: 'preview', previewTabs: this.state.previewTabs }), {
      projectSwitcherOpen: false,
      panel: null,
      settingsPop: false,
    });
  }

  /** Architecture (WO-068): one tab, preview semantics like Settings; the
      caller may pick the internal tab (the Home card opens the Map). */
  openArchitecture(tab: 'map' | 'rules' = 'map'): void {
    this.applyPanes(
      navigateFocused(this.paneState(), 'architecture', { surface: 'preview', previewTabs: this.state.previewTabs }),
      { archTab: tab, projectSwitcherOpen: false, panel: null, settingsPop: false },
    );
  }

  private importKickoffTimer: ReturnType<typeof setTimeout> | undefined;

  copyImportKickoff(): void {
    void this.api.copyText(importKickoffPrompt()).then(() => {
      this.announce('Import kickoff copied');
      clearTimeout(this.importKickoffTimer);
      this.update({ importKickoffCopied: true });
      this.importKickoffTimer = setTimeout(() => this.update({ importKickoffCopied: false }), 1800);
    });
  }

  flashMcpCmdCopied(): void {
    clearTimeout(this.mcpCmdTimer);
    this.announce('Copied command');
    this.update({ mcpCmdCopied: true });
    this.mcpCmdTimer = setTimeout(() => this.update({ mcpCmdCopied: false }), 1800);
  }

  sessionLog(id: string, row: ActivityRow): void {
    // Stamped here so every session row carries the ephemeral marker (WO-062).
    const stamped: ActivityRow = { ...row, session: true };
    const rows = this.sessionActivity.get(id) ?? [];
    rows.unshift(stamped);
    this.sessionActivity.set(id, rows);
    this.sessionFeed.unshift({ id, row: stamped });
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
        // ⌘-click follows in place (SRC-018 gesture table); ⌘⌥-click backgrounds.
        onNavigate: (target, background) => this.openDoc(target, background ? { background: true } : {}),
      });
      if (text === null) ed.conflict = 'deleted';
      this.render();
      ed.island.focus();
    });
  }

  private toggleEditMode(): void {
    const id = activeTarget(this.tabState());
    if (id === null || isViewKey(id)) return;
    this.setEditMode(id, this.docEdit.get(id)?.mode === 'edit' ? 'read' : 'edit');
  }

  editView(): ActiveEdit | null {
    const id = activeTarget(this.tabState());
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
    // Guard rejections mirror the status-row notice into the live region
    // (SRC-008's requirement, generalized by SRC-019 rule 4).
    if (warn) this.announce(text);
    clearTimeout(ed.noticeTimer);
    ed.notice = { text, warn };
    ed.noticeTimer = setTimeout(() => {
      ed.notice = null;
      this.render();
    }, text === 'saved' ? 1500 : 3000);
    this.render();
  }

  saveActive(): void {
    const id = activeTarget(this.tabState());
    if (id === null) return;
    if (id === 'settings') {
      if (this.state.settingsSection === 'templates') this.tplSave();
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
    const id = activeTarget(this.tabState());
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
    } else if (this.tabState().activeKey !== null) {
      this.forceCloseTab(this.state.focusedPane, this.tabState().activeKey!);
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

  /** Close ×/middle-click: closing the last tab whose history references
      dirty buffers gets the Save/Discard/Cancel prompt (SRC-008, SRC-018);
      everything else closes like before. "Last reference" counts every tab
      in BOTH panes (WO-055). */
  private requestCloseTab(paneIdx: number, key: string, anchor: DOMRect | null): void {
    const ps = this.paneState();
    const tab = ps.panes[paneIdx]?.tabs.find((t) => t.key === key);
    if (tab === undefined) return;
    const elsewhere = (target: string): boolean =>
      ps.panes.some((p, pi) => p.tabs.some((t) => (pi !== paneIdx || t.key !== key) && t.entries.some((e) => e.target === target)));
    const docs = [...new Set(tab.entries.map((e) => e.target))].filter(
      (id) => this.docEdit.get(id)?.dirty === true && !elsewhere(id),
    );
    const settings = this.tplAnyDirty() && tab.entries.some((e) => e.target === 'settings') && !elsewhere('settings');
    if (docs.length > 0 || settings) {
      this.confirmThen = (): void => this.forceCloseTab(paneIdx, key);
      this.update({
        closeConfirm: { docs, settings, x: anchor?.left ?? window.innerWidth / 2 - 130, y: (anchor?.bottom ?? 60) + 8 },
      });
      return;
    }
    this.forceCloseTab(paneIdx, key);
  }

  /** What the closeConfirm prompt's Save/Discard proceed to; Cancel drops it. */
  private confirmThen: (() => void) | null = null;

  /** A reload path — project switch, Open Project — must not silently
      destroy dirty buffers (WO-054, SRC-026): same Save/Discard/Cancel
      prompt as closing their tabs; Cancel aborts the switch entirely. */
  private guardDirtyReload(action: () => void): void {
    const docs = [...this.docEdit.entries()].filter(([, ed]) => ed.dirty).map(([id]) => id);
    const settings = this.tplAnyDirty();
    if (docs.length === 0 && !settings) {
      action();
      return;
    }
    this.confirmThen = action;
    this.update({ closeConfirm: { docs, settings, x: window.innerWidth / 2, y: 80 } });
  }

  private forceCloseTab(paneIdx: number, key: string): void {
    const ps = this.paneState();
    const pane = ps.panes[paneIdx];
    if (pane === undefined) return;
    const tab = pane.tabs.find((t) => t.key === key);
    // Closing a pane's last tab collapses the split (WO-055); the survivor
    // keeps its state — setPane handles both.
    const next = setPane(ps, paneIdx, closeTab(pane, key));
    // Buffers whose last referencing tab just closed go with it; a closed
    // Settings tab drops the template buffers so the next open reads the
    // files fresh (DEC-002).
    if (tab !== undefined) {
      for (const target of new Set(tab.entries.map((e) => e.target))) {
        if (target === 'settings') {
          if (!anyEntryPanes(next, 'settings')) this.dropTemplates();
        } else if (!anyEntryPanes(next, target)) {
          this.dropEditor(target);
        }
      }
    }
    this.applyPanes(next, { closeConfirm: null });
  }

  // ---- find in document (WO-057, SRC-029) ----

  /** ⌘F: open the bar over the focused pane's active document. Already
      open, it refocuses and selects the query (the "previous query of this
      bar instance" prefill); views have no find surface. */
  private openFindBar(): void {
    const target = activeTarget(this.tabState());
    if (target === null || isViewKey(target)) return;
    if (this.state.find !== null) {
      const input = this.findRefs?.input;
      if (input !== undefined) {
        input.focus();
        input.select();
      }
      return;
    }
    this.fbFocus = true;
    this.update({ find: findReduce(null, { type: 'open' }) });
  }

  /** Escape / ×: close and clear. render()'s sync drops the highlights and
      the island's search state; edit mode gets its focus back. */
  private closeFind(): void {
    if (this.state.find === null) return;
    const ed = this.activeDocEdit();
    this.update({ find: null });
    if (ed?.mode === 'edit') ed.island?.focus();
  }

  /** The focused pane's active doc-tab edit record, if any. */
  private activeDocEdit(): DocEdit | undefined {
    const target = activeTarget(this.tabState());
    return target !== null && !isViewKey(target) ? this.docEdit.get(target) : undefined;
  }

  /**
   * Build the bar for the focused pane (render path). Recomputes the match
   * set for the active backend — the read-mode walk runs over the freshly
   * built, still-detached screen; the ranges stay valid because the same
   * text nodes get attached — clamps the cursor, and parks the live refs
   * for the in-place typing/stepping updates.
   */
  private findBarFor(pane: TabState, screen: HTMLElement): HTMLElement | null {
    let find = this.state.find;
    if (find === null) return null;
    const target = activeTarget(pane);
    if (target === null || isViewKey(target)) return null;
    const ed = this.docEdit.get(target);
    if (ed?.mode === 'edit') {
      this.findRead = null;
      this.findEditRanges = ed.island !== null ? matchRanges(ed.island.text, find.query) : [];
      this.findTotal = this.findEditRanges.length;
    } else {
      const root = screen.querySelector('.reader-col');
      const dom = root !== null ? collectParts(root) : { nodes: [], parts: [] };
      this.findRead = { ...dom, matches: segmentMatches(dom.parts, find.query) };
      this.findEditRanges = [];
      this.findTotal = this.findRead.matches.length;
    }
    find = findReduce(find, { type: 'clamp', total: this.findTotal })!;
    this.state.find = find;
    const { el, refs } = findBarEl({
      query: find.query,
      current: find.current,
      total: this.findTotal,
      focus: this.fbFocus,
      onQuery: (q) => this.setFindBarQuery(q),
      onStep: (dir) => this.stepFindBar(dir),
      onClose: () => this.closeFind(),
    });
    this.fbFocus = false;
    this.findRefs = refs;
    return el;
  }

  /** Typing: recompute matches and repaint in place — no re-render, so the
      input keeps its caret. The count span is a polite live region and its
      in-place text change is the announcement (REQ-020). */
  private setFindBarQuery(q: string): void {
    const find = findReduce(this.state.find, { type: 'query', query: q });
    if (find === null) return;
    this.state.find = find;
    const ed = this.activeDocEdit();
    if (ed?.mode === 'edit') {
      if (ed.island !== null) {
        ed.island.setFindQuery(q);
        this.findEditRanges = matchRanges(ed.island.text, q);
      }
      this.findTotal = this.findEditRanges.length;
    } else if (this.findRead !== null) {
      this.findRead.matches = segmentMatches(this.findRead.parts, q);
      this.findTotal = this.findRead.matches.length;
      paintFind(this.findRead.nodes, this.findRead.matches, find.current);
    }
    this.refreshFindBar();
  }

  /** Enter / Shift+Enter / ‹ ›: wrap in either direction. Edit mode runs
      CM6's findNext/findPrevious (wrap + scroll built in) and derives the
      cursor from the landed selection; read mode steps the pure cursor,
      repaints, and scrolls the pane's own container. */
  private stepFindBar(dir: 1 | -1): void {
    const find = this.state.find;
    if (find === null || this.findTotal === 0) return;
    const ed = this.activeDocEdit();
    if (ed?.mode === 'edit' && ed.island !== null) {
      ed.island.findStep(dir);
      const sel = ed.island.view.state.selection.main;
      find.current = currentIndex(this.findEditRanges, sel.from, sel.to);
    } else if (this.findRead !== null) {
      this.state.find = findReduce(find, { type: 'step', dir, total: this.findTotal })!;
      paintFind(this.findRead.nodes, this.findRead.matches, this.state.find.current);
      scrollFindMatch(this.findRead.nodes, this.findRead.matches[this.state.find.current]);
    }
    this.refreshFindBar();
  }

  private refreshFindBar(): void {
    const find = this.state.find;
    if (find !== null && this.findRefs !== null) updateFindBar(this.findRefs, find.current, this.findTotal);
  }

  /**
   * render()'s find epilogue, after the new tree is attached: paint the
   * read-mode highlights (the walk ran in findBarFor on the detached
   * screen), push the query into the bound island — covering ⌘E handoffs
   * and the island's async first load — and drop search state everywhere
   * the bar no longer binds. With the bar closed this clears the registry
   * and every island, whatever path closed it.
   */
  private syncFindPaint(): void {
    const find = this.state.find;
    const target = activeTarget(this.tabState());
    const bound = find !== null && target !== null && !isViewKey(target) ? target : null;
    const editMode = bound !== null && this.docEdit.get(bound)?.mode === 'edit';
    for (const [id, ed] of this.docEdit) {
      if (id !== bound || !editMode) ed.island?.setFindQuery(null);
    }
    if (bound === null) {
      clearFind();
      this.findRead = null;
      this.findEditRanges = [];
      this.findTotal = 0;
      this.findRefs = null;
      return;
    }
    if (editMode) {
      clearFind();
      this.docEdit.get(bound)?.island?.setFindQuery(find!.query);
    } else if (this.findRead !== null) {
      paintFind(this.findRead.nodes, this.findRead.matches, find!.current);
    }
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
    if (warn) this.announce(text);
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
    if (!anyEntryPanes(this.paneState(), 'settings')) return;
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
            'button',
            { class: 'btn-reset tb-health', fkey: 'tb-health', label: `veri check — ${issueCount} issue${issueCount === 1 ? '' : 's'}, open Home`, onClick: () => this.setView('homeview') },
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
          'button',
          {
            class: this.state.projectSwitcherOpen ? 'btn-reset tb-proj-btn tb-proj-btn-open' : 'btn-reset tb-proj-btn',
            label: `Switch project — ${this.snap.projectName}`,
            expanded: this.state.projectSwitcherOpen,
            fkey: 'tb-proj',
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
          'button',
          {
            class: 'btn-reset tb-search',
            label: 'Search docs — ⌘K',
            fkey: 'tb-search',
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
        h('span', { style: 'color:var(--green);' }, '⎇'),
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
   * Step 1: the native picker. A folder that already has veri/ is a switch,
   * not a scaffold — it takes the guarded reload path below; a fresh folder
   * raises the creation sheet.
   */
  private async startNewProject(demo = false): Promise<void> {
    // `demo` pre-enables the sample-seed toggle (SRC-013's one behavioral
    // delta from SRC-007) — the sheet still shows the write and the toggle
    // stays interactive.
    this.update({ projectSwitcherOpen: false, welcomeNotice: null });
    const pick = await this.guardIpc(() => this.api.newProjectPick());
    if (pick === undefined || pick === null) return;
    if (pick.kind === 'existing') {
      this.openExistingPick(pick.dir);
      return;
    }
    this.update({ newProject: { dir: pick.dir, name: pick.name, demo, busy: false, error: null } });
  }

  /** The picker landed on a folder that already holds veri/ (WO-058): same
      dirty-buffer guard as every other reload path — Cancel aborts with
      nothing reloaded — and the `'existing'` notice rides the reload so the
      reopened window can say nothing was written. */
  private openExistingPick(dir: string): void {
    this.guardDirtyReload(() => this.surfaceProjectError(this.api.switchProject(dir, 'existing')));
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
    if (pick === undefined || pick === null) return;
    if (pick.kind === 'existing') {
      // The sheet can't scaffold into an existing project — drop it before
      // the guard so its focus trap doesn't sit over the prompt.
      this.update({ newProject: null });
      this.openExistingPick(pick.dir);
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
      label: 'Project name',
      fkey: 'np-name',
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
        { class: 'np-sheet', role: 'dialog', modal: true, label: 'New project', onClick: (e) => e.stopPropagation() },
        h('div', { class: 'micro-label' }, 'NEW PROJECT'),
        h(
          'div',
          { class: 'np-loc' },
          h('span', { class: 'np-path' }, h('bdi', {}, target)),
          h(
            'button',
            {
              class: np.busy ? 'btn-reset np-change np-disabled' : 'btn-reset np-change',
              disabled: np.busy,
              fkey: 'np-change',
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
          'button',
          {
            class: np.busy ? 'btn-reset btn-block np-toggle np-disabled' : 'btn-reset btn-block np-toggle',
            role: 'switch',
            checked: np.demo,
            disabled: np.busy,
            label: 'Seed with the skiff demo project',
            fkey: 'np-demo',
            onClick: () => {
              if (!np.busy) this.update({ newProject: { ...np, demo: !np.demo } });
            },
          },
          h('span', { class: np.demo ? 'np-sw np-sw-on' : 'np-sw' }, h('i', {})),
          h(
            'span',
            { class: 'np-toggle-txt' },
            h('span', { class: 'np-toggle-main' }, 'Seed with the skiff demo project'),
            h(
              'span',
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
            { class: 'np-btn np-btn-ghost', disabled: np.busy, fkey: 'np-cancel', onClick: () => this.closeNewProject() },
            'Cancel',
          ),
          h(
            'button',
            { class: 'np-btn np-btn-primary', disabled: np.busy || !validName, fkey: 'np-create', onClick: () => void this.createProject() },
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
        'button',
        {
          class: current ? 'btn-reset btn-block proj-row proj-row-current' : 'btn-reset btn-block proj-row',
          role: 'menuitem',
          label: `${p.name}${p.issueCount > 0 ? ` — ${p.issueCount} issue${p.issueCount === 1 ? '' : 's'}` : ''}${current ? ' — current project' : ''}`,
          fkey: `proj:${p.dir}`,
          onClick: () => {
            this.update({ projectSwitcherOpen: false });
            if (!current) this.guardDirtyReload(() => this.surfaceProjectError(this.api.switchProject(p.dir)));
          },
        },
        h('span', { class: 'proj-swatch', style: `background:${p.accentColor};` }),
        h(
          'span',
          { class: 'proj-info' },
          h(
            'span',
            { class: 'proj-name-line' },
            h('span', { class: 'proj-name' }, p.name),
            p.issueCount > 0 ? h('span', { class: 'proj-issue-dot' }) : null,
          ),
          h('span', { class: 'proj-meta' }, meta),
        ),
        current ? h('span', { class: 'proj-check' }, '✓') : null,
      );
    });
    return h(
      'div',
      { class: 'proj-pop', role: 'menu', label: 'Projects', onClick: (e) => e.stopPropagation() },
      h('div', { class: 'proj-pop-label' }, 'PROJECTS'),
      ...rows,
      h('div', { class: 'proj-divider' }),
      h(
        'button',
        {
          class: 'btn-reset btn-block proj-open-row',
          role: 'menuitem',
          fkey: 'proj-open',
          onClick: () => {
            this.update({ projectSwitcherOpen: false });
            this.guardDirtyReload(() => this.surfaceProjectError(this.api.openProjectFolder()));
          },
        },
        // Open keeps its position (muscle memory) but yields '+' to New
        // project below it, where the glyph means what it says (SRC-007).
        h('span', { class: 'proj-open-plus' }, '→'),
        h('span', {}, 'Open project folder…'),
        h('span', { class: 'proj-kbd' }, '⌘O'),
      ),
      h(
        'button',
        { class: 'btn-reset btn-block proj-open-row', role: 'menuitem', fkey: 'proj-new', onClick: () => void this.startNewProject() },
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

  // ---- search view (WO-048, SRC-022) ----

  /** Focus request for the Search view's query field ("focused on open"). */
  private svFocus = false;
  /** Caret position to restore after a query-edit re-render of the view. */
  private svCaret: number | null = null;

  svInput(): { focus: boolean; caret: number | null } {
    const out = { focus: this.svFocus, caret: this.svCaret };
    this.svFocus = false;
    this.svCaret = null;
    return out;
  }

  /** Same corpus, same docMru recency feed as the palette — the view shows
      the identical ranking, unsliced (SRC-022: no new ranking). */
  private fetchSearch(q: string): void {
    void this.api.paletteSearch(q, this.docMru).then((result) => {
      if (this.state.searchQuery === q) this.update({ searchResult: result });
    });
  }

  setSearchQuery(q: string, caret: number | null): void {
    this.svCaret = caret;
    this.state.searchQuery = q; // no render — the input already shows it
    this.fetchSearch(q);
  }

  /** Open the singleton Search view seeded with `query` (palette overflow
      row, ⌘↩, or the palette's Search view row). Preview surface like every
      other view tab. */
  private openSearchView(query: string): void {
    this.svFocus = true;
    this.state.searchQuery = query;
    this.state.searchResult = null;
    this.fetchSearch(query);
    this.applyPanes(navigateFocused(this.paneState(), 'search', { surface: 'preview', previewTabs: this.state.previewTabs }), {
      paletteOpen: false,
    });
  }

  /** Open semantics mirror the tabs design (SRC-018): Enter/click navigates
      the active tab in place, palette closes; ⌘Enter/⌘click = pinned tab in
      background, palette stays. */
  private openPaletteRow(row: PaletteRow, pinned: boolean): void {
    if (row.kind === 'overflow') {
      // "See all N results ↵" (WO-048): the Search view, seeded.
      this.openSearchView(this.state.paletteQuery);
    } else if (row.kind === 'command') {
      // ⌘↩ means nothing for an action row — treat it as a plain activation.
      this.update({ paletteOpen: false });
      if (row.command === 'open-beside') this.applyPanes(openBeside(this.paneState()));
      else void this.startNewProject();
    } else if (row.kind === 'view' && row.view === 'search') {
      // The Search view row keeps its held query but still focuses the field.
      this.openSearchView(this.state.searchQuery);
    } else if (row.kind === 'view') {
      this.applyPanes(navigateFocused(this.paneState(), row.view, { surface: 'preview', previewTabs: this.state.previewTabs }), {
        paletteOpen: false,
      });
    } else if (pinned) {
      this.openDoc(row.hit.id, { background: true });
    } else {
      this.openDoc(row.hit.id);
      this.update({ paletteOpen: false });
    }
  }

  private paletteRowEl(row: PaletteRow, i: number, sel: boolean): HTMLElement {
    const doc = row.kind === 'doc' ? row.hit : null;
    const meta = doc !== null ? TYPE_META[doc.type as VeriDocument['type']] : undefined;
    const chipStyle =
      meta !== undefined ? `color:${meta.color};background:${tint(meta.color)};` : 'color:var(--muted);background:var(--row-hover);';
    const snippet = doc?.snippet ?? null;
    const glyph = doc !== null ? doc.id : row.kind === 'overflow' ? '⌕' : (row as { glyph: string }).glyph;
    const title =
      doc !== null ? doc.title : row.kind === 'overflow' ? `See all ${row.count} results` : (row as { label: string }).label;
    // aria-activedescendant pattern: options are not tab stops — focus stays
    // on the combobox input and ↑↓ move the selection (SRC-019 layer table).
    return h(
      'div',
      {
        class: sel ? 'pal-row pal-row-sel' : 'pal-row',
        id: `pal-opt-${i}`,
        role: 'option',
        selected: sel,
        onClick: (e) => this.openPaletteRow(row, row.kind === 'doc' && (e.metaKey || e.ctrlKey)),
        onMouseenter: () => {
          if (this.state.paletteSel !== i) this.update({ paletteSel: i });
        },
      },
      doc !== null && (doc.status === 'proposed' || (doc.type === 'requirement' && doc.status === 'draft'))
        ? h('span', { class: 'sb-pending', title: 'Awaiting review' })
        : null,
      h('span', { class: 'pal-chip', style: chipStyle }, glyph),
      h(
        'div',
        { class: 'pal-main' },
        h(
          'div',
          { class: 'pal-title-line' },
          h('span', { class: 'pal-title' }, title),
          row.kind === 'overflow'
            ? null
            : h(
                'span',
                { class: 'pal-status', style: `color:${doc !== null ? statusColor(doc.status) : 'var(--ghost)'};` },
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
    const result = this.state.paletteResult ?? { query: { text: '', type: null, statuses: [], related: null }, hits: [] };
    const rows = paletteRows(result, { brownfield: this.snap.brownfield });
    const sel = Math.min(this.state.paletteSel, Math.max(0, rows.length - 1));
    this.palRowActions = rows.map((row) => ({ open: (pinned: boolean) => this.openPaletteRow(row, pinned) }));
    const input = h('input', {
      class: 'pal-input',
      placeholder: 'Search docs or jump to a view — try req: is:backlog',
      value: this.state.paletteQuery,
      role: 'combobox',
      label: 'Search docs',
      expanded: rows.length > 0,
      controls: 'pal-list',
      activedesc: rows.length > 0 ? `pal-opt-${sel}` : undefined,
      fkey: 'pal-input',
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
        { class: 'pal-panel', role: 'dialog', modal: true, label: 'Command palette', onClick: (e) => e.stopPropagation() },
        h('div', { class: 'pal-head' }, h('span', { class: 'pal-glyph' }, '⌕'), input, h('span', { class: 'pal-esc' }, 'esc')),
        h(
          'div',
          { class: 'pal-list', id: 'pal-list', role: 'listbox', label: 'Results' },
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
          h('span', {}, '⌘↩ all results'),
          h('span', { class: 'pal-foot-grammar' }, 'req: dec: wo: src: · is:proposed is:active is:done'),
        ),
      ),
    );
  }

  /** Collections in sidebar order (SRC-014). */
  private static readonly COLLECTIONS: readonly DocType[] = ['requirement', 'decision', 'source', 'work-order'];

  /** Ghost hint per empty collection (WO-030's teaching empty states,
      re-homed from the old tree into the type panel). */
  private static readonly GHOST_HINT: Partial<Record<DocType, string>> = {
    requirement: 'What must be true',
    decision: 'What was chosen, and why',
    'work-order': 'Work an agent can pick up',
    source: 'Evidence brought in',
  };

  /** The window width below which sidebar + type panel + two panes at the
      WO-064 narrow threshold (640px each) no longer fit: 216 + 280 + 6 + 1280. */
  private static readonly SPLIT_PANEL_MIN = 1782;
  /** The panel applyPanes auto-closed for a split (WO-064); restored when the
      split collapses, dropped when the user manages the panel themselves. */
  private panelAutoClosed: DocType | null = null;
  /** Focus request for the panel's filter input (autofocus on open). */
  private tpFocus = false;
  /** Caret position to restore after a filter-edit re-render. */
  private tpCaret: number | null = null;
  /** The panel list's scroll position, survives re-renders (reset on open). */
  private panelScroll = 0;

  /** Collection click (SRC-014): toggle the panel, never the active tab. */
  private togglePanel(type: DocType): void {
    this.panelAutoClosed = null; // a manual act supersedes the WO-064 memo
    const panel = this.state.panel === type ? null : type;
    if (panel !== null) {
      this.tpFocus = true;
      this.panelScroll = 0;
    }
    this.update({ panel, panelFilter: '', settingsPop: false });
  }

  /** The live type crumb (WO-039, SRC-018): open that type's panel — a
      browser, not a route; the active tab does not change. */
  openPanel(type: DocType): void {
    if (!App.COLLECTIONS.includes(type)) return;
    this.panelAutoClosed = null; // a manual act supersedes the WO-064 memo
    this.tpFocus = true;
    this.panelScroll = 0;
    this.update({ panel: type, panelFilter: '', settingsPop: false });
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

  /** The labeled sidebar (WO-035, SRC-014): Home, the four collections,
      and the Settings gear at the foot. Replaces the icon rail and the
      working-set tree. Graph left the sidebar with WO-052 (SRC-024);
      Board with WO-053 (SRC-025) — it folded into the Work Orders panel. */
  private sidebar(): HTMLElement {
    const target = activeTarget(this.tabState());
    const viewItem = (key: View, label: string, glyph: string): HTMLElement =>
      h(
        'button',
        {
          class: target === key ? 'btn-reset btn-block nav-item nav-item-active' : 'btn-reset btn-block nav-item',
          pressed: target === key,
          fkey: `side:${key}`,
          onClick: () => this.setView(key),
        },
        h('span', { class: 'nav-glyph' }, glyph),
        h('span', { class: 'nav-lbl' }, label),
      );
    const collItem = (type: DocType): HTMLElement => {
      const meta = TYPE_META[type];
      const open = this.state.panel === type;
      return h(
        'button',
        {
          class: open ? 'btn-reset btn-block nav-item nav-item-active' : 'btn-reset btn-block nav-item',
          label: `${meta.crumb} — ${livingCount(this.snap.documents, type)} living`,
          expanded: open,
          fkey: `coll:${type}`,
          onClick: () => this.togglePanel(type),
        },
        h('span', { class: 'nav-swatch' }, h('i', { style: `background:${meta.color};` })),
        h('span', { class: 'nav-lbl' }, meta.crumb),
        h('span', { class: 'nav-cnt' }, String(livingCount(this.snap.documents, type))),
        h('span', { class: 'nav-caret' }, open ? '◂' : '▸'),
      );
    };
    const { healthy, label } = this.mcpSummary();
    const popRow = (glyph: string, text: string, section: SettingsSection, meta: HTMLElement | null = null): HTMLElement =>
      h(
        'button',
        {
          class: 'btn-reset btn-block pop-row',
          role: 'menuitem',
          fkey: `pop:${section}`,
          onClick: (e) => {
            e.stopPropagation();
            this.openSettings(section);
          },
        },
        h('span', { class: 'pop-glyph' }, glyph),
        h('span', {}, text),
        meta,
      );
    // The grouped Settings popover (WO-036, SRC-014): every row opens the
    // Settings view at its section. The agent row's meta is the same static
    // config-state dot as the gear's — no port, no liveness (the server is
    // stdio-launched by the agent; REQ-005 forbids implying client status).
    const pop = this.state.settingsPop
      ? h(
          'div',
          { class: 'settings-pop', role: 'menu', label: 'Settings', onClick: (e) => e.stopPropagation() },
          h('div', { class: 'pop-label' }, 'Project'),
          popRow('⌧', 'Templates', 'templates'),
          popRow(
            '⌁',
            'Agent connection',
            'agent',
            h(
              'span',
              { class: 'pop-meta' },
              h('span', { class: 'settings-dot', style: `background:${healthy ? 'var(--green)' : 'var(--amber)'};` }),
            ),
          ),
          popRow('▣', 'Project settings', 'project'),
          h('div', { class: 'pop-div' }),
          h('div', { class: 'pop-label' }, 'Application'),
          popRow(
            '↻',
            'Updates',
            'updates',
            this.appInfo !== null ? h('span', { class: 'pop-meta pop-meta-ghost' }, this.appInfo.version) : null,
          ),
          popRow('◐', 'Appearance', 'appearance'),
        )
      : null;
    // The working-context group (WO-039, SRC-018): the persisted recents,
    // newest-first, capped at 6, hidden entirely when empty.
    const recents = this.state.recents.filter((id) => this.byId.has(id)).slice(0, 6);
    const recentRows = recents.map((id) => {
      const doc = this.byId.get(id)!;
      return h(
        'button',
        {
          class: target === id ? 'btn-reset btn-block sb-recent sb-recent-active' : 'btn-reset btn-block sb-recent',
          title: `${id} — ${doc.title}`,
          label: `${id} — ${doc.title}`,
          fkey: `recent:${id}`,
          onClick: (e) => this.openDoc(id, { preview: true, background: e.metaKey || e.ctrlKey }),
        },
        h('span', { class: 'sb-recent-id', style: `color:${TYPE_META[doc.type].color};` }, id),
        h('span', { class: 'sb-recent-ttl' }, doc.title),
      );
    });
    return h(
      'nav',
      { class: 'sidebar', label: 'Project' },
      viewItem('homeview', 'Home', '⌂'),
      h('div', { class: 'side-div' }),
      ...App.COLLECTIONS.map(collItem),
      ...(recents.length > 0
        ? [h('div', { class: 'side-div' }), h('div', { class: 'side-label' }, 'RECENT'), ...recentRows]
        : []),
      h('div', { class: 'side-fill' }),
      h(
        'div',
        { class: 'settings-row' },
        h(
          'button',
          {
            class: target === 'settings' ? 'btn-reset btn-block nav-item nav-item-active' : 'btn-reset btn-block nav-item',
            title: label,
            label,
            expanded: this.state.settingsPop,
            fkey: 'side:settings',
            onClick: (e) => {
              e.stopPropagation();
              this.update({ settingsPop: !this.state.settingsPop });
            },
          },
          h('span', { class: 'nav-glyph' }, '⚙︎'),
          h('span', { class: 'nav-lbl' }, 'Settings'),
          // Config state only — a static dot; a pulse would imply live
          // client status, which REQ-005 forbids showing.
          h('span', { class: 'settings-dot', style: `background:${healthy ? 'var(--green)' : 'var(--amber)'};` }),
        ),
        pop,
      ),
    );
  }

  /** The 280px type panel (WO-035, SRC-014): a browser, not a route —
      opening it never changes the active tab. */
  private typePanel(): HTMLElement | null {
    const type = this.state.panel;
    if (type === null) return null;
    const meta = TYPE_META[type];
    const list = panelList(this.snap.documents, type, this.state.panelFilter, this.state.pinned);
    const showDead = this.state.showDead[type] === true;
    const target = activeTarget(this.tabState());
    // Double-click pins the tab currently showing the doc (the preview tab
    // the first click just opened — in the focused pane, like every open).
    const pinShowing = (id: string): void => {
      const pane = this.tabState();
      const tab = pane.tabs.find((t) => currentTarget(t) === id);
      if (tab !== undefined) this.applyTabs(pinTab(pane, tab.key));
    };
    const row = (d: VeriDocument, pin: boolean): HTMLElement =>
      h(
        'button',
        {
          class: `btn-reset btn-block tp-row${target === d.id ? ' tp-row-active' : ''}${this.state.flashRows.includes(d.id) ? ' tp-row-new' : ''}`,
          label: `${d.id} — ${d.title} — ${d.status}`,
          fkey: `tp:${d.id}`,
          onClick: (e) => this.openDoc(d.id, { preview: true, background: e.metaKey || e.ctrlKey }),
          onDblclick: () => pinShowing(d.id),
        },
        pin ? h('span', { class: 'tp-star' }, '★') : null,
        h('span', { class: 'tp-id', style: `color:${meta.color};` }, d.id),
        h('span', { class: 'tp-ttl' }, d.title),
        h(
          'span',
          { class: 'tp-st', style: `color:${statusColor(d.status)};${d.status === 'done' ? 'opacity:.6;' : ''}` },
          d.status,
        ),
      );
    // The Board fold (WO-053, SRC-025): work orders' living list renders
    // under BACKLOG / IN PROGRESS micro-headers; other types stay flat.
    const groups = livingGroups(list.living, type);
    const rows: HTMLElement[] = [];
    if (list.pinned.length > 0) {
      rows.push(h('div', { class: 'tp-group' }, 'Pinned'), ...list.pinned.map((d) => row(d, true)));
      // Subgroup headers take over the living list's labeling below.
      if (groups === null) rows.push(h('div', { class: 'tp-group' }, 'All'));
    }
    if (groups === null) {
      rows.push(...list.living.map((d) => row(d, false)));
    } else {
      for (const g of groups) rows.push(h('div', { class: 'tp-group' }, g.label), ...g.docs.map((d) => row(d, false)));
    }
    if (list.dead.length > 0) {
      rows.push(
        h(
          'button',
          {
            class: 'btn-reset btn-block tp-more',
            expanded: showDead,
            fkey: 'tp-more',
            onClick: () => this.update({ showDead: { ...this.state.showDead, [type]: !showDead } }),
          },
          showDead ? `▾ hide ${DEAD_LABEL[type]}` : `▸ ${list.dead.length} ${DEAD_LABEL[type]}`,
        ),
      );
      if (showDead) rows.push(...list.dead.map((d) => row(d, false)));
    }
    if (list.total === 0) {
      // The teaching empty state (WO-030), re-homed from the old tree.
      rows.push(
        h(
          'button',
          {
            class: 'btn-reset btn-block tp-ghost',
            fkey: 'tp-ghost',
            onClick: (e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as Element).getBoundingClientRect();
              this.openNewDoc(type, { x: rect.left, y: rect.bottom + 6 });
            },
          },
          h('span', { class: 'tp-ghost-plus' }, '+'),
          h('span', { class: 'tp-ghost-hint' }, App.GHOST_HINT[type] ?? ''),
          h('span', { class: 'tp-ghost-action' }, `New ${meta.label}…`),
        ),
      );
    } else if (list.pinned.length + list.living.length + list.dead.length === 0) {
      rows.push(h('div', { class: 'tp-empty' }, `No matches for “${this.state.panelFilter.trim()}”.`));
    }
    const input = h('input', {
      placeholder: `Filter ${meta.crumb.toLowerCase()}…`,
      label: `Filter ${meta.crumb.toLowerCase()}`,
      fkey: 'tp-filter',
      value: this.state.panelFilter,
      onInput: (e) => {
        const el = e.target as HTMLInputElement;
        this.tpCaret = el.selectionStart;
        this.update({ panelFilter: el.value });
      },
    }) as HTMLInputElement;
    input.spellcheck = false;
    const caret = this.tpCaret;
    this.tpCaret = null;
    if (this.tpFocus) {
      this.tpFocus = false;
      queueMicrotask(() => input.focus());
    } else if (caret !== null) {
      queueMicrotask(() => {
        input.focus();
        input.setSelectionRange(caret, caret);
      });
    }
    return h(
      'div',
      { class: 'typepanel' },
      h(
        'div',
        { class: 'tp-head' },
        h('span', { class: 'tp-swatch', style: `background:${meta.color};` }),
        h('span', { class: 'tp-title' }, meta.crumb),
        h('span', { class: 'tp-count' }, String(list.total)),
        // Evidence intake entry two of two (WO-096, SRC-045): same review
        // sheet as the drag path, via the native multi-file picker.
        ...(type === 'source'
          ? [
              h(
                'button',
                {
                  class: 'tp-import',
                  title: 'Import files as sources',
                  label: 'Import files',
                  fkey: 'tp-import',
                  onClick: (e) => {
                    e.stopPropagation();
                    void this.startImportPicker();
                  },
                },
                'Import files…',
              ),
            ]
          : []),
        h(
          'button',
          {
            class: 'tp-new',
            title: `New ${meta.label}`,
            label: `New ${meta.label}`,
            fkey: 'tp-new',
            onClick: (e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as Element).getBoundingClientRect();
              this.openNewDoc(type, { x: rect.left, y: rect.bottom + 6 });
            },
          },
          '+',
        ),
        h('button', { class: 'tp-close', title: 'Close panel', label: 'Close panel', fkey: 'tp-close', onClick: () => this.update({ panel: null }) }, '✕'),
      ),
      h('div', { class: 'tp-filter' }, input),
      h('div', { class: 'tp-list' }, ...rows),
    );
  }

  /** One tab: type-colored id chip (docs) or glyph (views) for its current
      history entry, ellipsized title — italic for the preview tab — and the
      close ×. All SRC-004 gestures, keyed by tab identity (SRC-018) plus
      the owning pane (WO-055): every handler is pane-explicit so keyboard
      activation works on the unfocused strip too, and fkeys carry the pane
      index because both panes allocate the same tab keys. */
  private tabEl(pane: TabState, paneIdx: number, t: Tab, i: number): HTMLElement {
    const target = currentTarget(t);
    const view = isViewKey(target) ? VIEW_META[target] : null;
    const doc = view === null ? this.byId.get(target) : undefined;
    const title = view?.label ?? doc?.title ?? target;
    const active = t.key === pane.activeKey;
    const dirty = this.docEdit.get(target)?.dirty === true || (target === 'settings' && this.tplAnyDirty());
    const close = (el: Element | null): void => this.requestCloseTab(paneIdx, t.key, el?.getBoundingClientRect() ?? null);
    const inPane = (next: TabState): void => this.applyPanes(setPane(this.paneState(), paneIdx, next, paneIdx));
    // The dirty state rides the accessible name — the dot alone is not a
    // channel a screen reader can see (SRC-019 rule 5).
    const name =
      (view !== null ? title : `${target} — ${title}`) +
      (dirty ? ' — unsaved changes' : '') +
      (t.preview ? ' — preview' : '');
    return h(
      'div',
      {
        class: `tab${active ? ' tab-active' : ''}${t.preview ? ' tab-preview' : ''}${dirty ? ' tab-dirty' : ''}`,
        title: (view !== null ? title : `${target} — ${title}`) + (t.preview ? ' · preview — double-click to keep open' : ''),
        role: 'tab',
        label: name,
        selected: active,
        tabindex: active ? 0 : -1,
        fkey: `tab:${paneIdx}:${t.key}`,
        draggable: true,
        onClick: () => inPane(activateTab(pane, t.key)),
        onDblclick: () => inPane(pinTab(activateTab(pane, t.key), t.key)),
        onMousedown: (e) => {
          if (e.button === 1) {
            e.preventDefault();
            close(e.currentTarget as Element);
          }
        },
        onDragstart: (e) => {
          this.dragIdx = { pane: paneIdx, idx: i };
          if (e.dataTransfer !== null) e.dataTransfer.effectAllowed = 'move';
        },
        onDragover: (e) => {
          e.preventDefault();
          // Reorder stays within one strip — cross-pane tab drag is not a
          // WO-055 gesture (⌘\ is the explicit act).
          if (this.dragIdx !== null && this.dragIdx.pane === paneIdx && this.dragIdx.idx !== i) {
            inPane(reorderTab(pane, this.dragIdx.idx, i));
            this.dragIdx = { pane: paneIdx, idx: i };
          }
        },
        onDrop: (e) => e.preventDefault(),
      },
      h(
        'span',
        { class: 'tab-id', style: `color:${doc !== undefined ? TYPE_META[doc.type].color : 'var(--muted)'};` },
        view?.glyph ?? target,
      ),
      h('span', { class: 'tab-title' }, title),
      // A real button nested inside the role=tab element — the pragmatic
      // VS Code-style deviation from the pure tabs pattern (SRC-019).
      h(
        'button',
        {
          class: 'btn-reset tab-close',
          title: dirty ? 'Unsaved changes — close tab' : 'Close tab',
          label: dirty ? `Close ${title} — unsaved changes` : `Close ${title}`,
          fkey: `tab-close:${paneIdx}:${t.key}`,
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

  /** The ‹ › history buttons (WO-039, SRC-018), leftmost in the strip,
      acting on this pane's active tab; hidden in the no-tabs empty state.
      One strip per pane (WO-055) — every handler is pane-explicit and also
      focuses the pane it acts in. */
  private tabStrip(pane: TabState, paneIdx: number): HTMLElement {
    const act = activeTab(pane);
    const canBack = act !== null && act.index > 0;
    const canFwd = act !== null && act.index < act.entries.length - 1;
    const inPane = (next: TabState): void => this.applyPanes(setPane(this.paneState(), paneIdx, next, paneIdx));
    const histBtn = (glyph: string, on: boolean, title: string, fkey: string, go: () => void): HTMLElement =>
      h(
        'button',
        {
          class: on ? 'btn-reset hist-btn' : 'btn-reset hist-btn hist-btn-off',
          title,
          label: title,
          disabled: !on,
          fkey,
          onClick: () => {
            if (on) go();
          },
        },
        glyph,
      );
    // Roving tabindex over the role=tab elements (SRC-019): ←/→ move focus
    // without activating; ↩/Space activate the focused tab. DOM-only moves —
    // no state change until activation.
    const roving = (e: KeyboardEvent): void => {
      const tabsEls = Array.from((e.currentTarget as Element).querySelectorAll<HTMLElement>('[role="tab"]'));
      const cur = tabsEls.indexOf(document.activeElement as HTMLElement);
      if (cur === -1) return;
      const move = roveKey(e.key);
      if (move !== null) {
        e.preventDefault();
        const next = roveIndex(tabsEls.length, cur, move);
        tabsEls.forEach((el, i) => (el.tabIndex = i === next ? 0 : -1));
        tabsEls[next]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        tabsEls[cur].click();
      }
    };
    return h(
      'div',
      { class: 'tabstrip' },
      pane.tabs.length > 0
        ? h(
            'div',
            { class: 'nav-hist' },
            histBtn('‹', canBack, 'Back ⌘[', `hist-back:${paneIdx}`, () => inPane(back(pane))),
            histBtn('›', canFwd, 'Forward ⌘]', `hist-fwd:${paneIdx}`, () => inPane(forward(pane))),
          )
        : null,
      h(
        'div',
        { class: 'tablist-wrap', role: 'tablist', label: 'Open tabs', onKeydown: roving },
        ...pane.tabs.map((t, i) => this.tabEl(pane, paneIdx, t, i)),
      ),
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

  /** The active view's scrollable regions, in document order — queried per
      pane container (WO-055), never per root. */
  private static readonly SCROLL_SEL = '.reader, .panel-right, .screen-homeview, .screen-search, .screen-arch, .mcp-view, .set-scroll';

  /** A mousedown anywhere in an unfocused pane focuses it (WO-055): the
      state flips silently — no render, no preventDefault, so the click it
      precedes lands in an intact DOM and native focus semantics (inputs,
      the editor) are untouched. The boot-time mouseup listener runs the
      deferred render once the gesture completes. */
  private focusPaneSilently(idx: number): void {
    if (idx === this.state.focusedPane || this.state.panes[idx] === undefined) return;
    Object.assign(this.state, this.activationPatch(focusPane(this.paneState(), idx)));
    this.paneFocusPending = true;
  }

  /**
   * One pane: its own tab strip over its own screen (the .editor-area seam
   * duplicated, WO-055). The screen renders from THIS pane's active entry —
   * the shell's derived view/docId are swapped in for the build and restored
   * after, so view functions stay single-valued. The editor island is
   * single-homed: it attaches in the focused pane only; a doc in edit mode
   * shown in the unfocused pane renders as the reader.
   */
  private paneEl(pane: TabState, idx: number, activeEdit: ActiveEdit | null): HTMLElement {
    const ps = this.paneState();
    const split = ps.panes.length === 2;
    const focused = idx === ps.focused;
    let screen: HTMLElement;
    // Views key per-pane transients (the Connections-rail overlay, WO-064)
    // off this index; it rides the same swap-and-restore as view/docId.
    this.renderPane = idx;
    if (pane.tabs.length === 0) {
      screen = this.emptyState();
    } else {
      const target = activeTarget(pane)!;
      const saved = { view: this.state.view, docId: this.state.docId };
      if (isViewKey(target)) {
        this.state.view = target;
      } else {
        this.state.docId = target;
        this.state.view = this.byId.get(target)?.type === 'work-order' ? 'workorder' : 'home';
      }
      const view = this.state.view;
      const edit = focused ? activeEdit : null;
      if (edit !== null) screen = editorScreen(this, edit);
      else if (view === 'workorder' && this.doc()?.type === 'work-order') screen = workOrderView(this);
      else if (view === 'homeview') screen = homeView(this);
      else if (view === 'search') screen = searchView(this);
      else if (view === 'settings') screen = settingsView(this);
      else if (view === 'import') screen = importView(this);
      else if (view === 'architecture') screen = architectureView(this);
      else screen = readerView(this);
      this.state.view = saved.view;
      this.state.docId = saved.docId;
    }
    const el = h(
      'div',
      {
        class: `editor-area${split && !focused ? ' pane-unfocused' : ''}`,
        style: split && idx === 0 ? `flex:0 0 calc(${(this.paneRatioClamped() * 100).toFixed(2)}% - 3px);` : undefined,
      },
      this.tabStrip(pane, idx),
      screen,
      // The find bar floats over the FOCUSED pane's content area (WO-057);
      // built after the screen so the read-mode walk sees the final tree.
      focused ? this.findBarFor(pane, screen) : null,
    );
    if (split) el.addEventListener('mousedown', () => this.focusPaneSilently(idx), true);
    return el;
  }

  private paneRatioClamped(): number {
    const host = this.root.querySelector<HTMLElement>('.panes');
    return clampRatio(this.state.paneRatio, host?.clientWidth ?? window.innerWidth - 208);
  }

  /** The draggable divider (WO-055, SRC-027): min 320px per side, double-
      click resets 50/50, focusable with arrow-key resize (REQ-020). Existing
      border/hover tokens only. Drag moves the flex basis directly — state
      and persistence commit on mouseup, so no re-render tears the DOM out
      from under the gesture. */
  private dividerEl(): HTMLElement {
    const setRatio = (ratio: number): void => {
      this.state.paneRatio = ratio;
      this.saveWorkspace();
      this.render();
    };
    const el = h('div', {
      class: 'pane-divider',
      role: 'separator',
      tabindex: 0,
      fkey: 'pane-divider',
      label: 'Resize panes — arrow keys resize, double-click resets',
      title: 'Drag to resize · double-click for 50/50',
      onDblclick: () => setRatio(0.5),
      onKeydown: (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const width = this.root.querySelector<HTMLElement>('.panes')?.clientWidth ?? window.innerWidth;
          setRatio(clampRatio(this.state.paneRatio + ((e.key === 'ArrowRight' ? 1 : -1) * 24) / width, width));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          setRatio(0.5);
        }
      },
      onMousedown: (e) => this.startDividerDrag(e),
    });
    el.setAttribute('aria-orientation', 'vertical');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '100');
    el.setAttribute('aria-valuenow', String(Math.round(this.paneRatioClamped() * 100)));
    return el;
  }

  private startDividerDrag(e: MouseEvent): void {
    e.preventDefault();
    const host = this.root.querySelector<HTMLElement>('.panes');
    const first = host?.querySelector<HTMLElement>('.editor-area');
    if (host == null || first == null) return;
    const divider = e.currentTarget as HTMLElement;
    divider.classList.add('pane-divider-drag');
    const rect = host.getBoundingClientRect();
    let ratio = this.state.paneRatio;
    const move = (ev: MouseEvent): void => {
      ratio = clampRatio((ev.clientX - rect.left) / rect.width, rect.width);
      first.style.flex = `0 0 calc(${(ratio * 100).toFixed(2)}% - 3px)`;
      divider.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    };
    const up = (): void => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      divider.classList.remove('pane-divider-drag');
      this.state.paneRatio = ratio;
      this.saveWorkspace();
      this.render();
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  render(): void {
    this.paneFocusPending = false;
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
    // Save the outgoing DOM's scroll positions into the history entries they
    // were rendered for (plus the type panel), so tab switches AND back/
    // forward restore them (SRC-018 history rule 4). The entry objects are
    // shared with the tab state by reference, so this survives navigation
    // ops. Capture is scoped per pane container (WO-055) — a split doubles
    // every SCROLL_SEL match, so each pane walks only its own subtree.
    const oldList = this.root.querySelector('.tp-list');
    if (oldList !== null) this.panelScroll = oldList.scrollTop;
    const oldPanes = this.root.querySelectorAll<HTMLElement>('.editor-area');
    this.renderedEntries.forEach((entry, i) => {
      const paneEl = oldPanes[i];
      if (entry !== null && paneEl !== undefined) {
        entry.scroll = Array.from(paneEl.querySelectorAll(App.SCROLL_SEL), (el) => el.scrollTop);
      }
    });
    // Editor islands lose their scroll when replaceChildren detaches them.
    for (const ed of this.docEdit.values()) ed.island?.saveScroll();
    for (const ed of this.tplEdit.values()) ed.island?.saveScroll();

    // Focus is destroyed with the tree (SRC-019 rule 2): capture the active
    // element's stable fkey and the DOM-order fkey list before the rebuild.
    const beforeKeys = Array.from(this.root.querySelectorAll<HTMLElement>('[data-fkey]'), (el) => el.dataset['fkey']!);
    const focusedKey = document.activeElement instanceof HTMLElement ? (document.activeElement.dataset['fkey'] ?? null) : null;
    resetChipKeys();
    // Hover previews (WO-047): the rebuild detaches every anchor chip, and a
    // tab-switch must dismiss immediately — drop the popover on every pass.
    dismissPreview();
    setPreviewRoot(this.snap.root);

    const activeEdit = this.editView();
    const ps = this.paneState();
    // One .editor-area per pane (WO-055); split adds the divider between.
    const paneEls = ps.panes.map((pane, i) => this.paneEl(pane, i, activeEdit));
    const editorArea =
      ps.panes.length === 2 ? h('div', { class: 'panes' }, paneEls[0], this.dividerEl(), paneEls[1]) : paneEls[0];
    const palette = this.paletteEl();
    const sheet = this.newProjectSheet();
    const toast = this.state.toast !== null ? h('div', { class: 'toast', role: 'status' }, this.state.toast) : null;
    const u = this.state.undoToast;
    const undoToast =
      u !== null
        ? h(
            'div',
            { class: 'toast toast-undo', role: 'status' },
            h('span', { class: 'toast-undo-label' }, `${u.docId} → ${u.to.replace(/-/g, ' ')}`),
            h('button', { class: 'btn-reset toast-undo-btn', fkey: 'toast-undo', onClick: () => this.undoStatus() }, 'Undo'),
          )
        : null;
    const panel = this.typePanel();
    const importDrop = this.importDropEl();
    const importSheet = this.importSheetEl();
    const it = this.state.importToast;
    const importToast =
      it !== null
        ? h(
            'div',
            { class: 'toast toast-import', role: 'status' },
            h('span', { class: 'toast-import-label' }, it.text),
            ...it.others.map((c) => h('button', { class: 'btn-reset toast-import-link', fkey: `toast-imp-${c.id}`, onClick: () => this.openDoc(c.id, { preview: true }) }, `${c.id} →`)),
          )
        : null;
    this.root.replaceChildren(
      this.topbar(),
      h('div', { class: 'body' }, this.sidebar(), ...(panel !== null ? [panel] : []), editorArea),
      ...(palette !== null ? [palette] : []),
      ...(sheet !== null ? [sheet] : []),
      ...(importDrop !== null ? [importDrop] : []),
      ...(importSheet !== null ? [importSheet] : []),
      ...(toast !== null ? [toast] : []),
      ...(undoToast !== null ? [undoToast] : []),
      ...(importToast !== null ? [importToast] : []),
      ...this.editPopovers(),
    );
    this.state.editorFocused = false;

    const newList = this.root.querySelector('.tp-list');
    if (newList !== null) newList.scrollTop = this.panelScroll;
    const newPanes = this.root.querySelectorAll<HTMLElement>('.editor-area');
    this.renderedEntries = ps.panes.map((pane) => {
      const act = activeTab(pane);
      return act === null ? null : act.entries[act.index];
    });
    this.renderedEntries.forEach((entry, i) => {
      const paneEl = newPanes[i];
      if (entry === null || paneEl === undefined) return;
      const saved = entry.scroll;
      paneEl.querySelectorAll(App.SCROLL_SEL).forEach((el, j) => {
        if (saved[j] !== undefined) el.scrollTop = saved[j];
      });
    });
    if (activeEdit !== null) this.docEdit.get(activeEdit.id)?.island?.restoreScroll();
    // Settings is a singleton — whichever pane shows it hosts the island.
    if (ps.panes.some((p) => activeTarget(p) === 'settings') && this.state.settingsSection === 'templates')
      this.tplEdit.get(this.state.tplType)?.island?.restoreScroll();
    // Find highlights ride the new tree (WO-057): paint or clear last.
    this.syncFindPaint();

    this.restoreFocus(beforeKeys, focusedKey);
  }

  /**
   * The focus half of the rebuild contract (SRC-019 rule 2 + 3): restore the
   * captured fkey (nearest old-order neighbour when it's gone), return focus
   * to a closed layer's invoker, and pull focus into a newly opened trapping
   * layer — its `initial` fkey, else its first focusable.
   */
  private restoreFocus(beforeKeys: string[], focusedKey: string | null): void {
    const layers = this.layerDefs();
    const kinds = layers.map((l) => l.kind);
    for (const l of layers) if (!this.renderedLayers.includes(l.kind)) this.layerInvoker.set(l.kind, focusedKey);
    let invokerKey: string | null = null;
    for (const kind of this.renderedLayers) {
      if (!kinds.includes(kind)) {
        invokerKey = this.layerInvoker.get(kind) ?? invokerKey;
        this.layerInvoker.delete(kind);
      }
    }
    this.renderedLayers = kinds;

    const byKey = new Map<string, HTMLElement>();
    for (const el of this.root.querySelectorAll<HTMLElement>('[data-fkey]')) {
      if (!byKey.has(el.dataset['fkey']!)) byKey.set(el.dataset['fkey']!, el);
    }
    const focusKey = (key: string | null): boolean => {
      const el = key === null ? undefined : byKey.get(key);
      if (el === undefined) return false;
      el.focus({ preventScroll: true });
      return true;
    };

    let focused = false;
    if (invokerKey !== null) focused = focusKey(invokerKey);
    if (!focused && focusedKey !== null) focused = focusKey(focusedKey);
    if (!focused && focusedKey !== null) focused = focusKey(resolveFocus(beforeKeys, [...byKey.keys()], focusedKey));

    // A trapping layer owns focus while open: pull it inside if it isn't.
    const top = layers.find((l) => l.trap);
    if (top !== undefined) {
      const host = this.root.querySelector(top.sel);
      if (host !== null && !(document.activeElement !== null && host.contains(document.activeElement))) {
        if (!(top.initial !== undefined && focusKey(top.initial))) {
          host.querySelector<HTMLElement>(FOCUSABLE_SEL)?.focus({ preventScroll: true });
        }
      }
    }
  }

  /** The creation popover and the dirty-close prompt (WO-022, SRC-008). */
  private editPopovers(): HTMLElement[] {
    const out: HTMLElement[] = [];
    const nd = this.state.newDoc;
    if (nd !== null) {
      const input = h('input', {
        class: 'nd-title',
        placeholder: 'Title',
        label: 'Title',
        fkey: 'nd-title',
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
          'button',
          {
            class: on ? 'btn-reset nd-seg nd-seg-on' : 'btn-reset nd-seg',
            style: on ? `color:${meta.color};background:${tint(meta.color)};` : undefined,
            label: meta.label,
            pressed: on,
            fkey: `nd-seg:${type}`,
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
          { class: 'nd-pop', style, role: 'dialog', modal: true, label: 'New document', onClick: (e) => e.stopPropagation() },
          h('div', { class: 'micro-label' }, 'NEW DOCUMENT'),
          h('div', { class: 'nd-segs', role: 'group', label: 'Type' }, ...segs),
          input,
          h(
            'div',
            { class: 'nd-acts' },
            h('button', { class: 'nd-btn-ghost', fkey: 'nd-cancel', onClick: () => this.update({ newDoc: null }) }, 'Cancel'),
            h('button', { class: 'nd-btn-primary', fkey: 'nd-create', onClick: () => this.submitNewDoc() }, 'Create'),
          ),
        ),
      );
    }
    const cc = this.state.closeConfirm;
    if (cc !== null) {
      const style = `top:${cc.y}px;left:${Math.max(8, Math.min(cc.x - 120, window.innerWidth - 268))}px;`;
      // This tab's history is the last reference to these buffers (SRC-018).
      const text =
        cc.docs.length === 0
          ? "Template edits aren't saved."
          : `${cc.docs.join(', ')} ${cc.docs.length === 1 ? 'has' : 'have'} edits that aren't saved${cc.settings ? ', and neither are template edits' : ''}.`;
      // Close tab or reload into another project — whichever raised the
      // prompt parked its continuation in confirmThen (WO-054).
      const then = this.confirmThen ?? ((): void => {});
      const proceed = (): void => {
        this.update({ closeConfirm: null });
        then();
      };
      const saveAll = (): void => {
        this.update({ closeConfirm: null });
        const finish = (): void => (cc.settings ? this.tplSaveAll(then) : then());
        const saveDoc = (i: number): void => {
          if (i >= cc.docs.length) {
            finish();
            return;
          }
          this.saveEditor(cc.docs[i], () => saveDoc(i + 1));
        };
        saveDoc(0);
      };
      out.push(
        h(
          'div',
          { class: 'cc-pop', style, role: 'alertdialog', modal: true, label: `Unsaved changes — ${text}`, onClick: (e) => e.stopPropagation() },
          h('div', { class: 'cc-title' }, 'Unsaved changes'),
          h('div', { class: 'cc-text' }, text),
          h(
            'div',
            { class: 'cc-acts' },
            h('button', { class: 'nd-btn-ghost', fkey: 'cc-cancel', onClick: () => this.update({ closeConfirm: null }) }, 'Cancel'),
            h('button', { class: 'nd-btn-ghost', fkey: 'cc-discard', onClick: proceed }, 'Discard'),
            h('button', { class: 'nd-btn-primary', fkey: 'cc-save', onClick: saveAll }, 'Save'),
          ),
        ),
      );
    }
    return out;
  }
}

// First paint (WO-060): main resolves the theme before load and passes it as
// a query param — applied synchronously here so a light launch never renders
// a dark frame while boot's themeGet round-trip is in flight.
if (new URLSearchParams(location.search).get('theme') === 'light') {
  document.documentElement.dataset['theme'] = 'light';
}

const app = new App(document.getElementById('app')!);
void app.boot();
// Console/debug handle (used by the screenshot harness's VERI_UI_EVAL).
(window as unknown as Record<string, unknown>)['__veriApp'] = app;
