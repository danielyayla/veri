---
id: DEC-043
type: decision
title: "Preview trigger is a pure reducer; dismissal rides capture listeners and the render pass"
status: proposed
created: 2026-08-18
updated: 2026-08-18
links:
  - id: WO-047
    rel: constrains
---

## Choice

The WO-047 hover-preview trigger is implemented as a pure reducer (previewStep) over explicit events (enter-chip, leave-chip, enter-pop, leave-pop, tick, dismiss) with timestamps passed in, plus previewDeadline computing the single next setTimeout; the DOM singleton around it is a thin shell. Dismissal integrates in two ways: document-level capture-phase listeners (scroll, mousedown, Escape — Escape is swallowed only when a popover is visible, so it closes just this layer and keeps focus in place), and an unconditional dismissPreview() at the top of every app render pass, which is what makes tab-switch dismiss immediately and keeps the popover from ever outliving its rebuilt anchor chip.

## Rejected alternatives

- **setTimeout/clearTimeout handles held directly in the DOM handlers** — the obvious implementation, but the timing rules become untestable without a DOM and real clocks, and the chip/popover interplay (out-clock cancelled by entering the popover) turns into scattered handle juggling
- **Registering the popover in the app's layer system (layerDefs/handleEscape)** — treats an aria-hidden, never-focusable presentation surface as a focus-managing layer; it would also force widgets.ts to depend on app.ts instead of the reverse
- **CSS-only hover delay (transition-delay on opacity/visibility)** — cannot express "counting chip and popover together", keyboard-focus parity, or one-popover-globally, and leaves the element in the tree intercepting pointer events
- **A MutationObserver to detect anchor detachment** — an indirect, always-on observer where one explicit dismissPreview() call at the render seam does the same job for free

## Rationale

The repo has no DOM test harness (node --test only), and SRC-021's timing rules (350ms uninterrupted in, 150ms out counted across chip and popover, one popover globally) are exactly the part that regresses silently. A reducer with injected clocks makes every timing rule a plain assertion. Registering in the app's layer system (layerDefs) was rejected because the popover is aria-hidden presentation that must never take or trap focus — it is not a layer in SRC-019's sense — while a capture-phase Escape still preserves the topmost-layer feel. Dismiss-on-render is the cheapest correct answer to the app's replaceChildren rebuild model: any render detaches the anchor, so the popover must drop regardless of why the render happened.
