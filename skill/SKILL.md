---
name: codex-with-chatgpt
description: >
  Use ChatGPT (web) as the planning and review brain for Codex coding sessions,
  while Codex keeps full execution ownership. Use when the user says
  "使用 Codex with ChatGPT ..." / "Set up Codex with ChatGPT" / "用 ChatGPT 规划",
  when they ask to connect ChatGPT to the current workspace, disconnect it,
  or run a task through the ChatGPT planning loop.
---

# Codex with ChatGPT

ChatGPT thinks. Codex works.

You (Codex) own execution: editing, shell, git, tests, recovery.
ChatGPT owns high-level reasoning: understanding, planning, review, debug strategy.
The C2C Bridge gives ChatGPT read-only MCP access to the current workspace, so
control messages between you and ChatGPT stay tiny (< 1 KB) — ChatGPT pulls
whatever data it needs by itself.

**Golden rules**

1. NEVER paste file contents, diffs, or logs into ChatGPT. ChatGPT reads them through MCP.
2. NEVER show the user technical internals (MCP, OAuth, PKCE, tunnel, ports, localhost).
   Speak in terms of "连接 ChatGPT / 安全连接 / 配对". The only exception is the
   **guided manual ChatGPT setup** below: expose only the exact settings
   field labels/values the user must enter, without explaining internals.
3. The pairing code is the ONLY credential you may ever type into a browser.
   Never touch OAuth tokens, cookies, or session storage.
4. If something fails, run `c2c doctor` and repair silently. Only involve the user
   for logins, CAPTCHA, 2FA, explicit consent screens, or **guided manual
   ChatGPT setup** below — and then give them ONE action.
   Before the first ChatGPT connection on this machine, `c2c prefs --json`:
   - `setupMode` missing: tell the user exactly `setupChoicePrompt`, wait for
     「1」or「2」, then `c2c prefs set --setup-mode auto|manual --json`.
     Do not start ChatGPT configuration until they answer. Do not guess.
   - `setupMode` is `manual`: skip automatic ChatGPT settings. Use guided
     manual from the start (chosen, not a failure).
   - `setupMode` is `auto`: automatic browser setup. Two explicit failures of
     the same configuration step after repair then enter guided manual.
     A browser/js timeout, a page still loading/generating, or waiting for
     user login/2FA does NOT count as a failure. Do not change the saved
     `setupMode` when falling back.
   `developerModeEnabled: true` means skip `#settings/Security` until a
   connector create fails because developer mode is required. Then open
   that page, enable it, and `c2c prefs set --developer-mode --json`.
   These prefs are for this machine, not per workspace. Do not ask again
   on reconnect or a second repo. A new computer (empty prefs) asks/checks
   once.
5. ALWAYS keep ChatGPT in the built-in in-app browser (iab).
   Follow **In-app browser (ChatGPT)** below. If DOM/AX composer or Send
   control times out, use the same tab's documented screenshot/coordinate
   fallback only after checking submission evidence. Never use Windows-level
   Computer Use or another browser. NEVER
   launch or control a third-party/external browser
   (Chrome, Safari, Edge…), and never use `open <url>` to hand off to one.
   - The ONLY exception: the user explicitly says the Cloudflare login must use
     their own browser session — that single Cloudflare login step may go through
     their browser; everything else stays in the built-in browser.
   - If the user asks to run ChatGPT in their own browser, refuse politely and
     explain: "Codex 需要持续调用 ChatGPT 和配置连接，这会频繁操作页面，可能影响
     你浏览器的正常使用。ChatGPT 只能跑在内置浏览器里。" Only if the user replies
     with an explicit "我愿意承担影响" may you proceed in their browser; otherwise
     keep ChatGPT in the built-in browser, every time they ask.
6. Conversation reuse depends on `c2c session --json` → `conversation.mode`
   (see Conversation management). Do not invent a second mode.
   - **long-chat** (legacy session file, or the user opted out): ONE ChatGPT
     conversation per workspace. Never silently start a new chat.
   - **project** (new workspaces, or an existing workspace that opted in):
     ONE ChatGPT Project (collection) per workspace. Same Codex conversation
     reuses the ChatGPT chat URL saved in THIS thread. A new Codex
     conversation opens a new chat from the Project collection page — never
     `goto` `https://chatgpt.com/` to create it, and never reuse another
     Codex conversation's chat URL just because `session.url` exists.
   Each workspace also has exactly ONE ChatGPT connector. Do not create a
   second connector for the same workspace. Other workspaces may have their
   own connectors — never edit those.
7. After first-time setup, never ask the user to approve writing C2C's local
   settings directory. Run `c2c sandbox-allow --json` (idempotent). If it fails
   with EPERM / Operation not permitted, request elevated permissions and retry
   ONCE. After `{ "alreadyAllowed": true }` or `{ "added": true }`, stay silent.
8. ChatGPT pages: only the URLs in **In-app browser (ChatGPT)**. Never start
   from chatgpt.com and click through menus.
9. **Doctor gate.** After `c2c doctor --json`, do not `goto` ChatGPT and do not
   send `[C2C]` until local is green — except the reconnect settings pages when
   `chatgptRepair.needed` is true. Not green:
   - `report.bridge.ok` is not true
   - `report.mcp.ok` is not true (unauthenticated local `/mcp` must be 401)
   - sandbox / state-dir write failed (EPERM)
   - this workspace used to have a public URL and the tunnel is down
   - `chatgptRepair.needed` is true (fix the connector first, then doctor again)
   - `namedRepair.needed` is true (user must login to Cloudflare, then doctor again.
     Do not Delete the ChatGPT connector — the address did not change)
   - `report.bridge` says 状态无法确认: the local bridge may still be running.
     Do not `c2c start`, do not Delete the connector, do not treat it as
     `chatgptRepair`. Wait and run doctor again.
   A ChatGPT-side 401 after a sent message is different: repair then, do not
   treat it as permission to skip this gate next time.

## In-app browser (ChatGPT)

Use the browser tools and API documentation actually available in this session.
Do not assume an unlisted `control-in-app-browser` skill, bootstrap function,
or `tab.cua` API exists. The current `mcp__cua_repl.js` entry point uses `cua`.

