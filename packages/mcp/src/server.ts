#!/usr/bin/env node
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { assembleContext } from './context.ts';
import { searchDocs } from './search.ts';
import { fileDecision, fileReceipt } from './writeback.ts';

const projectRoot = resolve(process.argv[2] ?? process.cwd());

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
      'Record a technical decision as a new document with the next free DEC id and status: active. ' +
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
      const { id, file } = await fileDecision(projectRoot, input);
      return ok(`Filed ${id} at ${file}`);
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
      const { file } = await fileReceipt(projectRoot, input);
      return ok(`Appended receipt to ${file}`);
    } catch (err) {
      return fail(err);
    }
  },
);

await server.connect(new StdioServerTransport());
