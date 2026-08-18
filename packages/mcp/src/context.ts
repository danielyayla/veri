// Package assembly lives in @veri/core (DEC-038) so the CLI's `veri context`
// and this server's `get_context` serve one byte-identical package from one
// implementation. This module remains the MCP-local import path.
export { assembleContext, estimateTokens } from '@veri/core';
export type { ContextPackage } from '@veri/core';