1. **Surface and API.** With `mcp__cua_repl.js`, start with exactly one documented
   entry call, normally `await cua.getState()`. Select the browser of type `iab`
   belonging to this task, and retain its returned browser ID. Claim an existing
   matching tab with `cua.getTab(tabId, { browser: browserId })`; if none exists,
   use `cua.createBrowserTab("iab", allowedUrl, { visible: true })` once.
   Read the returned documentation before further operations. Use `getAXState`,
   `setValue`, `click`, and `getScreenshot` from that API; coordinate clicks use
   `tab.click([x, y])`. Only use a legacy runtime if its tool is actually exposed
   and its own bootstrap/API documentation has been read. Never mix APIs or
   guess methods from an older skill version.

2. **One tab.** After creation, use `tab.goto(...)` to switch allowed URLs.
   Creation can open the tab and then time out while reading initial state.
   Rediscover tabs before attempting creation again. Do not `goto` the URL you
   are already on. After a kernel reset, all JavaScript bindings are gone:
   repeat a documented entry call, rediscover the same iab tab and bind it again.
   After an ordinary error without reset, retain surviving bindings and replace
   only stale handles. Tab IDs must come from fresh inventory after reset.

3. **Foreground + keep (standby).** Right after opening or claiming the tab:
   - Keep the tab visible using the selected API's documented visibility option;
     `cua.createBrowserTab` accepts `{ visible: true }`. Use legacy capabilities
     only if documented for the selected handle.
   - `await tab.markHandoff()` immediately, then again at the start and end of
     every turn. After setup succeeds or the C2C chat is open, also
     `await tab.markDeliverable()`.
   Never close this tab. Finished, waiting for the user, or timed out: leave it
   marked (standby). Do not let default turn cleanup close it.

4. **URLs only** (same tab, `goto` — never hunt menus):
   - 开发人员模式: `https://chatgpt.com/#settings/Security`
     (skip when `c2c prefs --json` has `developerModeEnabled: true`)
   - 插件总管: `https://chatgpt.com/plugins`
   - 加插件: `https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins`
   - 新对话 (long-chat only, and only if no saved chat): `https://chatgpt.com/`
   - Saved C2C chat: `conversation.chatUrl` / `session.url` (long-chat, or
     the chat already bound in THIS Codex conversation)
   - Saved Project collection: `conversation.projectUrl`
     (`https://chatgpt.com/g/g-p-…/project`)
   Never click Reconnect / Refresh on an existing connector. The old address is
   dead and that page hangs on "This site cannot be reached". When the address
   changed: Delete THIS workspace's `connectorName` only, then create it again
   via the 加插件 URL (same name, new Server URL). Do not put that public
   address into Project instructions — write the connector **name** only.

5. **Do not wait for 8 tools** on the settings page. "Connected" / authorize
   success / pairing accepted is enough. Confirm tools in the conversation with
   `workspace_info`.

6. **One browser call, one operation, sufficient outer budget.** For ChatGPT
   calls through `mcp__cua_repl.js`, set the tool argument `timeout_ms: 60000`.
   Real IAB observations have taken about 42 seconds, and a tab claim about
   55 seconds; the default 30-second outer limit resets the kernel before they
   finish. This is a bounded workaround, not a repair of desktop routing.
   Never combine navigation, fill, click, reload, waiting, URL reads, or page
   reads in one call. In particular:
   - composer fill is one call;
   - send-button click is a separate call;
   - confirmation is a later, separate AX/DOM-read call;
   - reload is one call and is never followed by an in-call wait or page read.
   `getTab` and `createBrowserTab` may implicitly read initial state; do not
   append another observation. Use the fresh tree's disabled/enabled evidence
   for Send; do not add `isEnabled()`/`getAttribute()` round trips just to repeat
   a state check. Match the current label, e.g. `发送提示词`, not a fixed old label.
   Never use `waitForTimeout`, `waitFor`, sleep, or polling inside a browser
   `js` call. The known-form batching optimization may still be used on the
   connector settings form only; it never applies to a ChatGPT composer or
   send action. Do not screenshot-poll.

7. **One conversation, Chat mode.** The first ChatGPT chat is the C2C
   conversation. Chat and Work (聊天 / 工作) are separate: a Work conversation
   cannot become Chat. On every NEW conversation, if a Chat/Work switcher is
   visible (often top-left), confirm **Chat** is selected before the boot
   prompt. If it is Work, do not continue there — Switch to a new Chat
   conversation (HANDOFF). If no switcher is visible, do not hunt menus; continue.
   Send the boot prompt and the workspace_info check in that Chat conversation.
   Confirm the reply names the current workspace **before** saving or replacing
   the session URL. If validation fails, keep the old saved URL. Do not open a
   throwaway verify chat and later another C2C chat.

8. **Wait for a ChatGPT reply (do not hold one long browser wait).** After you
   send INIT, EXECUTED, boot, or the workspace_info check: `markHandoff`, keep
   the tab foreground, and stay in this same task. Do not `waitFor` in browser
   JS and do not screenshot-poll. Return from the browser call; while waiting
   for generation, make separate AX/DOM observations about 20–30 seconds apart.
   If the read already took longer than that, no extra delay is needed:
   - still generating → wait again (do not type, do not resend);
   - `STATE: PLAN` / `DONE` / `BLOCKED` / the verify workspace name → read it
     and continue the existing protocol;
   - visible error → repair; do not start a new chat.
   A browser/js timeout is an unknown result, not proof of submission or failure.
   Apply the bounded recovery below. Poll again only after a successful read
   shows generation; do not repeatedly poll a broken read path. Never open a
   second tab or resend INIT/EXECUTED just because a wait timed out.

### Control-message send guard (same tab, idempotent)

Use this guard for boot, INIT, HANDOFF, EXECUTED, and workspace_info messages.
Each browser action or observation is a separate call with the budget in §6.

1. Before typing, retain a small baseline outside browser JS memory: tab URL/ID,
   exact message and marker (STATE + TASK_ID + ITERATION), whether that marker
   appears in a user message, draft content, and generation state. A substring
   in an assistant quote or a previous protocol phase is not submission proof.
   Keep the normal local checkpoint pending before attempting a send.
2. If that exact message is already submitted, wait/read the reply. If another
   response is generating or an unrelated draft exists, do not overwrite it.
   Otherwise fill once, then inspect a fresh AX/DOM tree in a separate call.
