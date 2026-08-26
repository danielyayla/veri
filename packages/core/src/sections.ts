/**
 * The one section-splice implementation (DEC-100): every surface that appends
 * a dated line under a `## Heading` — receipts (mcp), notes and review notes
 * (ui) — calls this instead of keeping its own copy. Entry-line composition
 * stays with the caller; the seam is the splice.
 *
 * The same boundary rule serves readers (WO-112): `sectionSpan` is the one
 * answer to "where does `## Heading` start and end", so slicing a section out
 * and splicing a line into it can never disagree about what the section is.
 */

export interface AppendToSectionOptions {
  /** A placeholder line to strip when the section still holds it, e.g. "(none yet)". */
  placeholder?: string;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Where a `## Heading` section begins and ends within a document. */
export interface SectionSpan {
  /** Index of the heading line's first character. */
  start: number;
  /** Index just past the heading line's text, before its newline. */
  afterHeading: number;
  /** Index where the section ends: the next `##` heading, or end of document. */
  end: number;
}

/**
 * Locate a `## {heading}` section, or null when the document has no such
 * heading. The match is exact — the heading line and nothing else, so
 * `### {heading}` and prose mentions never match — and the section runs to
 * the next `##` heading at any level of the document, or to its end.
 */
export function sectionSpan(content: string, heading: string): SectionSpan | null {
  const match = new RegExp(`^##[ \\t]+${escapeRegExp(heading)}[ \\t]*$`, 'm').exec(content);
  if (match === null) return null;
  const afterHeading = match.index + match[0].length;
  const next = content.slice(afterHeading).search(/^##\s/m);
  return { start: match.index, afterHeading, end: next >= 0 ? afterHeading + next : content.length };
}

/** A section's body text: everything after the heading line, up to the next
    `##` heading or the end of the document — or null when the document has no
    such heading. Only the heading's own newline is consumed, so a section
    written with a blank line under its heading yields one. */
export function sectionText(content: string, heading: string): string | null {
  const span = sectionSpan(content, heading);
  return span === null ? null : content.slice(span.afterHeading, span.end).replace(/^\r?\n/, '');
}

/** The document with one section — heading and body — cut out; unchanged when
    the heading is absent. For readers that must not see a section's text at
    all, such as the design gate's exclusion of `## Out of scope` (WO-112). */
export function withoutSection(content: string, heading: string): string {
  const span = sectionSpan(content, heading);
  return span === null ? content : content.slice(0, span.start) + content.slice(span.end);
}

/**
 * Append `line` under `## {heading}`, creating the section at the end of the
 * document when the heading is missing. Existing entries are preserved and
 * the line lands last; everything outside the section is untouched. The
 * heading match is exact (`^## {heading}` with trailing spaces tolerated) —
 * `### {heading}` and prose mentions never match.
 */
export function appendToSection(
  content: string,
  heading: string,
  line: string,
  options: AppendToSectionOptions = {},
): string {
  const span = sectionSpan(content, heading);
  if (span === null) {
    return `${content.trimEnd()}\n\n## ${heading}\n\n${line}\n`;
  }
  const { afterHeading, end: sectionEnd } = span;

  let existing = content.slice(afterHeading, sectionEnd);
  if (options.placeholder !== undefined) {
    existing = existing.replace(new RegExp(`^${escapeRegExp(options.placeholder)}[ \\t]*$`, 'm'), '');
  }
  existing = existing.trim();

  const before = content.slice(0, afterHeading);
  const after = content.slice(sectionEnd);
  const section = `\n\n${existing === '' ? '' : `${existing}\n`}${line}\n`;
  return `${before}${section}${after === '' ? '' : `\n${after}`}`;
}
