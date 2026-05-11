# Task Spec

## Goal

- 建立 Project-aware persistence / workspace routing 的基礎 contract，讓 renderer 可以取得 folder path，並讓 main process 能把 conversation 對應到指定 workspace folder，同時保留舊的 per-conversation fallback。

## Non-Goals

- 不實作完整 Project selector UI。
- 不改變 Project 排序或 conversation list 呈現。
- 不刪除或搬移既有 generated workspace 目錄。
- 不修改 MLX streaming 或 XML tool protocol 行為。

## Functional Spec

- Input:
  - Renderer 可透過 `window.api.selectProjectFolder()` 要求使用者選擇 folder。
  - `ChatRequest` 可帶入 optional `workspacePath`。
  - Workspace IPC 可在需要時帶入 optional `workspacePath`。
- Output:
  - Folder picker 回傳選到的 absolute path；取消時回傳 `null`。
  - Main process 在收到含 `workspacePath` 的 conversation request 或 workspace IPC 時，將該 conversation id 對應到該 folder。
  - 未提供 `workspacePath` 的 conversation 繼續使用既有 `userData/workspaces/<conversationId>` fallback。
- State Transitions:
  - `conversationId -> workspacePath` mapping 可在 main process runtime 中註冊或更新。
  - Mapping 不要求跨 app 重啟保存；renderer 持久化資料後會在下一次 request 重新提供 path。
- Rules:
  - `workspacePath` 必須是 absolute path，且 workspace filesystem operations 仍需通過 workspace boundary guard。
  - Shared IPC shape 必須由 `src/shared/types.ts` 定義，preload 只暴露 typed bridge。

## Constraints

- Renderer 不直接使用 Node/Electron APIs。
- Workspace fallback 必須維持相容舊 conversations。
- `assertInWorkspace` 或等效 path traversal guard 必須仍套用在所有 workspace file operations。
- Folder selection 必須由 Electron main process 執行。

## Acceptance Criteria

1. Given renderer calls `selectProjectFolder`
   When the user selects a folder
   Then preload returns the selected folder path as a string.
2. Given renderer calls `selectProjectFolder`
   When the user cancels selection
   Then preload returns `null`.
3. Given a `ChatRequest` includes `workspacePath`
   When main handles the chat
   Then workspace operations for that conversation resolve under `workspacePath`.
4. Given a `ChatRequest` does not include `workspacePath`
   When main handles the chat
   Then workspace operations use the existing per-conversation fallback directory.
5. Given a workspace-relative path attempts to escape the resolved root
   When workspace code resolves the path
   Then the operation is rejected by the workspace guard.

# Harness Plan

## 建議建立的護欄清單

| AC 編號 | 護欄形式 | 工具 | 預期輸出 |
|---|---|---|---|
| AC-1 | Type/API contract check | TypeScript | `selectProjectFolder` exists on `window.api` with `Promise<string \| null>` shape |
| AC-2 | Type/API contract check | TypeScript | cancellation return type permits `null` without renderer casts |
| AC-3 | Unit-level assertion | TypeScript typecheck + workspace helper usage | `ChatRequest.workspacePath` can be passed into main and registered before workspace resolution |
| AC-4 | Regression guard | `npm run typecheck:node` | existing workspace calls without path still compile |
| AC-5 | Existing invariant guard | `npm run typecheck:node` plus code review | `assertInWorkspace` remains the resolver for relative workspace paths |

## Domain Invariants

- A conversation with no registered Project path resolves to `userData/workspaces/<sanitized conversation id>`.
- A registered Project path replaces only the workspace root for that conversation; relative file operations still cannot escape the root.
- Folder picker cancellation must not create or mutate Project state.

## Contract Tests

- Shared contract boundary: `ProjectRecord`, `ChatRequest.workspacePath`, and workspace IPC optional path arguments must compile across `src/shared/types.ts`, `src/preload/index.ts`, and main IPC handlers.

## 快速執行命令

- `npm run typecheck`
