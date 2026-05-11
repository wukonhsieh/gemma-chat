# Task Spec

## Goal

- Renderer 具備 Project-aware 狀態與 sidebar UI：可新增、選擇、刪除 Project；conversation records 歸屬 Project；重啟後可恢復 Project、chat records 與最後選擇的 Project。

## Non-Goals

- 不新增手動 Project rename。
- 不刪除磁碟上的 Project folder。
- 不改變 main process workspace implementation beyond already-defined contracts。
- 不新增多視窗或多 stream 並行支援。

## Functional Spec

- Input:
  - 使用者點擊新增 Project，透過 folder picker 選擇 folder。
  - 使用者點擊 Project entry 切換目前 Project。
  - 使用者點擊 Project delete 移除 Project record。
- Output:
  - Sidebar 顯示 Projects，名稱使用 folder basename，hover title 顯示 full path。
  - Sidebar 顯示目前 Project 底下的 chat records。
  - New chat 會建立在目前 Project；沒有 Project 時使用 fallback conversation。
  - Project / conversation / last selected Project 持久化在 localStorage。
- State Transitions:
  - 新增 Project: 建立或重用同 path Project，設為 active/last selected。
  - 切換 Project: 更新 active/last selected，active conversation 切到該 Project 最新 chat；若沒有 chat 則建立空白 chat。
  - 刪除 Project: 移除 Project record 與其 conversations，若仍有 Projects 則選最新 Project，否則 fallback 到預設 conversation。
  - 送出或 regenerate 訊息: 更新 conversation updated time 與 Project last activity time。
- Rules:
  - Project 排序依 `lastActivityAt` descending。
  - 舊版 conversations 必須可被 migration 為 fallback conversations。
  - Folder basename 為空時可用完整 path 作為顯示 fallback。

## Constraints

- Renderer 仍只使用 `window.api`，不直接碰 Node/Electron。
- UI 必須維持現有 dark macOS-like sidebar style。
- 刪除 Project 不得呼叫任何 filesystem delete API。
- localStorage parse 失敗時要 fallback 到安全的初始狀態。

## Acceptance Criteria

1. Given no stored Projects
   When the app loads
   Then at least one fallback conversation exists and New chat remains usable.
2. Given the user selects a folder as Project
   When the folder picker returns a path
   Then the Project appears by folder basename, becomes active, and stores the full path.
3. Given a Project entry is visible
   When the user hovers it
   Then the browser tooltip exposes the full folder path.
4. Given multiple Projects have different last activity times
   When Sidebar renders
   Then the newest active Project appears first.
5. Given an active Project
   When the user creates a New chat
   Then the new conversation stores that Project id and path.
6. Given the user deletes a Project
   When the deletion is confirmed
   Then the Project and its conversations are removed from local records, and no filesystem delete is called.
7. Given stored v2 conversations without Project metadata
   When loading the app after upgrade
   Then those conversations remain visible in fallback mode.

# Harness Plan

## 建議建立的護欄清單

| AC 編號 | 護欄形式 | 工具 | 預期輸出 |
|---|---|---|---|
| AC-1 | Typecheck + manual UI flow | TypeScript / manual | fallback conversation path compiles and can render |
| AC-2 | Typecheck + manual UI flow | TypeScript / manual | `selectProjectFolder` result creates Project state |
| AC-3 | DOM attribute check by review | Code review | Project button includes `title={project.path}` |
| AC-4 | Pure data sorting review + typecheck | TypeScript | Project list sorted by `lastActivityAt` descending |
| AC-5 | Typecheck + code review | TypeScript | `newConversation` receives active Project metadata |
| AC-6 | Code review + typecheck | TypeScript | Project deletion mutates local state only and does not call workspace delete |
| AC-7 | Migration code review + typecheck | TypeScript | v2 array payload remains accepted |

## Domain Invariants

- Every Project conversation must carry both `projectId` and `projectPath`.
- Fallback conversations have no `projectId` and use legacy workspace fallback.
- `lastSelectedProjectId` must either point to an existing Project or be `null`.

## Contract Tests

- Renderer storage contract: `gemma-chat:state:v3` stores `{ conversations, projects, activeProjectId }`; legacy `gemma-chat:conversations:v2` arrays remain readable.

## 快速執行命令

- `npm run typecheck:web`
