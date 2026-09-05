import { afterEach, describe, it, expect } from "vitest";
import {
  connectorAction,
  connectorNameFor,
  DEFAULT_CONNECTOR_NAME,
  mcpUrlFromPublic,
  normalizePublicUrl,
  reclaimUserMessage,
  confirmedEndpointUrl,
  confirmEndpoint,
  writeLastEndpoint,
  readLastEndpoint,
} from "../src/config/endpoint.js";
import { cleanup, isolateStateDir } from "./helpers.js";

describe("connectorAction", () => {
  it("creates on the first successful URL", () => {
    expect(connectorAction(null, "https://a.trycloudflare.com/mcp")).toBe("create");
  });

  it("is a no-op when the URL is unchanged", () => {
    expect(connectorAction("https://a.trycloudflare.com/mcp", "https://a.trycloudflare.com/mcp/")).toBe("none");
  });

  it("updates when the old address was reclaimed", () => {
    expect(connectorAction("https://old.trycloudflare.com/mcp", "https://new.trycloudflare.com/mcp")).toBe("update");
    expect(reclaimUserMessage("Codex with ChatGPT", "auto")).toContain("删除");
    expect(reclaimUserMessage("Codex with ChatGPT")).not.toContain("Reconnect");
  });

  it("does nothing without a next URL", () => {
    expect(connectorAction("https://a.trycloudflare.com/mcp", null)).toBe("none");
  });
});

describe("connector confirmation survives repeated endpoint observations", () => {
  let dir: string;
  afterEach(() => {
    if (dir) cleanup(dir);
    delete process.env.C2C_STATE_DIR;
  });
  const oldUrl = "https://old.trycloudflare.com/mcp";
  const nextUrl = "https://new.trycloudflare.com/mcp";
  const observation = (mcpUrl: string) => ({ workspaceId: "isolated", port: 1, publicUrl: mcpUrl.replace(/\/mcp$/, ""), mcpUrl });

  it("keeps a new connector pending until explicitly confirmed", () => {
    dir = isolateStateDir();
    writeLastEndpoint(observation(nextUrl));
    writeLastEndpoint(observation(nextUrl));
    expect(connectorAction(confirmedEndpointUrl(readLastEndpoint("isolated")), nextUrl)).toBe("create");
    confirmEndpoint("isolated", nextUrl);
    expect(connectorAction(confirmedEndpointUrl(readLastEndpoint("isolated")), nextUrl)).toBe("none");
  });

  it("does not forget a pending repair after repeated doctor/start observations", () => {
    dir = isolateStateDir();
    writeLastEndpoint(observation(oldUrl));
    confirmEndpoint("isolated", oldUrl);
    for (let i = 0; i < 3; i++) {
      writeLastEndpoint(observation(nextUrl));
      expect(connectorAction(confirmedEndpointUrl(readLastEndpoint("isolated")), nextUrl)).toBe("update");
    }
    expect(() => confirmEndpoint("isolated", oldUrl)).toThrow(/changed/);
    expect(readLastEndpoint("isolated")?.confirmedMcpUrl).toBe(oldUrl);
    confirmEndpoint("isolated", nextUrl);
    writeLastEndpoint(observation(nextUrl));
    expect(connectorAction(confirmedEndpointUrl(readLastEndpoint("isolated")), nextUrl)).toBe("none");
  });

  it("preserves the baseline of legacy records", () => {
    expect(confirmedEndpointUrl({ ...observation(oldUrl), savedAt: "legacy" })).toBe(oldUrl);
  });

  it("honors manual mode and does not assume auto when no preference exists", () => {
    for (const mode of ["manual", null]) {
      expect(reclaimUserMessage("test", mode)).toContain("手动");
      expect(reclaimUserMessage("test", mode)).not.toContain("我会删除");
    }
  });
});

describe("connectorNameFor", () => {
  it("keeps a stored name for the same workspace", () => {
    expect(
      connectorNameFor({
        workspaceName: "EchoMind",
        workspaceId: "abc123abc123",
        previousName: "Codex with ChatGPT",
        hadEndpointBefore: true,
      })
    ).toBe(DEFAULT_CONNECTOR_NAME);
  });

  it("keeps the legacy title when this workspace was used before the name field existed", () => {
    expect(
      connectorNameFor({
        workspaceName: "EchoMind",
        workspaceId: "abc123abc123",
        hadEndpointBefore: true,
      })
    ).toBe(DEFAULT_CONNECTOR_NAME);
  });

  it("gives a new workspace its own connector title", () => {
    expect(
      connectorNameFor({
        workspaceName: "Landing",
        workspaceId: "def456def456",
        hadEndpointBefore: false,
      })
    ).toBe("Codex with ChatGPT · Landing");
  });
});

describe("mcpUrlFromPublic", () => {
  it("appends /mcp and folds case/slash variants", () => {
    expect(mcpUrlFromPublic("https://A.trycloudflare.com/")).toBe("https://a.trycloudflare.com/mcp");
    expect(mcpUrlFromPublic("https://a.trycloudflare.com/mcp")).toBe("https://a.trycloudflare.com/mcp");
    expect(normalizePublicUrl("https://A.trycloudflare.com/")).toBe("https://a.trycloudflare.com");
  });
});
