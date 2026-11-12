// shared/types/mcp.ts
/**
 * 3. YAPAY ZEKA, AJANLAR VE KONSEY MODÜLLERİ - MCP
 * Model Context Protocol (MCP) araç tanımları, yanıt yapıları ve istemci ayarlarını tanımlar.
 */

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface MCPResponsePayload<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  executionTimeMs?: number;
}

export interface MCPClientConfig {
  serverUrl: string;
  timeoutMs: number;
  isConnected: boolean;
  registeredTools: string[];
}
