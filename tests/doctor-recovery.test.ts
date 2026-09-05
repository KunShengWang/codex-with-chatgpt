import { afterEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { startBridge, type Bridge } from "../src/bridge/server.js";
import { confirmEndpoint, endpointFile, readLastEndpoint, writeLastEndpoint } from "../src/config/endpoint.js";
import { mergeUiPrefs } from "../src/config/ui-prefs.js";
import { cleanup, isolateStateDir, makeTmpDir, write } from "./helpers.js";
import type { TunnelProvider } from "../src/tunnel/provider.js";

const exec = promisify(execFile);
const dirs: string[] = [];
let bridge: Bridge | undefined;
afterEach(async () => {
  await bridge?.close();
  bridge = undefined;
  for (const dir of dirs.splice(0)) cleanup(dir);
  delete process.env.C2C_STATE_DIR;
});

async function fixture() {
  const state = isolateStateDir();
  const root = makeTmpDir("doctor-workspace");
  const codexConfig = makeTmpDir("doctor-config");
  dirs.push(state, root, codexConfig);
  write(root, "hello.txt", "isolated diagnostic only");
  let url: string | null = null;
  const tunnel: TunnelProvider = {
    name: "test-local",
    start: async (port) => (url = `http://127.0.0.1:${port}`),
    stop: async () => { url = null; },
    restart: async (port) => (url = `http://127.0.0.1:${port}`),
    status: () => ({ running: !!url, url, provider: "test-local" }),
    getPublicUrl: () => url,
    doctor: async () => ({ provider: "test-local", binaryFound: true, binaryPath: null, running: !!url, url, problems: [] }),
  };
  bridge = await startBridge({ workspaceRoot: root, port: 0, tunnelProvider: tunnel });
  await fetch(`${bridge.localBaseUrl()}/admin/tunnel/start`, {
    method: "POST", headers: { authorization: `Bearer ${bridge.adminToken}` },
  });
  mergeUiPrefs({ setupMode: "manual" });
  const old = "https://old.example.test/mcp";
  writeLastEndpoint({ workspaceId: bridge.workspace.id, port: bridge.port, publicUrl: old.replace(/\/mcp$/, ""), mcpUrl: old });
  confirmEndpoint(bridge.workspace.id, old);
  const run = async (...args: string[]) => {
    const { stdout } = await exec(process.execPath, ["--import", "tsx", "src/cli/index.ts", ...args, "-w", root, "--json"], {
      cwd: path.resolve("."),
      env: { ...process.env, C2C_STATE_DIR: state, CODEX_HOME: codexConfig },
      timeout: 15000,
    });
    return JSON.parse(stdout);
  };
  return { run, old, mcpUrl: `${bridge.localBaseUrl()}/mcp`, id: bridge.workspace.id };
}

describe("doctor CLI recovery with a real isolated bridge", () => {
  it("keeps repair pending across checks, preserves the code, then accepts explicit confirmation", async () => {
    const { run, old, mcpUrl, id } = await fixture();
    const first = await run("doctor");
    expect(first.chatgptRepair).toMatchObject({ needed: true, connectorAction: "update", previousMcpUrl: old, mcpUrl });
    expect(first.chatgptRepair.userMessage).toContain("手动");
    expect(first.chatgptRepair).toMatchObject({ setupMode: "manual", authentication: "OAuth", pairingActive: true });
    expect(first.chatgptRepair.pairingCode).toBeTruthy();
    const second = await run("doctor");
    expect(second.chatgptRepair).toMatchObject({ needed: true, previousMcpUrl: old });
    expect(second.chatgptRepair.pairingCode).toBeUndefined();
    expect(bridge!.pairing.verify(first.chatgptRepair.pairingCode).ok).toBe(true);
    const next = await run("doctor");
    expect(next.chatgptRepair.needed).toBe(true); // using the code is not configuration confirmation
    await expect(run("connector-confirm", "--url", old)).rejects.toThrow();
    expect(readLastEndpoint(id)?.confirmedMcpUrl).toBe(old);
    await run("connector-confirm", "--url", mcpUrl);
    expect(readLastEndpoint(id)?.confirmedMcpUrl).toBe(mcpUrl);
    expect((await run("doctor")).chatgptRepair.needed).toBe(false);
  });

  it("makes --no-fix read-only for endpoint and pairing state", async () => {
    const { run, id } = await fixture();
    const before = fs.readFileSync(endpointFile(id), "utf8");
    const first = await run("doctor", "--no-fix");
    expect(first.chatgptRepair.needed).toBe(true);
    expect(first.chatgptRepair.pairingCode).toBeUndefined();
    expect(bridge!.pairing.hasActiveSession()).toBe(false);
    expect(fs.readFileSync(endpointFile(id), "utf8")).toBe(before);
  });
});
