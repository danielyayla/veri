#!/usr/bin/env node
import { join, resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { classifyFormat, formatStatement, isOperableFormat } from '@veri/core';
import { z } from 'zod';
import { assembleContext } from './context.ts';
import { searchDocs } from './search.ts';
import { fileDecision, fileReceipt } from './writeback.ts';

const projectRoot = resolve(process.argv[2] ?? process.cwd());

// REQ-015: a newer or unreadable format gets a clear statement from every
// tool, never a misparse. Classified per call — the marker can change while
// the server runs (a migration, a git pull).
function guardFormat(): void {
  const format = classifyFormat(join(projectRoot, 'veri'));
  if (!isOperableFormat(format)) throw new Error(formatStatement(format) ?? 'format mismatch');
}

const server = new McpServer({ name: 'veri', version: '0.1.0' });

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

const ok = (text: string): ToolResult => ({ content: [{ type: 'text', text }] });
const fail = (err: unknown): ToolResult => ({ isError: true, content: [{ type: 'text', text: (err as Error).message }] });

server.registerTool(
  'get_context',
  {
    description:
      'Context package for a work order: project conventions, the work order, all transitively linked ' +
      'requirements and active decisions (2 hops), and source excerpts. Superseded decisions are named ' +
      'as already rejected but their bodies are omitted.',
    inputSchema: { id: z.string().describe('Work order id, e.g. WO-002') },
  },
  async ({ id }) => {
    try {
      guardFormat();
      return ok((await assembleContext(projectRoot, id)).text);
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'search',
  {
    description: 'Find documents by case-insensitive substring match over id, title, and body.',
    inputSchema: { query: z.string() },
  },
  async ({ query }) => {
    try {
      guardFormat();
      const hits = await searchDocs(projectRoot, query);
      if (hits.length === 0) return ok('no matches');
      return ok(
        hits
          .map((hit) => `${hit.id}  ${hit.type}  ${hit.status}  ${hit.title}  (matched: ${hit.matched.join(', ')})`)
          .join('\n'),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'file_decision',
  {
    description:
      'File a technical decision as a proposal — a new document with the next free DEC id and status: proposed, ' +
      'pending the user\'s review; it is not binding until they approve it. ' +
      'Use when a non-trivial choice is made during implementation; include the rejected alternatives.',
    inputSchema: {
      title: z.string(),
      choice: z.string().describe('What was chosen'),
      rejected_alternatives: z.string().optional().describe('Markdown list of alternatives and why they lost'),
      rationale: z.string().optional(),
      links: z
        .array(z.object({ id: z.string(), rel: z.string() }))
        .optional()
        .describe('Documents this decision constrains, e.g. [{id: "WO-003", rel: "constrains"}]'),
    },
  },
  async (input) => {
    try {
      guardFormat();
      const { id, file } = await fileDecision(projectRoot, input);
      return ok(
        `Filed ${id} at ${file} as a proposal pending the user's review — not binding yet. ` +
          `Present it to the user: what it commits them to, what it rules out, and the alternatives rejected. ` +
          `They promote it with veri approve ${id} (or in the app).`,
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'file_receipt',
  {
    description:
      'Append a work-session receipt (date, commit, files touched, one-line summary) to a work order. ' +
      'Receipts accumulate; existing ones are never overwritten.',
    inputSchema: {
      work_order_id: z.string(),
      commit: z.string().describe('Commit SHA of the session’s work'),
      files: z.string().describe('Files touched, comma-separated'),
      summary: z.string().describe('One-line summary of the session'),
      date: z.string().optional().describe('YYYY-MM-DD, defaults to today'),
    },
  },
  async (input) => {
    try {
      guardFormat();
      const { file } = await fileReceipt(projectRoot, input);
      return ok(`Appended receipt to ${file}`);
    } catch (err) {
      return fail(err);
    }
  },
);

await server.connect(new StdioServerTransport());
