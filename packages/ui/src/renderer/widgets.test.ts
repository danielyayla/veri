/** Hover preview logic (WO-047, SRC-021): the trigger state machine and the
    popover's content assembly — the pure halves of the widget. */
import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import type { VeriDocument } from '@verikb/core';
import {
  PREVIEW_IDLE,
  PREVIEW_IN_MS,
  PREVIEW_OUT_MS,
  excerptBlocks,
  previewContent,
  previewDeadline,
  previewStep,
} from './widgets.ts';
import type { PreviewEvent, PreviewState } from './widgets.ts';

/** Run a sequence of events through the machine. */
const run = (evs: PreviewEvent[], start: PreviewState = PREVIEW_IDLE): PreviewState =>
  evs.reduce(previewStep, start);

describe('preview trigger — hover in', () => {
  it('opens after 350ms of uninterrupted hover', () => {
    let s = run([{ kind: 'enter-chip', id: 'REQ-001', now: 0 }]);
    strictEqual(s.openId, null);
    strictEqual(previewDeadline(s), PREVIEW_IN_MS);
    s = previewStep(s, { kind: 'tick', now: PREVIEW_IN_MS });
    strictEqual(s.openId, 'REQ-001');
    strictEqual(previewDeadline(s), null);
  });

  it('a quick pass over a trail of chips shows nothing', () => {
    const s = run([
      { kind: 'enter-chip', id: 'REQ-001', now: 0 },
      { kind: 'leave-chip', now: 60 },
      { kind: 'enter-chip', id: 'DEC-002', now: 80 },
      { kind: 'leave-chip', now: 140 },
      { kind: 'enter-chip', id: 'WO-003', now: 160 },
      { kind: 'leave-chip', now: 220 },
    ]);
    strictEqual(s.openId, null);
    strictEqual(s.pendingId, null);
    strictEqual(previewDeadline(s), null);
  });

  it('re-entering restarts the uninterrupted-hover clock', () => {
    const s = run([
      { kind: 'enter-chip', id: 'REQ-001', now: 0 },
      { kind: 'leave-chip', now: 300 },
      { kind: 'enter-chip', id: 'REQ-001', now: 320 },
    ]);
    strictEqual(previewDeadline(s), 320 + PREVIEW_IN_MS);
    strictEqual(previewStep(s, { kind: 'tick', now: 350 }).openId, null);
    strictEqual(previewStep(s, { kind: 'tick', now: 670 }).openId, 'REQ-001');
  });
});

describe('preview trigger — hover out', () => {
  const open = run([
    { kind: 'enter-chip', id: 'REQ-001', now: 0 },
    { kind: 'tick', now: PREVIEW_IN_MS },
  ]);

  it('closes 150ms after leaving chip and popover both', () => {
    let s = previewStep(open, { kind: 'leave-chip', now: 400 });
    strictEqual(previewDeadline(s), 400 + PREVIEW_OUT_MS);
    s = previewStep(s, { kind: 'tick', now: 550 });
    strictEqual(s.openId, null);
  });

  it('moving from chip into the popover keeps it open; entering never pins it', () => {
    let s = previewStep(open, { kind: 'leave-chip', now: 400 });
    s = previewStep(s, { kind: 'enter-pop', now: 480 });
    strictEqual(previewDeadline(s), null); // close cancelled
    s = previewStep(s, { kind: 'leave-pop', now: 900 });
    strictEqual(previewDeadline(s), 900 + PREVIEW_OUT_MS);
    s = previewStep(s, { kind: 'tick', now: 1050 });
    strictEqual(s.openId, null);
  });

  it('returning to the open chip cancels the close without a new pending open', () => {
    let s = previewStep(open, { kind: 'leave-chip', now: 400 });
    s = previewStep(s, { kind: 'enter-chip', id: 'REQ-001', now: 450 });
    strictEqual(s.openId, 'REQ-001');
    strictEqual(s.pendingId, null);
    strictEqual(previewDeadline(s), null);
  });

  it('moving to another chip: the old closes on its clock, the new opens on its own', () => {
    let s = previewStep(open, { kind: 'leave-chip', now: 400 });
    s = previewStep(s, { kind: 'enter-chip', id: 'DEC-002', now: 420 });
    // Old close (550) precedes new open (770).
    strictEqual(previewDeadline(s), 550);
    s = previewStep(s, { kind: 'tick', now: 550 });
    strictEqual(s.openId, null);
    strictEqual(s.pendingId, 'DEC-002');
    s = previewStep(s, { kind: 'tick', now: 770 });
    strictEqual(s.openId, 'DEC-002');
  });

  it('one popover globally: an open deadline replaces whatever is showing', () => {
    let s = previewStep(open, { kind: 'enter-chip', id: 'DEC-002', now: 400 });
    s = previewStep(s, { kind: 'tick', now: 750 });
    strictEqual(s.openId, 'DEC-002');
    strictEqual(s.pendingId, null);
  });
});

describe('preview trigger — dismissal', () => {
  it('dismiss (Escape, scroll, click, tab-switch) resets everything at once', () => {
    const s = run([
      { kind: 'enter-chip', id: 'REQ-001', now: 0 },
      { kind: 'tick', now: 350 },
      { kind: 'enter-chip', id: 'DEC-002', now: 400 },
      { kind: 'dismiss' },
    ]);
    deepStrictEqual(s, PREVIEW_IDLE);
    strictEqual(previewDeadline(s), null);
  });

  it('idle state schedules nothing', () => {
    strictEqual(previewDeadline(PREVIEW_IDLE), null);
  });
});

const doc = (body: string): VeriDocument => ({
  id: 'REQ-001',
  type: 'requirement',
  title: 'Linked markdown document format',
  status: 'accepted',
  created: '2026-08-01',
  updated: '2026-08-18',
  links: [],
  frontmatter: {},
  body,
  file: 'requirements/REQ-001.md',
  inlineRefs: [],
});

describe('preview content assembly', () => {
  it('takes the first two blocks of the first section', () => {
    const blocks = excerptBlocks('One para about [[DEC-002]].\n\nSecond para.\n\nThird para.');
    strictEqual(blocks.length, 2);
    strictEqual(blocks[0].kind, 'para');
    strictEqual(blocks[1].kind, 'para');
  });

  it('stops at the first ## heading even before two blocks', () => {
    const blocks = excerptBlocks('Lead paragraph.\n\n## Acceptance criteria\n\n- [ ] never shown');
    strictEqual(blocks.length, 1);
  });

  it('a body that opens with a heading has an empty excerpt', () => {
    deepStrictEqual(excerptBlocks('## Summary\n\nText under the heading.'), []);
  });

  it('non-para blocks count too — a quote then a list item', () => {
    const blocks = excerptBlocks('> Drafted by an agent.\n\n- first item\n- second item');
    strictEqual(blocks[0].kind, 'quote');
    strictEqual(blocks[1].kind, 'li');
    strictEqual(blocks.length, 2);
  });

  it('assembles the header vocabulary from the document itself', () => {
    const c = previewContent(doc('Lead.\n\nMore.'));
    strictEqual(c.id, 'REQ-001');
    strictEqual(c.type, 'requirement');
    strictEqual(c.status, 'accepted');
    strictEqual(c.title, 'Linked markdown document format');
    strictEqual(c.blocks.length, 2);
  });
});
