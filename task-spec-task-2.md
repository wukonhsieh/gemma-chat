# Task Spec

## Goal

- 建立 workspace path classification，讓 filesystem tools 能在執行前判斷 requested path 是否位於目前 conversation 的 resolved workspace root 內，並對 workspace 外路徑產生 forced ask 訊號。

## Non-Goals

- 本 task 不實作完整 tool permission wait/resume flow。
- 本 task 不新增 renderer approve/deny UI。
- 本 task 不允許 workspace 外路徑實際 bypass 現有 `assertInWorkspace`。
- 本 task 不改變 `run_bash` command parsing 的完整安全策略；shell command forced ask 會在後續 tool gate task 接入。

## Functional Spec

- Input:
  - `conversationId`
  - tool 提供的 path 字串
  - conversation 已註冊或 fallback 的 workspace root
- Output:
  - path classification result，包含原始 path、workspace root、resolved path、是否在 workspace 內、是否需要 ask、reason。
- State Transitions:
  - 無持久狀態變更；classification 是 pure-ish lookup based on current workspace root。
- Rules:
  - 空 path 不應被視為 workspace-safe。
  - 一般相對路徑如 `index.html`、`src/app.js` 應分類為 workspace 內。
  - `..` traversal、absolute path、或 resolve 後位於 workspace root 外的 path 必須分類為 `requiresAsk: true`。
  - Classification 不取代 `assertInWorkspace`；實際 workspace 內 operations 仍使用既有 guard。

## Constraints

- 修改 `src/main/workspace.ts` 時必須保留 `assertInWorkspace`。
- Project-based workspace routing 仍要使用 `workspaceDir(conversationId)` 的 resolved root。
- 不能讓 preview server、list tree、workspace open 等既有 workspace behavior 退化。

## Acceptance Criteria

1. Given a registered or fallback workspace
   When `classifyWorkspacePath` receives `index.html`
   Then it reports the path as inside the workspace and does not require ask.
2. Given a workspace root
   When `classifyWorkspacePath` receives `../outside.txt`
   Then it reports the path as outside the workspace and requires ask.
3. Given a workspace root
   When `classifyWorkspacePath` receives an absolute path outside that root
   Then it reports the path as outside the workspace and requires ask.
4. Given existing workspace operations
   When TypeScript checks the node project
   Then `assertInWorkspace` remains available and existing workspace functions compile.
