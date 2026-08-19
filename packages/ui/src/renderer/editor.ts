/**
 * The CodeMirror 6 editor island (DEC-020, SRC-008): owns its DOM, cursor,
 * and undo history as an opaque widget inside the rebuild-from-state
 * renderer. The app treats it as a text buffer with callbacks; all approval
 * -boundary logic it enforces comes from editlogic.ts, mirroring core's
 * save-time guard. Styling lives in renderer/styles.css on .cm-* classes.
 */
import { EditorState, StateEffect, StateField, RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { Decoration, EditorView, MatchDecorator, ViewPlugin, keymap } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { acceptCompletion, autocompletion, completionKeymap } from '@codemirror/autocomplete';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { DocType } from '@veri/core';
import { compareIds } from '@veri/core/ids';
import { GUARD_NOTICE, frontmatterRegion, guardedRanges, touchedGuard } from './editlogic.ts';

export interface EditorDocRef {
  id: string;
  title: string;
  type: DocType;
}

export interface EditorHooks {
  /** Live project docs, for `[[` autocomplete and link resolution. */
  docs(): EditorDocRef[];
  /** Dirty-state changes (tab dot, status row). */
  onDirty(dirty: boolean): void;
  /** Guard rejections and other transient notices for the status row. */
  onNotice(text: string): void;
  /** ⌘-click on a `[[ID]]` link — background tab per SRC-004 rule 4. */
  /** ⌘-click follow (SRC-018: in place); background=true on ⌘⌥-click. */
  onNavigate(id: string, background: boolean): void;
}

/** Markdown source palette per SRC-008 — marks recede, headings assert. */
const mdHighlight = HighlightStyle.define([
  { tag: tags.heading, color: '#E7E4DE', fontWeight: '600' },
  { tag: tags.strong, color: '#E7E4DE', fontWeight: '600' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.monospace, color: '#A09DA6' },
  { tag: tags.processingInstruction, color: '#55525E' },
  { tag: tags.punctuation, color: '#55525E' },
  { tag: tags.meta, color: '#55525E' },
  { tag: tags.quote, color: '#8B8893' },
  { tag: tags.link, color: '#E8703A' },
  { tag: tags.url, color: '#E8703A' },
]);

const WIKI_RE = /\[\[((?:REQ|DEC|WO|SRC|WF)-\d{3,})\]\]/g;

const TYPE_CLASS: Record<string, string> = {
  requirement: 'cm-wl-req',
  decision: 'cm-wl-dec',
  'work-order': 'cm-wl-wo',
  source: 'cm-wl-src',
  workflow: 'cm-wl-wf',
};

/** Amber flash on a rejected guarded line (SRC-008), cleared after 300ms. */
const flashEffect = StateEffect.define<{ from: number; to: number } | null>();
const flashField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(flashEffect)) {
        if (effect.value === null) return Decoration.none;
        const line = tr.state.doc.lineAt(Math.min(effect.value.from, tr.state.doc.length));
        return Decoration.set([Decoration.line({ class: 'cm-guard-flash' }).range(line.from)]);
      }
    }
    return value.map(tr.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

export class EditorIsland {
  readonly view: EditorView;
  /** The veri/-relative path this buffer belongs to. */
  readonly file: string;
  /** Last known-saved content — the dirty baseline and the diff base for
      external-change reconciliation. */
  baseText: string;
  /** Disk content acknowledged by "Keep mine" (editlogic.reconcileDisk). */
  ackDisk: string | null = null;
  private dirty = false;
  private readonly hooks: EditorHooks;
  private flashTimer: ReturnType<typeof setTimeout> | undefined;
  private scrollTop = 0;

  constructor(file: string, text: string, hooks: EditorHooks) {
    this.file = file;
    this.baseText = text;
    this.hooks = hooks;
    this.view = new EditorView({
      state: EditorState.create({ doc: text, extensions: this.extensions() }),
    });
  }

  get text(): string {
    return this.view.state.doc.toString();
  }

  get isDirty(): boolean {
    return this.dirty;
  }

  /** After a save or an accepted reload: the buffer and baseline become
      `text`; cursor stays put (clamped) and undo history survives. */
  markSaved(text: string): void {
    this.baseText = text;
    this.ackDisk = null;
    if (this.text !== text) {
      const head = Math.min(this.view.state.selection.main.head, text.length);
      this.view.dispatch({
        changes: { from: 0, to: this.view.state.doc.length, insert: text },
        selection: { anchor: head },
      });
    }
    this.setDirty(false);
  }

  focus(): void {
    this.view.focus();
  }

  /** The island's DOM moves between renders; scrollTop does not survive
      detachment, so the app shell brackets renders with these. */
  saveScroll(): void {
    this.scrollTop = this.view.scrollDOM.scrollTop;
  }

  restoreScroll(): void {
    this.view.scrollDOM.scrollTop = this.scrollTop;
  }

  destroy(): void {
    clearTimeout(this.flashTimer);
    this.view.destroy();
  }

  private setDirty(dirty: boolean): void {
    if (this.dirty !== dirty) {
      this.dirty = dirty;
      this.hooks.onDirty(dirty);
    }
  }

  private extensions(): Extension[] {
    return [
      history(),
      keymap.of([{ key: 'Tab', run: acceptCompletion }, ...completionKeymap, ...defaultKeymap, ...historyKeymap]),
      markdown(),
      syntaxHighlighting(mdHighlight),
      EditorView.lineWrapping,
      autocompletion({ override: [(ctx) => this.wikiCompletions(ctx)], icons: false, optionClass: optionClass }),
      this.guardFilter(),
      flashField,
      frontmatterDecorations,
      this.wikiDecorations(),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) this.setDirty(this.text !== this.baseText);
      }),
      EditorView.domEventHandlers({
        mousedown: (event, view) => {
          if (!event.metaKey && !event.ctrlKey) return false;
          const id = wikiIdAt(view, event);
          if (id === null || !this.hooks.docs().some((d) => d.id === id)) return false;
          event.preventDefault();
          this.hooks.onNavigate(id, event.altKey);
          return true;
        },
      }),
    ];
  }

  /** The in-editor face of the approval boundary (REQ-009 §4): edits touching
      a guarded frontmatter line are dropped, the line flashes amber, and the
      status row explains. Core's save guard backs this up at the IPC. */
  private guardFilter(): Extension {
    return EditorState.changeFilter.of((tr) => {
      if (!tr.docChanged) return true;
      const guards = guardedRanges(tr.startState.doc.toString());
      if (guards.length === 0) return true;
      const changed: Array<{ from: number; to: number }> = [];
      tr.changes.iterChanges((fromA, toA) => changed.push({ from: fromA, to: toA }));
      const hit = touchedGuard(changed, guards);
      if (hit === null) return true;
      // Dispatching inside a filter is illegal; flash and notify on a tick.
      setTimeout(() => {
        this.view.dispatch({ effects: flashEffect.of({ from: hit.from, to: hit.to }) });
        clearTimeout(this.flashTimer);
        this.flashTimer = setTimeout(() => this.view.dispatch({ effects: flashEffect.of(null) }), 300);
        this.hooks.onNotice(GUARD_NOTICE[hit.key]);
      }, 0);
      return false;
    });
  }

  /** `[[` autocomplete (REQ-009 §3): filter on id and title, insert a
      complete link. Zero matches → no popover, novel ids type freely. */
  private wikiCompletions(context: CompletionContext): CompletionResult | null {
    const match = context.matchBefore(/\[\[[A-Za-z0-9-]*/);
    if (match === null) return null;
    const query = match.text.slice(2).toLowerCase();
    const items = this.hooks
      .docs()
      .filter((d) => `${d.id} ${d.title}`.toLowerCase().includes(query))
      .sort((a, b) => compareIds(a.id, b.id))
      .slice(0, 8);
    if (items.length === 0) return null;
    return {
      from: match.from + 2,
      filter: false,
      options: items.map((d) => ({ label: d.id, detail: d.title, type: d.type, apply: `${d.id}]] ` })),
    };
  }

  /** Type-colored `[[ID]]` marks; unresolved ids go amber (SRC-008). */
  private wikiDecorations(): Extension {
    const decorator = new MatchDecorator({
      regexp: WIKI_RE,
      decorate: (add, from, to, match) => {
        const id = match[1];
        const known = this.hooks.docs().find((d) => d.id === id);
        const cls = known !== undefined ? TYPE_CLASS[known.type] : 'cm-wl-bad';
        add(from, from + 2, Decoration.mark({ class: 'cm-wl-mark' }));
        add(from + 2, to - 2, Decoration.mark({ class: `cm-wl ${cls}`, attributes: { title: known !== undefined ? `⌘-click to open ${id}` : `unresolved: ${id}` } }));
        add(to - 2, to, Decoration.mark({ class: 'cm-wl-mark' }));
      },
    });
    return ViewPlugin.define(
      (view) => ({
        decorations: decorator.createDeco(view),
        update(update: ViewUpdate) {
          this.decorations = decorator.updateDeco(update, this.decorations);
        },
      }),
      { decorations: (v) => v.decorations },
    );
  }
}

function optionClass(completion: { type?: string }): string {
  return completion.type !== undefined ? `cm-ac-${completion.type}` : '';
}

/** The `[[ID]]` under a mouse event, if any. */
function wikiIdAt(view: EditorView, event: MouseEvent): string | null {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
  if (pos === null) return null;
  const line = view.state.doc.lineAt(pos);
  for (const match of line.text.matchAll(WIKI_RE)) {
    const from = line.from + (match.index ?? 0);
    if (pos >= from && pos <= from + match[0].length) return match[1];
  }
  return null;
}

/**
 * Frontmatter zone rendering (SRC-008): mono machine-zone lines, ghosted
 * guarded lines, faint fences, keys dimmer than values. Line + mark
 * decorations recomputed on doc changes only.
 */
const frontmatterDecorations = ViewPlugin.define(
  (view) => ({
    decorations: buildFrontmatterDeco(view),
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = buildFrontmatterDeco(update.view);
    },
  }),
  { decorations: (v) => v.decorations },
);

function buildFrontmatterDeco(view: EditorView): DecorationSet {
  const text = view.state.doc.toString();
  const region = frontmatterRegion(text);
  if (region === null) return Decoration.none;
  const guards = guardedRanges(text);
  const builder = new RangeSetBuilder<Decoration>();
  let pos = 0;
  for (let n = 1; n <= view.state.doc.lines; n++) {
    const line = view.state.doc.line(n);
    pos = line.from;
    if (pos >= region.to) break;
    const guarded = guards.some((g) => g.from === line.from);
    const fence = /^---\s*$/.test(line.text);
    builder.add(
      line.from,
      line.from,
      Decoration.line({ class: `cm-fm${guarded ? ' cm-fm-guarded' : ''}${fence ? ' cm-fm-fence' : ''}` }),
    );
    if (!fence) {
      const key = /^(\s*-?\s*[A-Za-z_][\w-]*:)/.exec(line.text);
      if (key !== null) {
        builder.add(line.from, line.from + key[1].length, Decoration.mark({ class: 'cm-fm-key' }));
      }
    }
  }
  return builder.finish();
}