3. Click the current enabled Send control once, using fresh element evidence.
   Do not press Enter after an uncertain click. Confirm submission with either
   (a) the exact phase/task/iteration message in user history, or (b) the draft
   clearing AND new assistant generation starting after the send attempt when
   generation was absent in the baseline. A successful tool return is not proof.
4. If a timeout occurs, keep the pending checkpoint. A kernel reset destroys
   all JS bindings; rediscover and claim the same tab as in §2. Do not reuse
   stale element IDs. Allow one recovery pass: one fresh observation, with the
   60-second budget, and at most one screenshot fallback if AX/DOM cannot read.
   Use the current API's `getScreenshot()` / `click([x, y])`, not an assumed
   `tab.cua` method. If claim itself still fails, there is no valid tab handle
   for a screenshot: report that boundary instead of inventing another route.
5. After recovery, if submitted, do not resend. Only if stable fresh evidence
   shows the exact draft still present, no generation, the exact user message
   absent, and an enabled Send control may one click retry occur. Use a fresh
   screenshot for a coordinate retry after a failed semantic action. Verify
   again after that retry; never retry a second time.
6. An empty composer and absent marker after any attempted send or reload is
   **ambiguous**, even when no generation is visible: a reply may have finished
   or history may be incomplete. Do not refill automatically. If no submission
   action was ever attempted and a failed fill left a verified empty composer,
   it is safe to refill once after confirming the correct page and no generation.
7. A same-tab reload is allowed once when controls are stuck, after a separate
   markHandoff call. Read the loaded page separately; apply the same evidence
   rules. Reload never turns an ambiguous send into a proven-unsent message.
8. If the recovery read/screenshot still times out or the result stays ambiguous,
   stop browser retries, preserve pending state (`INIT` + `waitingFor=none`, or
   `EXECUTED_LOCAL`), and tell the user which operation could not be confirmed.
   A healthy doctor does not establish browser health. Do not rebuild the
   connector, restart the bridge, or create a new chat for this symptom.
   Inspect desktop logs for current-task route errors; report them as a host
   limitation, not as fixed by this skill. Resume recovery only after new
   evidence or an external-state change. Do not turn transport failure into
   an endless generation polling loop.

### Isolated browser diagnostics

When the user asks to test C2C without advancing unfinished work, this section
replaces the coding workflow and normal Project chat boot/resume steps.

- Read the saved session for preservation only; do not resume its checkpoint,
  run project tests, send its INIT/EXECUTED/HANDOFF, call its workspace tools,
  write execution records, or save a diagnostic URL over the existing session.
- Use an isolated chat outside the Project. Opening `https://chatgpt.com/` is
  allowed for this diagnostic scope; select the visible temporary-chat control
  when available. Never navigate or type in the unfinished task's chat.
- Send a unique harmless marker, explicitly asking for a fixed reply and no
  tools/project work. Verify draft, enabled Send, user history, returned marker,
  and cleared composer. A local doctor pass alone is not end-to-end success.
- Record measured timings, fallback used, and limits in the C2C checkout's
  diagnostic report. Do not use `c2c record` or `session set` for this test.

## Locations

