# Task Spec

## Goal

- 有 Project path 的 conversation 在 Chat/Build Mode、Canvas workspace view、preview server、file tools 和 open-folder 行為中都使用該 Project folder 作為 workspace root；沒有 Project path 時維持既有 fallback。

## Non-Goals

- 不新增 Project UI 行為。
- 不修改 workspace sandbox 的 delete semantics。
- 不改變 preview server URL 結構。
- 不實作跨 app restart 的 main-process workspace mapping persistence。

## Functional Spec

- Input:
  - Conversation record 上的 optional `projectPath`。
  - Renderer `sendChat`、Canvas file listing、open workspace folder 等 workspace IPC。
- Output:
  - Main process 在每次 chat request 或 workspace IPC 前註冊 `conversationId -> projectPath`。
  - `ensureWorkspace`、`listTree`、preview server root lookup、`wsWriteFile`、tool file operations、`wsRunBash` 都透過已註冊 root 使用 Project folder。
  - 未帶 `projectPath` 的 fallback conversation 繼續使用 app-owned default workspace。
- State Transitions:
  - 開啟 Canvas 或送出 chat 會刷新 main process runtime mapping。
  - 切換 conversation 時 Canvas 會用新 conversation 的 Project path 重新列檔與開資料夾。
- Rules:
  - Preview route 仍使用 conversation id；root resolution 由 runtime mapping 決定。
  - Project path 只作為 workspace root；workspace-relative paths 仍不得 escape root。

## Constraints

- 不直接從 renderer 使用 filesystem API。
- `Canvas` 仍只透過 `window.api` 操作 workspace。
- Main process workspace fallback 必須保持向後相容。
- Build Mode live write 與 XML tools 不改 protocol。

## Acceptance Criteria

1. Given a conversation has `projectPath`
   When the user sends a chat request
   Then the request includes `workspacePath` and main registers it before resolving workspace.
2. Given a conversation has `projectPath`
   When Canvas lists files
   Then `listWorkspace` receives that path and lists files from the Project folder.
3. Given a conversation has `projectPath`
   When the user clicks Open workspace folder
   Then the opened path is the Project folder.
4. Given a conversation has no `projectPath`
   When chat or Canvas workspace operations run
   Then they use the existing fallback workspace.
5. Given Build Mode writes a file through XML tools
   When the conversation has a registered Project folder
   Then the file is written under that folder and still cannot escape via relative paths.

# Harness Plan

## 建議建立的護欄清單

| AC 編號 | 護欄形式 | 工具 | 預期輸出 |
|---|---|---|---|
| AC-1 | Typecheck + request construction review | TypeScript | `ChatRequest.workspacePath` is populated from active conversation |
| AC-2 | Typecheck + IPC call review | TypeScript | `Canvas` passes `workspacePath` to `listWorkspace` |
| AC-3 | Typecheck + IPC call review | TypeScript | `Canvas` passes `workspacePath` to `openWorkspace` |
| AC-4 | Regression typecheck | `npm run typecheck` | optional path keeps fallback calls valid |
| AC-5 | Existing workspace guard review | Code review + typecheck | file writes still route through `assertInWorkspace` |

## Domain Invariants

- Canvas and chat send must use the active conversation's `projectPath`, not only the active Project selection.
- A Project deletion removes records only; any already-open Project folder path is not deleted by workspace routing.
- Preview URL remains conversation-id based, while filesystem root can be Project based.

## Contract Tests

- Renderer-to-main contract: `workspacePath` must compile through `ChatRequest`, preload `listWorkspace/openWorkspace`, and main IPC handler request objects.

## 快速執行命令

- `npm run typecheck`
