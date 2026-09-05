import path from "node:path";
import { getStateDir, readJsonIfExists, writeSecureJson } from "./paths.js";

export const CHATGPT_DEVELOPER_MODE_URL = "https://chatgpt.com/#settings/Security";
export const CHATGPT_PLUGINS_URL = "https://chatgpt.com/plugins";
export const CHATGPT_CREATE_CONNECTOR_URL =
  "https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins";

export const DEFAULT_CONNECTOR_NAME = "Codex with ChatGPT";

export interface LastEndpoint {
  workspaceId: string;
  port: number;
  publicUrl: string | null;
  mcpUrl: string | null;
  connectorName?: string;
  /** Last address the user explicitly confirmed configuring in ChatGPT. */
  confirmedMcpUrl?: string | null;
  savedAt: string;
}

export function endpointFile(workspaceId: string): string {
  return path.join(getStateDir(), "endpoints", `${workspaceId}.json`);
}

export function readLastEndpoint(workspaceId: string): LastEndpoint | null {
  return readJsonIfExists<LastEndpoint>(endpointFile(workspaceId));
}

export function writeLastEndpoint(endpoint: Omit<LastEndpoint, "savedAt">): LastEndpoint {
  const previous = readLastEndpoint(endpoint.workspaceId);
  const saved: LastEndpoint = {
    ...endpoint,
    confirmedMcpUrl: endpoint.confirmedMcpUrl !== undefined
      ? endpoint.confirmedMcpUrl
      : confirmedEndpointUrl(previous),
    savedAt: new Date().toISOString(),
  };
  writeSecureJson(endpointFile(saved.workspaceId), saved);
  return saved;
}

/** Legacy records lack separate confirmation; retain their previous baseline. */
export function confirmedEndpointUrl(endpoint: LastEndpoint | null): string | null {
  return endpoint?.confirmedMcpUrl !== undefined ? endpoint.confirmedMcpUrl : endpoint?.mcpUrl ?? null;
}

export function confirmEndpoint(workspaceId: string, expectedMcpUrl: string): LastEndpoint {
  const current = readLastEndpoint(workspaceId);
  if (!current?.mcpUrl || normalizePublicUrl(current.mcpUrl) !== normalizePublicUrl(expectedMcpUrl)) {
    throw new Error("Connection address changed or is missing; check the current address before confirming.");
  }
  return writeLastEndpoint({ ...current, confirmedMcpUrl: current.mcpUrl });
}

export function normalizePublicUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

export function mcpUrlFromPublic(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;
  const base = normalizePublicUrl(publicUrl).replace(/\/mcp$/, "");
  return `${base}/mcp`;
}

/** What the Skill should do to THIS workspace's ChatGPT connector.
 *  `update` means the public address changed: Delete the old connector
 *  in ChatGPT, then create it again. Never click Reconnect (the old
 *  URL is dead and hangs on "This site cannot be reached"). */
export function connectorAction(
  previousMcpUrl: string | null | undefined,
  nextMcpUrl: string | null | undefined
): "none" | "create" | "update" {
  if (!nextMcpUrl) return "none";
  if (!previousMcpUrl) return "create";
  return normalizePublicUrl(previousMcpUrl) === normalizePublicUrl(nextMcpUrl) ? "none" : "update";
}

export function sanitizeConnectorLabel(name: string, workspaceId: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N}._\- ]+/gu, "").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 40) || workspaceId.slice(0, 6);
}

/**
 * Same workspace keeps one connector title forever.
 * A workspace already recorded without a title stays on the original
 * "Codex with ChatGPT" name. A new workspace gets a distinct title.
 */
export function connectorNameFor(opts: {
  workspaceName: string;
  workspaceId: string;
  previousName?: string | null;
  hadEndpointBefore: boolean;
}): string {
  if (opts.previousName?.trim()) return opts.previousName.trim();
  if (opts.hadEndpointBefore) return DEFAULT_CONNECTOR_NAME;
  return `${DEFAULT_CONNECTOR_NAME} · ${sanitizeConnectorLabel(opts.workspaceName, opts.workspaceId)}`;
}

export function reclaimUserMessage(connectorName: string, setupMode?: string | null): string {
  if (setupMode !== "auto") {
    return `当前项目需要在 ChatGPT 中确认连接配置。我会提供「${connectorName}」的连接信息和配对码，由你手动完成，完成后告诉我「好了」。`;
  }
  return `当前项目的安全连接地址已经失效。我会删除「${connectorName}」再按新地址加回去，其它项目的连接不动。请稍等。`;
}