- The codex-with-chatgpt checkout lives at: `<ACTUAL_CHECKOUT_PATH>`
  (installer/update MUST replace this line in the installed Skill with the user's actual checkout path.)
- CLI: let `<checkout>` mean the path on the previous line; run
  `node "<checkout>/bin/c2c.js" <command>` (or `c2c <command>` if globally linked).
  All commands support `--json` for parsing.
- If the checkout has no `node_modules` or no `dist/`, first run
  `corepack pnpm install && corepack pnpm build` inside it.
- Always pass `-w <workspace root>` (the project the user is working on, NOT the c2c repo).

## Update check boundary (once per new user instruction)

Run `c2c update-check --json` only once when a NEW top-level user instruction
first invokes a C2C workflow, before the first C2C action for that instruction.
Also run `c2c sandbox-allow --json` at that same entry boundary. Treat the
whole INIT → PLAN → EXECUTED → REVIEW loop as one instruction, even when it
spans many turns or context compactions.

Do NOT check for updates again while that instruction is active. In particular,
skip `update-check` during PLAN/EXECUTED iterations, checkpoint resume, automatic
continuations, browser timeout recovery, doctor-triggered repair/reconnect, or
after short user continuation replies such as「继续」「好了」, an approval answer,
login completion, status request, or clarification. The same active C2C
`TASK_ID` always belongs to the same instruction. If it is unclear whether the
active instruction was already checked, skip the check rather than interrupt
work. A genuinely new user goal that starts a new C2C task gets one new check.

`sandbox-allow` writes the C2C state directory into Codex's sandbox
`writable_roots` (macOS: `~/Library/Application Support/codex-with-chatgpt`;
Windows: `%LOCALAPPDATA%\codex-with-chatgpt`; config file is
`~/.codex/config.toml` on both, or `%USERPROFILE%\.codex\config.toml` on Windows).
If already allowlisted, it is a no-op and does not trigger elevation. A repair
may still run `sandbox-allow` when an actual sandbox/state-dir error requires it;
that exception does not authorize another update check.

- `{ "updateAvailable": false }` → continue silently. Never mention the check.
- `{ "updateAvailable": true }` → tell the user one line:
  "检测到 Codex with ChatGPT 有新版本，我先更新一下（约 1 分钟），随后继续你的任务。"
  Then run the update workflow below before starting the new instruction, and
  CONTINUE that instruction afterwards. Never start an automatic update after
  INIT has been sent or while an existing C2C checkpoint/task is in progress.

If the user explicitly asks to update Codex with ChatGPT, run **Workflow:
update** directly; that explicit maintenance request is not a background check.

## Workflow: update（"更新 Codex with ChatGPT"，or triggered at the new-instruction boundary）

Inside the checkout directory (see Locations):

1. `git pull --ff-only` (if it fails due to local edits: `git stash && git pull --ff-only`).
2. `corepack pnpm install && corepack pnpm build`.
3. Re-install the Skill: copy `skill/SKILL.md` to
   `~/.codex/skills/codex-with-chatgpt/SKILL.md`, then fix the "checkout lives at:"
   line in the copy to the actual checkout path.
4. `c2c sandbox-allow --json` (so existing installs pick up the sandbox allowlist),
   then `c2c restart -w <workspace>` so the bridge runs the new code, then
   `c2c update-check --force --json` to refresh the cache (should now report up to date).
5. Tell the user "✓ 已更新到最新版本" — then resume whatever task triggered this.
   (The updated SKILL.md takes effect from the next Codex session; that's expected.)

## Connection choice (once per workspace)

Ask this **before** the public address exists (`c2c setup` / first `doctor --fix`
that starts a tunnel). Do not mention tunnels, wrangler, DNS, or hostnames.
Speak only of 临时地址 / 固定域名 / 登录 Cloudflare.

1. `c2c tunnel status -w <workspace> --json`
2. If `needsChoice` is false: do not ask again.
3. If `needsChoice` is true: tell the user exactly `userPrompt` and wait.
   - 没有账号 / 没有域名 / 临时 / 不用 →
     `c2c tunnel choose -w <ws> --mode quick --json`
   - 有域名（例如 example.com）→ first tell them `loginPrompt`, then
     `c2c tunnel choose -w <ws> --mode named --zone <domain> --json`.
     This may open the user's own browser (the Cloudflare exception in
     Golden rule 5). Wait until the command finishes.
     If they said they have an account but gave no domain: ask once for the
     domain. If the command returns `need: "zone"`, ask once and retry.
     If `fallback` is true: tell them `userMessage` and continue on the
     temporary address. Do not retry named unless they ask.
4. Never put connection credentials in the project. The CLI stores them in
   the C2C state directory.

## Workflow: first-time setup（"使用 Codex with ChatGPT 完成首次配置"）

**Connector completion record (setup and every reconnect):** The CLI stores
the observed address separately from the address configured in ChatGPT. After
the user reports completing configuration in manual mode, or after observing
Connected/authorization success in auto mode, run
`c2c connector-confirm -w <ws> --url <exact mcpUrl just configured> --json`.
Then run doctor again and verify ChatGPT access separately. This command only
records configuration completion; it is not evidence of successful file reads.
Never run it just to clear a doctor warning or because local health is green.
If the URL changed while the user was configuring it, the command rejects the
old URL: provide the new information and wait for completion again.

1. Detect prerequisites yourself: `node --version` (>= 20), and check `cloudflared`.
   - If cloudflared is missing on macOS run `brew install cloudflared`; on Windows use
     `winget install Cloudflare.cloudflared`. Do this yourself; don't ask.
2. If the c2c repo has no `node_modules`, run `pnpm install && pnpm build` in it.
3. Run `c2c sandbox-allow --json`, then **Connection choice**, then
   `c2c setup -w <workspace> --json`.
   `sandbox-allow` edits Codex `config.toml` only — it adds C2C's state directory
   to `[sandbox_workspace_write].writable_roots` so later chats can write logs
   without elevation. If the write is denied, request approval and retry once.
   → returns `{ mcpUrl, pairingCode, workspaceName, connectorName, ... }`.
   `connectorName` is this workspace's plugin title (legacy installs stay
   `Codex with ChatGPT`; additional workspaces get `Codex with ChatGPT · <name>`).
   Pairing codes expire in ~5 minutes: run `c2c pair --json` for a fresh one if you're slow.
4. `c2c prefs --json` (this machine, not this workspace).
   - If `setupMode` is null: tell the user exactly `setupChoicePrompt`. Wait
     for「1」or「2」. Then `c2c prefs set --setup-mode auto` or `--setup-mode manual`.
     Do not open ChatGPT settings and do not start automatic configuration
     until they answer. Do not default to auto.
   - If they later ask to switch: same `c2c prefs set --setup-mode` command.
     Do not re-ask on a later workspace or on reconnect.
   - `setupMode: "manual"`: skip step 5's automatic ChatGPT settings. Go to
     **Guided manual ChatGPT setup** (chosen). Opening line:
     `接下来用手动教学配置。一次只需要做一个操作。`
     Do not say 自动配置没有成功.
   - `setupMode: "auto"`: continue with step 5. Keep the two-failure fallback.
5. Open ChatGPT on the ONE iab tab (see **In-app browser**). Foreground +
   markHandoff immediately. Same tab, `goto` only:
   - 开发人员模式: skip `https://chatgpt.com/#settings/Security` when
     `developerModeEnabled` is true. Otherwise open it, enable 开发人员模式
     ("Developer mode") if it is off, then `c2c prefs set --developer-mode`.
     Never record it as off. If creating the connector later says developer
     mode is required, open this page, enable it, save `--developer-mode`,
     and retry create — do not skip that recovery.
   - 已有该 `connectorName`: `https://chatgpt.com/plugins` — Delete it (never
     Reconnect). Then `goto` the 加插件 URL below.
   - 还没有 / 刚删掉: `https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins`
     Operate ONLY on `connectorName` from step 3:
      - If that exact name exists: Delete it, then create it again. Never
        Reconnect, never edit-in-place, never open the old Server URL.
      - If it does not exist: create one with that exact name.
      - Never rename, delete, or edit a connector that belongs to another workspace.
      - Description: `Securely connect ChatGPT to the current Codex workspace for planning and review.`
      - Server URL: the `mcpUrl` from step 3
      - Authentication: OAuth
     Fill the known form in one script when you can. Then Connect / Authorize
     and type the pairing code. As soon as it shows Connected / authorized /
     pairing accepted, continue — do NOT wait for 8 tools on this page.
6. Same tab: open the first C2C chat per **Conversation management**
   (Project collection for a new workspace; `https://chatgpt.com/` only
   in long-chat). Confirm Chat mode per **In-app browser** §7 (if it is Work,
   open a new Chat conversation instead). Send the boot prompt from
   `docs/protocol.md` §Boot Prompt, then (same chat) send:
   `Use the "<connectorName>" connector: call workspace_info and read hello-style top-level file. Reply with the workspace name.`
   Confirm the reply matches `workspaceName` (wait per **In-app browser** §8).
   Only then save the chat URL with `c2c session set` (see Conversation
   management). If the name does not match, do not save. markDeliverable.
7. Report to the user exactly in this shape (no internals):

