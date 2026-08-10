/** App shell: state, topbar, sidebar, view switching, IPC wiring. */
import type { Issue, VeriDocument } from '@veri/core';
import type { ContextPackage, SearchHit } from '@veri/mcp';
import type { Snapshot } from '../lib/snapshot.ts';
import { api } from './api.ts';
import type { ProjectInfo, VeriApi } from './api.ts';
import { h } from './dom.ts';
import { TYPE_META, relTime } from './theme.ts';
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
  searchOpen: boolean;
  searchQuery: string;
  searchHits: SearchHit[];
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
    searchOpen: false,
    searchQuery: '',
    searchHits: [],
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
        this.update({ searchOpen: !this.state.searchOpen, searchQuery: '', searchHits: [] });
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        this.surfaceProjectError(this.api.openProjectFolder());
      } else if (e.ctrlKey && !e.metaKey && e.key === 'Tab') {
        // ⌃Tab / ⌃⇧Tab: cycle through the strip in order (SRC-004 recommended).
        e.preventDefault();
        this.applyTabs(cycleTab(this.tabState(), e.shiftKey ? -1 : 1));
      } else if (
        e.key === 'Escape' &&
        (this.state.searchOpen ||
          this.state.checkOpen ||
          this.state.projectSwitcherOpen ||
          this.state.agentsOpen ||
          this.state.projectError !== null)
      ) {
        this.update({ searchOpen: false, checkOpen: false, projectSwitcherOpen: false, agentsOpen: false, projectError: null });
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
      pinned link-open; browsing surfaces pass `preview`. */
  openDoc(id: string, opts: OpenDocOpts = {}): void {
    if (!this.byId.has(id)) return;
    this.applyTabs(openTab(this.tabState(), id, { ...opts, previewTabs: this.state.previewTabs }), {
      checkOpen: false,
      searchOpen: false,
      projectSwitcherOpen: false,
    });
  }

  setView(view: View): void {
    const closed = { checkOpen: false, searchOpen: false, projectSwitcherOpen: false };
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

    const searchPop = this.state.searchOpen ? this.searchPopover() : null;

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
          { class: 'tb-search', onClick: () => this.update({ searchOpen: true }) },
          h('span', {}, 'Search docs…'),
          h('span', { class: 'tb-kbd' }, '⌘K'),
        ),
        searchPop,
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

  private searchPopover(): HTMLElement {
    const input = h('input', {
      class: 'search-input',
      placeholder: 'Search docs…',
      value: this.state.searchQuery,
      onInput: (e) => {
        const q = (e.target as HTMLInputElement).value;
        this.state.searchQuery = q;
        void this.api.search(q).then((hits) => {
          if (this.state.searchQuery === q) this.update({ searchHits: hits });
        });
      },
      onKeydown: (e) => {
        if (e.key === 'Enter' && this.state.searchHits.length > 0) this.openDoc(this.state.searchHits[0].id, { preview: true });
      },
    }) as HTMLInputElement;
    queueMicrotask(() => input.focus());
    return h(
      'div',
      { class: 'search-pop' },
      input,
      ...this.state.searchHits.slice(0, 8).map((hit) =>
        h(
          'div',
          { class: 'search-row', onClick: (e) => this.openDoc(hit.id, { preview: true, background: e.metaKey || e.ctrlKey }) },
          h('span', { class: 'search-id', style: `color:${TYPE_META[hit.type as VeriDocument['type']]?.color ?? '#A09DA6'};` }, hit.id),
          h('span', { class: 'search-title' }, hit.title),
          h('span', { class: 'search-status' }, hit.status),
        ),
      ),
    );
  }

  private sidebar(): HTMLElement {
    const navDefs: Array<[View, string, string]> = [
      ['home', 'Documents', '≡'],
      ['board', 'Board', '▤'],
      ['graph', 'Graph', '◉'],
      ['decisions', 'Decisions', '§'],
    ];
    // Rule 9: the sidebar highlight tracks the active tab, not browsing history.
    const activeTab = this.state.activeTabId;
    const activeNav = (key: View): boolean =>
      key === 'home' ? activeTab !== null && !isViewKey(activeTab) : activeTab === key;

    const tree = TYPE_ORDER.map((type) => {
      const docs = this.snap.documents.filter((d) => d.type === type).sort((a, b) => a.id.localeCompare(b.id));
      if (docs.length === 0) return null;
      const meta = TYPE_META[type];
      return h(
        'div',
        { class: 'sb-group' },
        h(
          'div',
          { class: 'sb-group-head' },
          h('span', { class: 'sb-swatch', style: `background:${meta.color};` }),
          h('span', { class: 'sb-group-label' }, meta.group),
          h('span', { class: 'sb-group-count' }, String(docs.length)),
        ),
        ...docs.map((d) => {
          const active = activeTab === d.id;
          const health = (this.issues.get(d.id) ?? []).length > 0;
          const done = d.type === 'work-order' && d.status === 'done';
          return h(
            'div',
            {
              class: active ? 'sb-row sb-row-active' : 'sb-row',
              onClick: (e) => this.openDoc(d.id, { preview: true, background: e.metaKey || e.ctrlKey }),
            },
            h('span', { class: 'sb-row-id', style: `color:${meta.color};` }, d.id),
            h('span', { class: active ? 'sb-row-title sb-row-title-active' : 'sb-row-title' }, d.title),
            health ? h('span', { class: 'sb-health' }) : null,
            !health && done ? h('span', { class: 'sb-done' }, '✓') : null,
          );
        }),
      );
    });

    return h(
      'div',
      { class: 'sidebar' },
      h(
        'div',
        { class: 'sb-nav' },
        ...navDefs.map(([key, label, glyph]) =>
          h(
            'div',
            { class: activeNav(key) ? 'sb-nav-row sb-nav-row-active' : 'sb-nav-row', onClick: () => this.setView(key) },
            h('span', { class: 'sb-nav-glyph' }, glyph),
            h('span', {}, label),
          ),
        ),
      ),
      h('div', { class: 'sb-divider' }),
      h('div', { class: 'sb-tree' }, ...tree),
      this.mcpFooterRow(),
    );
  }

  /**
   * Sidebar footer: honest config state of the agent connection — a static
   * dot (no pulse: a pulse would imply liveness), never live client status.
   */
  private mcpFooterRow(): HTMLElement {
    const status = this.state.mcpStatus;
    const notSetup =
      status === null || status.state === 'missing' || status.state === 'no-entry';
    const healthy = status !== null && status.state === 'ok' && status.executableFound && status.rootMatches;
    const label = notSetup
      ? 'agent connection · not set up'
      : healthy
        ? 'agent connection · configured'
        : 'agent connection · needs attention';
    return h(
      'div',
      {
        class: this.state.activeTabId === 'mcp' ? 'sb-mcp sb-mcp-active' : 'sb-mcp',
        onClick: () => this.setView('mcp'),
      },
      h('span', { class: 'sb-mcp-dot', style: `background:${healthy ? '#7FAF8A' : '#D9A03F'};` }),
      h('span', { class: 'sb-mcp-label' }, label),
      h('span', { class: 'sb-mcp-arrow' }, '→'),
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
    this.root.replaceChildren(
      this.topbar(),
      h('div', { class: 'body' }, this.sidebar(), h('div', { class: 'editor-area' }, this.tabStrip(), screen)),
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
