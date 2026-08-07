/** App shell: state, topbar, sidebar, view switching, IPC wiring. */
import type { Issue, VeriDocument } from '@veri/core';
import type { ContextPackage, SearchHit } from '@veri/mcp';
import type { Snapshot } from '../lib/snapshot.ts';
import { api } from './api.ts';
import type { VeriApi } from './api.ts';
import { h } from './dom.ts';
import { TYPE_META, relTime } from './theme.ts';
import { docsById, issueDocId, issuesByDoc, packageSummary } from './derive.ts';
import type { ActivityRow, DocsById, PackageSummary } from './derive.ts';
import { readerView } from './views/reader.ts';
import { workOrderView } from './views/workorder.ts';
import { boardView } from './views/board.ts';
import { graphView } from './views/graph.ts';
import { decisionsView } from './views/decisions.ts';

export type View = 'home' | 'workorder' | 'board' | 'graph' | 'decisions';

export interface State {
  view: View;
  docId: string | null;
  expanded: Set<string>;
  graphSel: string | null;
  editorText: string;
  editorFocused: boolean;
  copied: boolean;
  mcpShown: boolean;
  checkOpen: boolean;
  searchOpen: boolean;
  searchQuery: string;
  searchHits: SearchHit[];
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
  openDoc(id: string): void;
  setView(view: View): void;
  refresh(): Promise<void>;
  loadPackage(id: string): void;
  flashCopied(): void;
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
    view: 'home',
    docId: null,
    expanded: new Set(),
    graphSel: null,
    editorText: '',
    editorFocused: false,
    copied: false,
    mcpShown: false,
    checkOpen: false,
    searchOpen: false,
    searchQuery: '',
    searchHits: [],
  };
  private sessionActivity = new Map<string, ActivityRow[]>();
  private copyTimer: ReturnType<typeof setTimeout> | undefined;
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async boot(): Promise<void> {
    this.applySnapshot(await this.api.snapshot());
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    const doc = params.get('doc');
    if (doc !== null && this.byId.has(doc)) this.openDoc(doc);
    if (view !== null && ['home', 'workorder', 'board', 'graph', 'decisions'].includes(view)) {
      this.state.view = view as View;
    }
    this.api.onChanged(() => void this.refresh());
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.update({ searchOpen: !this.state.searchOpen, searchQuery: '', searchHits: [] });
      } else if (e.key === 'Escape' && (this.state.searchOpen || this.state.checkOpen)) {
        this.update({ searchOpen: false, checkOpen: false });
      }
    });
    this.render();
  }

  private applySnapshot(snap: Snapshot): void {
    this.snap = snap;
    this.byId = docsById(snap);
    this.issues = issuesByDoc(snap);
    this.pkg.clear();
    if (this.state.docId === null || !this.byId.has(this.state.docId)) {
      this.state.docId = this.firstDocId();
      if (this.state.docId !== null && this.byId.get(this.state.docId)!.type === 'work-order') {
        this.state.view = 'workorder';
      }
    }
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

  openDoc(id: string): void {
    const doc = this.byId.get(id);
    if (doc === undefined) return;
    this.update({
      view: doc.type === 'work-order' ? 'workorder' : 'home',
      docId: id,
      checkOpen: false,
      searchOpen: false,
      graphSel: null,
      editorText: '',
      editorFocused: false,
      copied: false,
      mcpShown: false,
    });
  }

  setView(view: View): void {
    if (view === 'home' && this.doc()?.type === 'work-order') {
      // Documents nav: land on the first non-WO doc rather than bouncing back to the WO detail.
      const first = this.snap.documents
        .filter((d) => d.type !== 'work-order')
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      this.update({ view, docId: first?.id ?? this.state.docId, checkOpen: false, graphSel: null });
      return;
    }
    this.update({ view, checkOpen: false, graphSel: null });
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

  flashCopied(): void {
    clearTimeout(this.copyTimer);
    this.update({ copied: true });
    this.copyTimer = setTimeout(() => this.update({ copied: false }), 1800);
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
            { class: 'tb-health', onClick: () => this.update({ checkOpen: !this.state.checkOpen }) },
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
                  if (docId !== null) this.openDoc(docId);
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
        h('span', { class: 'tb-project' }, this.snap.projectName),
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
        if (e.key === 'Enter' && this.state.searchHits.length > 0) this.openDoc(this.state.searchHits[0].id);
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
          { class: 'search-row', onClick: () => this.openDoc(hit.id) },
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
    const activeNav = (key: View): boolean =>
      this.state.view === key || (key === 'home' && this.state.view === 'workorder');

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
          const active = this.state.docId === d.id && (this.state.view === 'home' || this.state.view === 'workorder');
          const health = (this.issues.get(d.id) ?? []).length > 0;
          const done = d.type === 'work-order' && d.status === 'done';
          return h(
            'div',
            { class: active ? 'sb-row sb-row-active' : 'sb-row', onClick: () => this.openDoc(d.id) },
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
      h(
        'div',
        { class: 'sb-footer' },
        h('span', { class: 'sb-pulse' }),
        h('span', {}, 'mcp · veri-mcp · stdio'),
      ),
    );
  }

  render(): void {
    const view = this.state.view;
    let screen: HTMLElement;
    if (view === 'workorder' && this.doc()?.type === 'work-order') screen = workOrderView(this);
    else if (view === 'board') screen = boardView(this);
    else if (view === 'graph') screen = graphView(this);
    else if (view === 'decisions') screen = decisionsView(this);
    else screen = readerView(this);
    this.root.replaceChildren(this.topbar(), h('div', { class: 'body' }, this.sidebar(), screen));
    this.state.editorFocused = false;
  }
}

const app = new App(document.getElementById('app')!);
void app.boot();
// Console/debug handle (used by the screenshot harness's VERI_UI_EVAL).
(window as unknown as Record<string, unknown>)['__veriApp'] = app;