```
Codex with ChatGPT

✓ 当前项目已识别
✓ Workspace Bridge 已启动
✓ 安全连接已建立
✓ ChatGPT 已连接
✓ 文件读取测试通过

Ready.
```

If a login wall appears (ChatGPT, Cloudflare): stop, tell the user the ONE thing
to do ("请登录 ChatGPT，完成后告诉我'好了'"), then continue.

### Guided manual ChatGPT setup

Enter this path when `setupMode` is `manual` (chosen at the start), or when
automatic ChatGPT browser configuration fails twice at the same explicit
setup/reconnect step after `c2c doctor` / repair. Do NOT enter the failure
path for a browser/js timeout without a visible error, a page that is
still loading/generating, or while waiting for login / 2FA / CAPTCHA.
A chosen manual path does not wait for those two failures.

Stop automating ChatGPT settings. Keep the current local C2C state and the
current `mcpUrl`, `pairingCode`, `workspaceName`, and `connectorName`. Do not
silently fall back to Codex-only execution and do not permanently disable C2C.
Do not change the saved `setupMode` when this is a failure fallback.

For a returning user in saved manual mode, including the first C2C use after
restarting Codex, perform local connection checks but leave ALL ChatGPT
connector settings actions to the user. If setup/re-pairing is needed, present
the current connector name, create/manage page links, Server URL, Authentication
(`OAuth`), description, and fresh pairing code with its expiry together in one
copyable message. Obtain missing/expired codes with `c2c pair -w <ws> --json`.
Do not click Delete/Create/Connect/Authorize or type the code on their behalf.
Wait for the user to report completion before verification or task messages.
Then record completion with `connector-confirm` as described above, before the
follow-up doctor. Repeated doctor calls keep repair pending until this record
exists. If `pairingActive: true` but no new code is returned, reuse the code
already handed to the user; doctor intentionally does not invalidate it.
Only request a fresh `pair` code if it expired, was lost, or the user asks.
This returning-user handoff replaces the one-action-at-a-time tutorial below;
use that tutorial only when they need step-by-step help. If the existing
connection is healthy and no repair is needed, reuse it without forced deletion
or a new pairing code. Manual setup does not disable normal chat collaboration
after connection succeeds. Never reinstall the local C2C software for this flow.

Opening line:

- Chosen (`setupMode: "manual"`): `接下来用手动教学配置。一次只需要做一个操作。`
- Failure fallback: `自动配置没有成功，我来带你手动完成。一次只需要做一个操作。`

Then guide ONE action at a time, waiting for the user to say「好了」before the
next action:

1. If `developerModeEnabled` is not true: ask them to open
   `https://chatgpt.com/#settings/Security` and enable 开发人员模式. After they
   say「好了」, `c2c prefs set --developer-mode`. If it is already remembered,
   skip this step.
2. Ask them to open `https://chatgpt.com/plugins`. If the exact `connectorName`
   exists, delete only that connector. Never ask them to touch another workspace's connector.
3. Ask them to open
   `https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins`
   and create the exact `connectorName` with:
   - Description: `Securely connect ChatGPT to the current Codex workspace for planning and review.`
   - Server URL: the current `mcpUrl`
   - Authentication: OAuth
4. Ask them to Connect / Authorize and enter the current pairing code. If it
   expired, run `c2c pair --json` and give them only the fresh pairing code.
5. When they report Connected / authorized / pairing accepted, resume the normal
   setup/reconnect flow at its ChatGPT verification step. If automatic browser
   verification then hits the same explicit failure twice, stop and report the
   exact failed step; do not loop indefinitely and do not continue without C2C.

## Conversation management

`c2c session -w <ws> --json` → `{ session, conversation }`.
`conversation.mode` is the only switch. Missing / legacy files with a chat URL
and no Project stay **long-chat**. Do not ask those users to migrate. If they
later say they want a Project, run **Bind Project**. A brand-new workspace
(no session file) is **project**.

Never match a Project or a chat by display name. Never upload the repo to
Project sources. Never click 分享 / Share. Do not rename ChatGPT chats.

### long-chat (do not rewrite this path)

ONE ChatGPT conversation per workspace. Same as before.

- **Find it**: if `conversation.reuseSavedChat` and `conversation.chatUrl`,
  `goto` that URL (foreground + markHandoff) and continue there.
- **Save it**: after boot + workspace_info, and the reply names this workspace,
  `c2c session set -w <ws> --mode long-chat --url <url> --title "C2C <workspace name>"`.
  If the name does not match, do not overwrite a previously saved URL.
- **Update it**: after each EXECUTED/DONE,
  `c2c session set -w <ws> --task <id> --iteration <n> --state <STATE>`
  plus checkpoint flags from the coding workflow (`--protocol-state`,
  `--waiting-for`, `--goal`, `--next-step`, `--known-issues`, or
  `--clear-checkpoint` on DONE). Do not put logs or diffs in those fields.
- **Switch it** ONLY when (a) the user asks for a new chat, (b) the current
  chat visibly lags, or (c) this conversation is Work. Then:
  1. Same iab tab: `goto` `https://chatgpt.com/`, confirm Chat mode
     (**In-app browser** §7), then send the boot prompt.
  2. Send a HANDOFF (`docs/protocol.md`) — goal, progress, state, issues,
     next step. Never paste files.
  3. workspace_info check; only then `c2c session set --url`. On failure,
     leave the old saved URL unchanged.
- Saved chat 404s: treat as a switch. Reconstruct HANDOFF from
  `session.checkpoint` (goal, progress, issues, next step). If there is no
  checkpoint, use `task` / `iteration` / `lastState` and `execution_summary`
  metadata only. Never paste logs or output bodies.

### project (new workspaces)

One ChatGPT Project per workspace. Mapping:

1. Same Codex conversation (this thread still has context) → same ChatGPT
   chat URL. `goto` that URL directly. Do not open the collection first.
2. Same workspace, a **new** Codex conversation → new ChatGPT chat from the
   collection page (`conversation.projectUrl`). Ignore `session.url` unless
   you already saved it earlier in THIS Codex thread.
3. Different workspace → different Project and different connector.

**Open a chat in this Codex thread**

- If you already saved a ChatGPT chat URL earlier in THIS Codex conversation:
  `goto` that URL. Continue. No new chat. No HANDOFF.
