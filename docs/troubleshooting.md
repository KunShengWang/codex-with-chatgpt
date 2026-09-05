# Troubleshooting

First move, always:

```
c2c doctor
```

It checks Node, workspace, bridge, MCP, OAuth and tunnel — and repairs what it
can (restarts the bridge, restarts the tunnel) without asking.

## Common situations

### Repeated doctor checks forget an unfinished ChatGPT reconnect

The local endpoint and the address configured in ChatGPT are now stored
separately. A new address remains pending across repeated doctor/start calls.
After completing ChatGPT setup, tell Codex that it is done. Codex records the
exact configured Server URL with `c2c connector-confirm -w <workspace> --url
<Server URL> --json`, then checks local health and ChatGPT access separately.
An outdated URL is rejected. Do not use confirmation to suppress a warning
without actually completing setup.

Repeated doctor checks do not replace an active pairing code. If it expires
or is lost, `c2c pair -w <workspace> --json` explicitly generates a fresh one.
`doctor --no-fix` does not write the endpoint or generate pairing codes.
Manual mode messages leave the settings operations to the user.

Legacy endpoint files use their last saved address as the migration baseline.
If an older release already overwrote an unconfirmed address, the lost history
cannot be reconstructed automatically; verify ChatGPT access and repair that
connection if needed. Existing healthy connections are not forcibly recreated.

### ChatGPT page reads reset the browser kernel, but doctor is healthy

Doctor checks the local connection, not desktop page automation. Use the API
advertised by the current browser tool. With `mcp__cua_repl.js`, set the outer
tool argument `timeout_ms: 60000` and keep each action/read in a separate call.
In an isolated Windows test, default 30-second calls reset the kernel, whereas
claiming the same tab succeeded in 55 seconds and AX/screenshot reads in about
42 seconds. `getTab`/`createBrowserTab` implicitly read initial state: opening
may have succeeded even when the call times out. Rediscover before creating.

A kernel reset discards every JS handle. Reacquire the same tab from fresh
inventory. Use the Skill's bounded send guard; never infer an unsent message
from an empty composer after a send attempt. Screenshot fallback also needs
the longer outer budget. Do not assume an old `tab.cua` API is available.

`No ChatGPT browser route is available` in current-task desktop logs identifies
a desktop route problem; it may coexist with slow successful operations.
The budget change is a verified workaround for the tested path, not a fix to
Codex desktop internals. If bounded recovery fails, preserve the checkpoint and
report the exact blocked operation. Do not recreate a healthy connector.

For diagnostic-only requests, use a temporary chat outside the Project and
harmless unique markers, without saving over the workspace session or resuming
its unfinished task. See [isolated test evidence](c2c-browser-diagnostic-2026-09-05.md).

### "Bridge 未运行"
`c2c start` (or let doctor do it). Bridge logs:
`c2c logs`, or verbose: `c2c logs --verbose`.

If doctor says the bridge state is **uncertain** (无法确认), do not start a
second bridge and do not Delete the ChatGPT connector. Wait and run doctor
again. The local process may still be running.

### Everything was quit and ChatGPT can no longer connect
Quitting Codex / the terminal stops the public address. The next `c2c doctor`
starts a new address and sets `chatgptRepair.needed`. The Skill should tell the
user that the old address expired, then **Delete** THIS workspace's
connector (`chatgptRepair.connectorName`) and create it again with the new
address (never click Reconnect — the old URL is dead). Other workspaces keep
their own connectors so two projects can stay connected at once.

Fixed ChatGPT pages for first-time setup and later repair (do not hunt the UI):

- Developer mode: https://chatgpt.com/#settings/Security
- Plugins hub (manage existing connectors): https://chatgpt.com/plugins
- Add a connector:
  https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins

### Tunnel URL unreachable / ChatGPT says the connector is broken
Same as above: `c2c doctor`, then Delete + recreate THIS workspace's
connector if `chatgptRepair.needed`. Fresh pairing code: `c2c pair`.
If this workspace uses a stable hostname, doctor sets `namedRepair` instead —
re-login to Cloudflare (`c2c tunnel login`) and doctor again. Do not Delete
the connector; the address did not change.

### I have a Cloudflare domain and want a stable hostname
During first-time setup (or the next coding session, once), say you have a
Cloudflare account and give the domain. Codex opens a browser for Cloudflare
login, then keeps `c2c-<project>.your-domain.com`. To stay on the temporary
address, say you do not have a domain. Switching later: tell Codex you want
the stable hostname; it runs `c2c tunnel choose --mode named --zone <domain>`.

### "配对码无效/过期"
Pairing codes are one-time and expire after ~5 minutes:

```
c2c pair
```

generates a fresh one (older codes become invalid immediately).

### ChatGPT gets 401 on every tool call
The access token expired and refresh failed (e.g. after `c2c unpair` or a
long offline period). Delete THIS workspace's connector if the address also
changed; otherwise run Authorize again in ChatGPT and enter a fresh pairing
code. Never use Reconnect when the public address has been replaced.

### cloudflared is not installed
macOS: `brew install cloudflared`
Windows: `winget install Cloudflare.cloudflared`
Linux: see Cloudflare's package instructions.
The Skill installs this automatically during setup.

### Every new Codex chat “repairs” the connection / cannot write logs
The C2C state directory lives outside the project (macOS:
`~/Library/Application Support/codex-with-chatgpt`; Windows:
`%LOCALAPPDATA%\codex-with-chatgpt`). Codex's default sandbox cannot write
there, so each new chat looks like a health-check failure.

`c2c setup`, `c2c doctor` and `c2c sandbox-allow` add that directory to
`[sandbox_workspace_write].writable_roots` in `~/.codex/config.toml`
(`%USERPROFILE%\.codex\config.toml` on Windows). After that, later chats
do not need elevation.

### Port already in use
Handled automatically: an existing healthy bridge for the same workspace is
reused; anything else makes the bridge pick a free port. Configuration follows
automatically.

### Reading a file returns ACCESS_DENIED_SENSITIVE_FILE
Working as intended: `.env`, keys, credentials and anything matched by
`.c2cignore` are never readable through ChatGPT. `.env.example` is allowed.

### I cannot see Projects in the ChatGPT sidebar
Hover **Chats** /「聊天」, click the … that appears, and choose
**Organize by project** /「按项目整理」. Then create a project named after
this workspace, with **project-only memory**. Tell Codex「好了」when the
collection page is open (`https://chatgpt.com/g/g-p-…/project`).

### This workspace opened the wrong ChatGPT Project
Do not pick another project by name automatically. Open the collection that
matches this workspace and tell Codex「已找到」, or say you want the old
long-chat instead. Each workspace has its own Project and its own connector.

### Completely stuck
```
c2c stop
c2c setup
```

re-creates the bridge, tunnel and pairing session from scratch. Existing
authorizations stay valid unless you also ran `c2c unpair`.
