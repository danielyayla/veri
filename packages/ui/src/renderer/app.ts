/** App shell: state, topbar, sidebar, view switching, IPC wiring. */
import type { DocType, Issue, VeriDocument } from '@veri/core';
import type { ContextPackage, PaletteResult } from '@veri/mcp';
import type { Snapshot } from '../lib/snapshot.ts';
import { api } from './api.ts';
import type { ProjectInfo, VeriApi } from './api.ts';
import { h } from './dom.ts';
import { TYPE_META, relTime, statusColor, tint } from './theme.ts';
import { docsById, issueDocId, issuesByDoc, packageSummary } from './derive.ts';
import type { ActivityRow, DocsById, PackageSummary } from './derive.ts';
import type { McpStatus } from '../lib/mcpconfig.ts';
import type { AgentInfo } from '../lib/agents.ts';
import { kickoffPrompt } from './derive.ts';
import { readerView } from './views/reader.ts';
import { mcpView } from './views/mcp.ts';
import { workOrderView } from './views/workorder.ts';
import { boardView } from './views/board.ts';
import { graphView } from './views/graph.ts';
import { decisionsView } from './views/decisions.ts';
import { VIEW_META, activateTab, closeTab, cycleTab, isViewKey, openTab, pinTab, reorderTab, retainTabs } from './tabs.ts';
import type { Tab, TabState } from './tabs.ts';
import { paletteRows } from './palette.ts';
import type { PaletteRow } from './palette.ts';
import { DEAD_LABEL, isLiving, pushRecent, treeSection, visibleRecents } from './sidebar.ts';

export type View = 'home' | 'workorder' | 'board' | 'graph' | 'decisions' | 'mcp';

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
  checkOpen: boolean;
  /** Working set (WO-014): per-project pins and recents, persisted in userData. */
  pinned: string[];
  recents: string[];
  /** Sidebar session state (WO-014): per-type collapse and dead-doc expansion. */
  sectionCollapsed: Partial<Record<DocType, boolean>>;
  showDead: Partial<Record<DocType, boolean>>;
  /** Which rail item's instant tooltip is showing (view key or 'mcp'). */
  railTip: string | null;
  /** Command palette (WO-013): overlay flag, raw query, selection, ranked result. */
  paletteOpen: boolean;
  paletteQuery: string;
  paletteSel: number;
  paletteResult: PaletteResult | null;
  projectSwitcherOpen: boolean;
  projectError: string | null;
  mcpStatus: McpStatus | null;
  /** Drives the restart banner; cleared by re-run checks or leaving the panel. */
  mcpWrote: boolean;
  /** Drives the external-edit banner; cleared by re-run checks. */
  mcpExternal: boolean;
  mcpBuildCopied: boolean;
  mcpCmdCopied: boolean;
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
  flashMcpCmdCopied(): void;
  sessionLog(id: string, row: ActivityRow): void;
  sessionRows(id: string): ActivityRow[];
  rel(date: string): string;
}

const TYPE_ORDER = ['requirement', 'decision', 'work-order', 'source'] as const;