- Else if `conversation.projectReady`: `goto` `conversation.projectUrl`.
  On that page, use the on-page composer (「{项目名}中的新聊天」 / "New chat
  in …"). Do not use the sidebar and do not `goto` `https://chatgpt.com/`.
  Confirm Chat mode (**In-app browser** §7). Boot prompt, then workspace_info
  with the **exact** `connectorName`. After the reply names this workspace,
  `c2c session set -w <ws> --mode project --project-url <collection> --url <chat> --connector-name "<connectorName>" --title "C2C <workspace name>"`.
  If this Codex thread is continuing a previous C2C task, send HANDOFF right
  after the boot prompt.
- Else: **Bind Project** first.

**Update it**: same `c2c session set --task / --iteration / --state` as long-chat.

**Wrong collection**: do not guess another Project. Tell the user the expected
workspace name, ask them to open the right collection, then say「已找到」.
Also offer「继续用长对话」. If they pick long-chat:
`c2c session set -w <ws> --mode long-chat` and use the long-chat path.
If the collection 404s or the new chat is not inside the Project, same choice.

**Saved chat 404s** (this thread): `goto` the collection, open a new chat
there, boot + HANDOFF from `session.checkpoint` (no logs) + workspace_info,
then save the new chat URL. Keep `--project-url`.

### Bind Project (user creates the collection once)

Do this for a new workspace, or when an existing user asks to switch to
Project. Do **not** click the ChatGPT sidebar to create the Project
(Computer Use is forbidden; IAB must not hunt that menu).

1. Tell the user exactly this (fill in the workspace name):

```
请在 ChatGPT 里新建一个项目，名字用「<workspaceName>」，记忆请选「仅限项目记忆」。

如果侧栏里看不到「项目」：把鼠标放在「聊天」上，点右边出现的三个点，选择「按项目整理」。

建好后会打开合集页面。看到页面后跟我说「好了」。
```

2. Wait for「好了」/ the collection page. Same iab tab: read the address bar.
   It must look like `https://chatgpt.com/g/g-p-…/project`. If it does not,
   ask them to open that project until it does. Then:
   `c2c session set -w <ws> --mode project --project-url <url> --connector-name "<connectorName>"`.

3. On that same collection page only, open 右上角 **… → 项目设置**.
   Do not click 分享. Do not add 来源 / files.
   - 记忆: 仅限项目记忆 (project-only). Leave 库访问权限 disabled.
   - 指令: paste **Project instructions** below (fill `{{…}}` from
     `workspace_info` / setup). Use the exact `connectorName` from setup.
     Never write the public / temporary address into 指令.
   Save and close settings.

4. Still on the collection page, create the first chat with the on-page
   composer, then boot + workspace_info as in setup step 5. Save the chat URL.

### Project instructions (paste into 项目设置 → 指令)

```
You are the planning and review layer for one local workspace. Codex executes.

This Project is bound only to:
- Workspace name: {{workspace_name}}
- Kind: {{project_type}} ({{languages}} / {{frameworks}})
- Connector (use this one only): {{connector_name}}

When you call tools, use ONLY that connector. Do not use any other
Codex with ChatGPT connector. If workspace_info names a different
workspace, stop. Do not plan. Do not use this Project's memory.

Read code, git, diffs, and any released command output through that
connector. Never ask anyone to paste file bodies, diffs, or logs. After
EXECUTED, call execution_output (list, then read) when a readable item
exists; if status is restricted, review from git instead. Never upload
the repo into this Project's files or sources.

When facts conflict, trust this order:
1. Current code from the connector
2. A HANDOFF in this chat (this task's goal, progress, next step)
3. These instructions
4. This Project's memory (durable architecture only; stale memory loses)

This Project's memory is only for this workspace. On HANDOFF, trust the
brief, re-read code through the connector, and resume at NEXT_EXPECTED_STEP.

Be substantive: why, which file, what to test. No empty one-liners and
no 40-step epics. Use C2C control messages.
```

## Workflow: coding task（"使用 Codex with ChatGPT 完成 XXX"）

Protocol states sent to ChatGPT: INIT → PLAN → EXECUTING → EXECUTED → REVIEW → (PLAN | DONE | BLOCKED).
Local checkpoint states (session only, never a ChatGPT `STATE:` line):
`INIT`, `PLAN_RECEIVED`, `EXECUTING`, `EXECUTED_LOCAL`, `EXECUTED_SENT`,
`DONE`, `BLOCKED`. For `INIT`, `waitingFor=none` means send/verification is
pending; `waitingFor=GPT_PLAN` means INIT is confirmed submitted.
Do not invent `STATE: RESUME`. If the original chat is gone, send HANDOFF.
All control messages start with `[C2C]`. Keep Codex→ChatGPT messages under 1 KB.
ChatGPT's replies are expected to be substantive (see step 3). Docs: `docs/protocol.md`.

0. `c2c tunnel status -w <workspace> --json`. If `needsChoice`, follow
   **Connection choice** first (existing installs: ask once, then remember).
   Then `c2c doctor -w <workspace> --json` (auto-repairs). **Doctor gate:** if local
   is not green, do not open ChatGPT and do not send INIT. If
   `namedRepair.needed` is true, tell the user `namedRepair.userMessage`, run
   `c2c tunnel login --json` (their browser; Cloudflare exception), then doctor
   again. If `chatgptRepair.needed` is true, tell the user `chatgptRepair.userMessage`
   (one paragraph, no internals), run **Workflow: reconnect after address
   reclaim**, then doctor again and only continue when the gate is green.
   Generate task id: `c2c_` + 4 random hex chars — unless a checkpoint already
   has one (reuse that id; do not mint a second task).
1. `c2c session -w <workspace> --json`. Open ChatGPT on the same iab tab
   per **Conversation management** for `conversation.mode` (foreground +
   markHandoff). long-chat: saved chat, or `https://chatgpt.com/` if none.
   project: this thread's chat URL, or the collection page for a new chat,
   or **Bind Project** if `projectReady` is false. On a NEW conversation
   confirm Chat mode (**In-app browser** §7), then send the boot prompt from
   `docs/protocol.md` §Boot Prompt and the workspace_info check (name the
   exact `connectorName`). Confirm the reply names the current workspace
   before saving the session URL. Do not use the browser to re-read code MCP
   already provides. After sending a control message, wait per
   **In-app browser** §8.

   **Resume from `session.checkpoint` before any INIT.** Missing checkpoint
   (legacy session): continue as a normal new/continued loop. A browser/js
   timeout is not a lost task — claim the original tab; do not INIT, re-run,
   or resend EXECUTED just because a wait timed out.
   - `EXECUTED_SENT` + `waitingFor=GPT_REVIEW`: do not INIT, do not re-run,
     do not resend EXECUTED. Stay on the saved chat and wait for review. If
     that chat 404s: HANDOFF from checkpoint fields (no logs), then wait.
   - `EXECUTED_LOCAL`: local work is done; before sending, apply the
     **Control-message send guard** and inspect the current chat for the exact
     task/iteration marker. Only send EXECUTED if it is not already present
     (record first if this iteration has no record yet). Do not re-run.
   - `EXECUTING`: not finished. Continue the current PLAN if you still have
     it; otherwise HANDOFF and ask ChatGPT to restate the last PLAN. Do not
     treat it as done and do not INIT a new task.
   - `PLAN_RECEIVED`: execute that plan. Do not INIT.
   - `INIT` + `waitingFor=none`: INIT may be drafted, submitted, or ambiguous.
     Apply the **Control-message send guard** to the exact task/iteration
     marker. If a submitted signal is present, set `waitingFor=GPT_PLAN` and
     wait for PLAN. If the exact draft is proven unsent and the current send
     control is enabled, allow the guard's single retry. Otherwise keep
     `waitingFor=none`; do not mint a new task or send a second INIT.
   - `INIT` + `waitingFor=GPT_PLAN`: claim the tab and wait. Do not resend INIT.
   - `DONE`: summarize to the user if needed; `c2c session set --clear-checkpoint`.
   - `BLOCKED`: surface ChatGPT's reason; do not INIT.
   Never re-pair, never recreate the connector, and never rewrite Project
   instructions just to resume.
2. Send INIT with the user's goal (skip when the checkpoint says not to).
   Before filling the composer, persist the local pending checkpoint:
   `c2c session set -w <ws> --task <id> --iteration 0 --state INIT --protocol-state INIT --waiting-for none --goal "<short goal>" --next-step "send or verify INIT"`
   Then apply the **Control-message send guard** to this message:

```
[C2C]
STATE: INIT
TASK_ID: c2c_f81a
ITERATION: 0

GOAL:
<user's goal, one paragraph>

INSTRUCTION:
Inspect the connected workspace through the Codex with ChatGPT MCP connector.
Produce a C2C PLAN message.
```

   Only after a submitted signal is observed, promote the checkpoint:
   `c2c session set -w <ws> --task <id> --iteration 0 --state INIT --protocol-state INIT --waiting-for GPT_PLAN --goal "<short goal>" --next-step "wait for PLAN"`
   If the result remains ambiguous, leave `INIT` with `waitingFor=none` and
   recover through the guard; do not wait as though INIT were known to be sent.
3. Wait for ChatGPT's `STATE: PLAN` reply (**In-app browser** §8 — short DOM
   checks, same tab; apply bounded recovery if the read itself fails).
   Read GOAL/ACTIONS/TESTS/SUCCESS_CRITERIA.
   A good PLAN also carries RATIONALE and concrete natural-language edit
   suggestions (which file, what to change, why). If the reply is a bare
   one-liner with no rationale or file-level guidance, ask once:
   "Please expand the plan with rationale and concrete per-file suggestions."
   Then:
   `c2c session set -w <ws> --protocol-state PLAN_RECEIVED --waiting-for none --next-step "execute PLAN"`
