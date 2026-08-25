// Package assembly lives in @verikb/core (DEC-038) so the CLI's `veri context`
// and this server's `get_context` serve one byte-identical package from one
// implementation. This module remains the MCP-local import path.
export { assembleContext, estimateTokens } from '@verikb/core';
export type { ContextPackage } from '@verikb/core';