class App implements Ctx {
  snap!: Snapshot;
  byId!: DocsById;
  issues!: Map<string, Issue[]>;
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
    checkOpen: false,
    pinned: [],
    recents: [],
    sectionCollapsed: { source: true },
    showDead: {},
    railTip: null,
    paletteOpen: false,
    paletteQuery: '',
    paletteSel: 0,
    paletteResult: null,
    projectSwitcherOpen: false,
    projectError: null,
    mcpStatus: null,
    mcpWrote: false,
    mcpExternal: false,
    mcpBuildCopied: false,
    mcpCmdCopied: false,
  };
  private sessionActivity = new Map<string, ActivityRow[]>();
  /** Doc-tab activation order, most recent first — drives the Documents nav. */
  private docMru: string[] = [];
  private dragIdx: number | null = null;
  private pinDragIdx: number | null = null;
  /** The rendered palette rows' open actions, for the global Enter handler. */
  private palRowActions: Array<{ open(pinned: boolean): void }> = [];
  /** Per-tab scroll positions (SRC-004 "State Management"), saved on re-render. */
  private scrollPos = new Map<string, number[]>();
  private sidebarScroll = 0;
  private renderedTabId: string | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | undefined;
  private kickoffTimer: ReturnType<typeof setTimeout> | undefined;
  private mcpCmdTimer: ReturnType<typeof setTimeout> | undefined;
  private root: HTMLElement;
  private recentProjects: ProjectInfo[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async boot(): Promise<void> {
    this.applySnapshot(await this.api.snapshot());
    // Workspace state must land before any openDoc call feeds the recents.
    const ws = await this.api.workspaceLoad();
    this.state.pinned = ws.pinned.filter((id) => this.byId.has(id));
    this.state.recents = ws.recents.filter((id) => this.byId.has(id));
    await this.refreshMcp();
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    const doc = params.get('doc');
    if (doc !== null && this.byId.has(doc)) this.openDoc(doc);
    if (view !== null && isViewKey(view)) this.applyTabs(openTab(this.tabState(), view));
    if (this.state.tabs.length === 0) {
      const first = this.firstDocId();
      if (first !== null) this.openDoc(first, { preview: true });
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
        (this.state.checkOpen ||
          this.state.projectSwitcherOpen ||
          this.state.agentsOpen ||
          this.state.projectError !== null)
      ) {
        this.update({ checkOpen: false, projectSwitcherOpen: false, agentsOpen: false, projectError: null });
      }
    });
    document.addEventListener('click', () => {
      if (this.state.projectSwitcherOpen || this.state.agentsOpen || this.state.projectError !== null) {
        this.update({ projectSwitcherOpen: false, agentsOpen: false, projectError: null });
      }
    });
    this.render();
  }

  private applySnapshot(snap: Snapshot): void {
    this.snap = snap;
    this.byId = docsById(snap);
    this.issues = issuesByDoc(snap);
    this.pkg.clear();
    // Tabs for deleted docs close like a × click; no render here (callers render).
    Object.assign(this.state, this.activationPatch(retainTabs(this.tabState(), (id) => this.byId.has(id))));
    if (this.state.docId !== null && !this.byId.has(this.state.docId)) this.state.docId = null;
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
      checkOpen: false,
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
    const closed = { checkOpen: false, projectSwitcherOpen: false };
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

  /** Leaving the agent-connection panel dismisses its banners (SRC-002). */
  private leaveMcpPatch(): Partial<State> {
    return this.state.view === 'mcp' ? { mcpWrote: false, mcpExternal: false, mcpBuildCopied: false } : {};
  }

  async refresh(): Promise<void> {
    this.applySnapshot(await this.api.snapshot());
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
  }

  sessionRows(id: string): ActivityRow[] {
    return this.sessionActivity.get(id) ?? [];
  }

  rel = (date: string): string => relTime(date);

  // ---- rendering ----

  private topbar(): HTMLElement {
    const issueCount = this.snap.issues.length;
    const git = this.snap.git;
    const healthChip =
      issueCount > 0
        ? h(
            'div',
            {
              class: 'tb-health',
              onClick: () => this.update({ checkOpen: !this.state.checkOpen, projectSwitcherOpen: false }),
            },
            h('span', { class: 'tb-health-dot' }),
            h('span', {}, `veri check · ${issueCount} issue${issueCount === 1 ? '' : 's'}`),
          )
        : null;
    const checkPop = this.state.checkOpen
      ? h(
          'div',
          { class: 'tb-pop' },
          h('div', { class: 'tb-pop-label' }, `VERI CHECK — ${issueCount} ISSUE${issueCount === 1 ? '' : 'S'}`),
          ...this.snap.issues.map((issue) => {
            const docId = issueDocId(this.snap, issue);
            return h(
              'div',
              {
                class: 'tb-pop-row',
                onClick: () => {
                  if (docId !== null) this.openDoc(docId, { preview: true });
                },
              },
              h('span', { class: 'tb-pop-dot' }),
              h(
                'div',
                {},
                h('div', { class: 'tb-pop-id' }, docId ?? issue.kind),
                h('div', { class: 'tb-pop-msg' }, issue.message),
              ),
            );
          }),
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
      ), checkPop),
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
    this.update({ projectSwitcherOpen: opening, checkOpen: false, projectError: null });
  }

  /** Show the error a switch/open attempt resolves to (null means success or cancel). */
  private surfaceProjectError(result: Promise<string | null>): void {
    void result.then((err) => {
      if (err !== null) this.update({ projectError: err });
    });
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
        h('span', { class: 'proj-open-plus' }, '+'),
        h('span', {}, 'Open project folder…'),
        h('span', { class: 'proj-kbd' }, '⌘O'),
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
    if (row.kind === 'view') {
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
            doc !== null ? doc.status : 'view',
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
          h('span', { class: 'pal-foot-grammar' }, 'req: dec: wo: src: · is:done is:active is:backlog'),
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

    const tree = TYPE_ORDER.map((type) => {
      const all = this.snap.documents.filter((d) => d.type === type);
      if (all.length === 0) return null;
      const meta = TYPE_META[type];
      const showDead = this.state.showDead[type] === true;
      const collapsed = this.state.sectionCollapsed[type] === true;
      const sec = treeSection(this.snap.documents, type, showDead);
      const rows = collapsed
        ? []
        : sec.shown.map((d) => {
            const active = activeTab === d.id;
            const health = (this.issues.get(d.id) ?? []).length > 0;
            const dead = !isLiving(d);
            return h(
              'div',
              {
                class: active ? 'sb-row sb-row-active' : 'sb-row',
                onClick: (e) => this.openDoc(d.id, { preview: true, background: e.metaKey || e.ctrlKey }),
              },
              h('span', { class: 'sb-row-id', style: `color:${meta.color};` }, d.id),
              h('span', { class: active ? 'sb-row-title sb-row-title-active' : 'sb-row-title' }, d.title),
              health ? h('span', { class: 'sb-health' }) : null,
              !health && dead ? h('span', { class: 'sb-done' }, '✓') : null,
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
        ),
        ...rows,
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
    const close = (): void => this.applyTabs(closeTab(this.tabState(), t.id));
    return h(
      'div',
      {
        class: `tab${active ? ' tab-active' : ''}${t.preview ? ' tab-preview' : ''}`,
        title: (view !== null ? title : `${t.id} — ${title}`) + (t.preview ? ' · preview — double-click to keep open' : ''),
        draggable: true,
        onClick: () => this.applyTabs(activateTab(this.tabState(), t.id)),
        onDblclick: () => this.applyTabs(pinTab(activateTab(this.tabState(), t.id), t.id)),
        onMousedown: (e) => {
          if (e.button === 1) {
            e.preventDefault();
            close();
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
          title: 'Close tab',
          onClick: (e) => {
            e.stopPropagation();
            close();
          },
        },
        '×',
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
  private static readonly SCROLL_SEL = '.reader, .panel-right, .screen-board, .screen-decisions, .mcp-view';

  render(): void {
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

    const view = this.state.view;
    let screen: HTMLElement;
    if (this.state.tabs.length === 0) screen = this.emptyState();
    else if (view === 'workorder' && this.doc()?.type === 'work-order') screen = workOrderView(this);
    else if (view === 'mcp') screen = mcpView(this);
    else if (view === 'board') screen = boardView(this);
    else if (view === 'graph') screen = graphView(this);
    else if (view === 'decisions') screen = decisionsView(this);
    else screen = readerView(this);
    const palette = this.paletteEl();
    this.root.replaceChildren(
      this.topbar(),
      h('div', { class: 'body' }, this.rail(), this.sidebar(), h('div', { class: 'editor-area' }, this.tabStrip(), screen)),
      ...(palette !== null ? [palette] : []),
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
  }
}

const app = new App(document.getElementById('app')!);
void app.boot();
// Console/debug handle (used by the screenshot harness's VERI_UI_EVAL).
(window as unknown as Record<string, unknown>)['__veriApp'] = app;