4. Execute the plan yourself with your own harness (your tools, your judgment;
   ChatGPT does not micro-manage tool calls).
   Before you start:
   `c2c session set -w <ws> --protocol-state EXECUTING --waiting-for none --next-step "finish PLAN then record"`
5. Record the execution so ChatGPT can read it via MCP. Metadata always:
   `c2c record -w <ws> --task c2c_f81a --iteration 1 --changed-files "src/a.ts,src/b.ts" --tests "27 passed" --exit-status ok`
   If this iteration ran a **test / build / lint / typecheck** command, also
   pass that command's output. Write stdout/stderr to a local temp file first,
   then:
   `c2c record … --command "pnpm test" --output-file <temp> --exit-code <n>`
   Record both success and failure. Do not record shell history, `.env`,
   keys, or unrelated dumps. Never paste that file (or any log) into ChatGPT.
   If the CLI says the output was not released, still send EXECUTED; ChatGPT
   reviews from git. Then:
   `c2c session set -w <ws> --iteration 1 --state EXECUTED --protocol-state EXECUTED_LOCAL --waiting-for none --next-step "send EXECUTED"`
6. Send EXECUTED (no diffs, no logs). Tell ChatGPT to use MCP, including
   `execution_output` when a readable item exists:

```
[C2C]
STATE: EXECUTED
TASK_ID: c2c_f81a
ITERATION: 1

RESULT:
Execution finished.

CHANGED_FILES:
4

TESTS:
27 passed

Please independently inspect the workspace and current git diff through MCP.
If execution_output lists a readable item for this iteration, list then read it.
If status is restricted, ignore it and review from git_diff.
```

   Apply the **Control-message send guard** and require one of its submitted
   signals before recording the message as sent. If the browser call timed
   out, keep the local checkpoint unchanged until fresh DOM provides that
   evidence; do not press Enter or resend on an ambiguous result. Then:
   `c2c session set -w <ws> --protocol-state EXECUTED_SENT --waiting-for GPT_REVIEW --next-step "wait for PLAN or DONE"`
7. ChatGPT reviews via MCP (`git_diff`, `read_file`, `test_status`,
   `execution_output`) and replies DONE / PLAN (next iteration) / BLOCKED.
8. Loop. Respect maxIterations (`.c2c.json`, default 12). At the limit, pause and ask
   the user: "已完成 12 轮协作，仍有未解决问题，是否继续？"
9. On DONE: summarize the result to the user in plain language.
   `c2c session set -w <ws> --state DONE --clear-checkpoint`
