---
id: DEC-132
type: decision
title: "One receipt parser: core's parseReceipts gains the date and summary the convention already writes"
status: proposed
created: 2026-08-27
updated: 2026-08-27
links:
  - id: WO-128
    rel: decided-during
  - id: REQ-041
    rel: constrains
  - id: DEC-081
    rel: consistent-with
---

## Choice

Implementing [[REQ-041]] item 3 (WO-128), receipts become data this way:

1. **The date and the summary are parsed once, in core.**
   `ParsedReceipt` gains `date: string | null` and `summary: string`
   alongside the `raw`/`shas`/`paths` it already carried, filled from the
   segmentation `parseReceipts` already computes. The convention is
   `date — SHA — files — summary` ([[DEC-003]]), and the parser was
   reading three of those four segments while discarding the other two;
   the new surface needs all four, so the fields land where the splitting
   already happens rather than beside it.
2. **Absent fields are null or empty, never guessed.** A first segment
   that is not a `YYYY-MM-DD` date yields `date: null`, and a receipt with
   no fourth segment yields `summary: ''`. Pre-convention receipts exist
   in this corpus and verify as far as they can (WO-044's posture); `raw`
   still carries their whole text, so nothing is lost by refusing to
   invent structure.
3. **The summary keeps every segment past the files, separators
   normalized to " — ".** Receipts in the wild run to five and six
   segments ("no code changes · verified live — …"); truncating at the
   fourth would silently drop the half that says what happened.
4. **`get_receipts` takes an optional id and answers in the enumeration
   surface's line form** ([[DEC-131]]): one receipt per line — work order,
   date, SHAs, files, summary last — under a count line that names both
   the receipt count and how many work orders filed them. The schema is
   `.strict()`, as every read tool's is.
5. **An empty answer is a statement, not an error.** An unknown id, an id
   naming a document that is not a work order, and a work order that has
   filed nothing all answer with the same empty result, worded to
   distinguish "filed none" from "no such id". Asking what WO-999 shipped
   is a question with an answer.
6. **The corpus-wide form excludes withdrawn work orders; asking by id
   still answers.** Out of play is out of the sweep ([[DEC-110]]), the
   rule `list_documents` already follows, but naming an id is asking for
   that document specifically.
7. **The SHAs are reported as filed and the answer says so.** The agent
   door runs no git ([[DEC-081]]), so the header line states that the SHAs
   are unverified rather than letting a reader assume this surface checked
   them. Verification stays the terminal `veri check` tier.

## Rejected alternatives

- **Re-split the receipt text in the new module instead of touching
  core** — leaves core untouched, but puts a second reader of the
  segment convention one package away from the first, so the two drift
  the day the convention gains a segment. WO-128 forbids a second
  receipt parser, and a partial one is still one.
- **Return `raw` alone and let the caller parse it** — smallest possible
  change, but it hands every consumer the markdown-parsing job the work
  order exists to remove; "receipts as data" that returns prose is the
  status quo with a tool name on it.
- **JSON payloads instead of lines** — unambiguous for the multi-valued
  SHA and file lists, but this is the same bulk-enumeration shape
  [[DEC-131]] costed at roughly three times the tokens per row, and the
  summary stays unescaped and last in the line form.
- **A new core function (`receiptEntries`) beside `parseReceipts`** —
  keeps `ParsedReceipt` frozen, but two functions over one convention is
  the drift the first alternative buys, with the duplication moved
  inside core where it is harder to see.
- **Group the answer as blocks per work order rather than one flat
  line per receipt** — reads slightly better for a single work order,
  but every row already carries its id, and a flat list is what a
  correlation pass wants to iterate.
- **Skip work orders whose receipts parse to nothing** — a tidier
  listing, but it would hide exactly the pre-convention receipts an
  archaeology walk is looking for; the line names its gaps instead.
- **Verify the SHAs against history before answering** — what the
  reader actually wants, and refused: [[DEC-081]] keeps the agent door
  subprocess-free, and changing that posture is the user's call, not an
  implementation detail.

## Rationale

The one-evaluation-site principle applies to parsing as much as to
verdicts: there is one receipt convention, so there should be one reader
of it, and the two fields this work order needed were already being
computed and thrown away. Adding them is additive for the three existing
callers and removes the only reason a second surface would have had to
learn the convention. Everything else here follows the neighbouring read
surface that shipped a day earlier — same line shape, same strict schema,
same refusal to answer a filter with a silent lie — so the enumeration
door and the receipt door read as one surface rather than two.