10. On BLOCKED: read ChatGPT's reason, fix what you can, or surface the single
    decision the user must make.
    `c2c session set -w <ws> --protocol-state BLOCKED --waiting-for USER --known-issues "<short reason>"`

## Workflow: disconnect（"断开 ChatGPT"）

1. `c2c unpair -w <workspace>` (revokes all tokens immediately).
2. Optionally remove the connector on the same iab tab via
   `https://chatgpt.com/plugins` (foreground + markHandoff). Only touch
   this workspace's `connectorName`.
3. Tell the user: "已断开 ChatGPT 对该项目的访问。"

## Workflow: reconnect after address reclaim（全关掉以后地址失效）

This is the normal case when the user quit Codex / the terminal / the machine:
the previous public address is gone. Doctor already started a new one.
`connectorAction: "update"` means Delete + create again — not Reconnect.

`c2c doctor --json` will look like:
`{ "chatgptRepair": { "needed": true, "connectorAction": "update", "connectorName": "...", "userMessage": "...", "mcpUrl": "...", "pairingCode": "...", "pages": { ... } } }`

1. Read `c2c prefs --json` before any settings action. Do not re-ask setup mode.
   If `setupMode` is `manual`, provide the returning-user information/code
   handoff in **Guided manual ChatGPT setup**, then wait. Do not execute the
   automatic settings steps 2–3 below. In auto mode, explain the address change
   and perform steps 2–3. Do not open the C2C chat or send `[C2C]` until repair
   finishes and a follow-up doctor is green. Never send a task message as a
   speculative connection test.
2. Same one iab tab as setup (foreground + markHandoff). Settings URLs only
   until Connected — never hunt menus:
   - 开发人员模式: skip `https://chatgpt.com/#settings/Security` when
     `developerModeEnabled` is true. If create/delete then says developer
     mode is required, open it, enable, `c2c prefs set --developer-mode`.
   - 插件总管（只用来 Delete）: `https://chatgpt.com/plugins`
   - 加插件（Delete 之后必走）: `https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins`
3. Operate ONLY on `chatgptRepair.connectorName`. Never touch another
   workspace's connector.
   - If that exact name exists on the plugins hub: **Delete** it. Confirm the
     delete if ChatGPT asks. **Never click Reconnect, Refresh, Connect, or
     Edit** on the old card — the old Server URL is dead and the page will
     hang on "This site cannot be reached".
   - Then `goto` the 加插件 URL and create that **same** `connectorName`
     (do not invent a second name):
      - Description: `Securely connect ChatGPT to the current Codex workspace for planning and review.`
      - Server URL: `chatgptRepair.mcpUrl`
      - Authentication: OAuth
     Then Connect / Authorize and type `chatgptRepair.pairingCode`
     (or `c2c pair --json` if it expired). Continue as soon as it is Connected —
     do not wait for 8 tools on the settings page.
   - If the name is already gone, skip Delete and only create.
4. Record actual configuration completion with `connector-confirm` (see
   first-time setup), then `c2c doctor --json` again. Same tab: only after the Doctor gate is green,
   reopen the chat this Codex thread was already using (`session.url` /
   the URL you saved earlier in THIS thread). Do not start a new
   audit/task chat just because the address changed. Do not rewrite Project
   instructions — they store the connector **name**, which did not change.
5. If the ChatGPT conversation was lost: long-chat → Conversation
   management switch. project → collection page, new chat, boot + HANDOFF.
   No file re-uploading (the workspace lives in MCP). After recreating the
   same-name connector, the Project still uses that name. If tools point at
   the wrong connector, open 项目设置 and confirm 指令 still names
   `connectorName` (never paste the new public address).

## Workflow: repair（anything looks broken）

1. `c2c doctor -w <workspace> --json`. Doctor gate: do not open ChatGPT / send
   `[C2C]` until local is green, except reconnect settings pages.
2. If `namedRepair.needed`, tell the user `namedRepair.userMessage`, run
   `c2c tunnel login --json`, then doctor again. Do not Delete the connector.
3. If `chatgptRepair.needed`, follow **reconnect after address reclaim**, then
   doctor again.
4. Otherwise apply the recovery map. Only involve the user for login / 2FA /
   CAPTCHA — one action.

## Recovery map

| Symptom | Action |
| --- | --- |
| Bridge not running | `c2c start` (doctor does this automatically) |
| Tunnel dead / URL unreachable / 全关掉后连接失效 | `c2c doctor` → if `namedRepair.needed`, login to Cloudflare and doctor again (do not Delete). If `chatgptRepair.needed`, tell the user the message, then **Delete** THIS workspace's connector only (`connectorName`) and create it again. Never Reconnect. |
| ChatGPT says tool call failed / 401 | token expired or revoked → re-pair (new pairing code + authorize) |
| Pairing code rejected/expired | `c2c pair --json` for a fresh code |
| Same explicit ChatGPT setup/reconnect browser configuration step fails twice after repair | Stop automating ChatGPT settings and use **Guided manual ChatGPT setup fallback**. Do not count browser/js timeout, loading/generating, or login/2FA waiting as failures. |
| Port conflict | handled automatically; never surface to the user |
| Every new chat “repairs” / cannot write the log or settings directory | `c2c sandbox-allow --json` (once). Do not ask the user. |
| cloudflared missing | install it yourself (brew/winget), then retry |
| Composer keeps a `[C2C]` message while browser click times out, or the browser fill disappears | Apply the send guard. If submitted, wait. If the exact draft remains, use the guard's single verified retry. Empty composer after an attempted send is ambiguous; do not refill. Never create a new connector/chat. |
| `js execution timed out; kernel reset` | Use the 60-second outer budget; rediscover all handles after reset and apply the bounded send guard. Screenshot fallback must use the current documented API. |
| Repeated `No ChatGPT browser route is available` with a healthy `c2c doctor` | This is a desktop routing signal, outside the C2C bridge. Try the bounded current-API recovery first; errors can coexist with successful slow page actions. If still blocked, preserve the connector and report the operation/task id. An app update/restart is a possible next step, not a verified cure; do not interrupt other running tasks automatically. |
| Sidebar has no「项目」 | Ask the user to hover「聊天」, click the …, choose「按项目整理」 |
| Collection page is the wrong Project | Ask the user to open the named collection and say「已找到」, or accept long-chat |
