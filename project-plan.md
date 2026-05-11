## 規劃摘要

- 目標: 在 Gemma Chat 加入 Project 層，讓聊天與 Build Mode workspace 可以綁定到使用者指定 folder，並保存 Project / conversation 記錄。
- 假設: Project name 使用 folder basename；刪除 Project 會刪除 app 內 Project 與其 chat records，但不刪除磁碟資料夾；沒有 Project 時沿用既有 per-conversation workspace fallback。
- 風險: 這會跨越 renderer localStorage schema、preload/main IPC、workspace sandbox root resolution 與 Build Mode preview/tool flow，需要保留既有 path traversal guard 與舊資料相容性。

## 任務清單

### Task 1 - Define Project persistence and workspace contracts

- 為什麼現在做: Project 會影響 conversation schema、IPC payload 與 workspace root resolution，先定義 contract 才能讓後續 UI 與 main process 對齊。
- 目標: 建立 Project-aware shared types、chat request workspace metadata，以及 main/preload 可用的 folder selection / workspace registration contract。
- 背景 / 依賴: 依賴現有 `ChatRequest`、`WorkspaceInfo`、preload `window.api` 與 `workspace.ts` per-conversation fallback。
- 粗略作法: 擴充 shared types，新增 Project shape 與 optional `workspacePath`；main process 提供 folder picker IPC，workspace 模組提供 conversation-to-root mapping 並保留 fallback。
- 驗證方式: `npm run typecheck:node`、`npm run typecheck:web`，並檢查未帶 Project path 的舊 request 仍可 typecheck。
- 風險 / 備註: Workspace root 改動屬 protected area，必須保留 `assertInWorkspace`。

### Task 2 - Add Project-aware renderer state and sidebar UI

- 為什麼現在做: Contract 建好後，需要讓使用者能新增、選擇、刪除 Project，並讓 conversation records 歸屬 Project。
- 目標: Renderer 持久化 Project list、last selected Project、Project-aware conversations，並在 sidebar 提供 Project selector / create / delete。
- 背景 / 依賴: 依賴 Task 1 的 preload folder picker 與 `workspacePath` request contract。
- 粗略作法: 升級 `Chat.tsx` localStorage schema，加入 Project records；`Sidebar.tsx` 顯示依 last activity 排序的 Project list，Project hover 使用 full path tooltip；New chat 使用 active/last Project。
- 驗證方式: `npm run typecheck:web`，手動檢查 add project、delete project、new chat project assignment、reload persistence。
- 風險 / 備註: 要保留舊 conversations migration，避免既有聊天消失。

### Task 3 - Route Build Mode workspace operations through Project folders

- 為什麼現在做: UI 記錄 Project 後，Build Mode 的寫檔、preview、files tab、open folder 與 bash 才需要真正使用 Project folder。
- 目標: `sendChat`、workspace info/list/open、preview server、live write 與 tools 對有 Project path 的 conversation 使用指定 folder；沒有 Project path 時 fallback 到既有預設目錄。
- 背景 / 依賴: 依賴 Task 1 contract 與 Task 2 conversation metadata。
- 粗略作法: 在 `handleChat` 收到 request 時註冊 conversation workspace path；renderer workspace IPC 呼叫帶入 workspace path；main workspace handlers 先註冊再解析 root。
- 驗證方式: `npm run typecheck:node`、`npm run typecheck:web`，手動檢查 Canvas preview/file list/open workspace 指向 Project folder。
- 風險 / 備註: Preview server URL 仍以 conversation id routing，但 server 解析 root 時要使用 runtime mapping。

### Task 4 - Final verification and Cortex/project status updates

- 為什麼現在做: Project feature 跨多層，需要最後整體驗證與 durable 記錄。
- 目標: 跑完整 typecheck/build，更新 project status 與必要 Cortex wiki，並提交完成變更。
- 背景 / 依賴: 依賴前三個 implementation tasks。
- 粗略作法: 執行 `npm run typecheck` 與 `npm run build`；若新增可重用架構理解，更新 Cortex wiki；記錄每個 task 的完成狀態。
- 驗證方式: `npm run typecheck`、`npm run build`。
- 風險 / 備註: 若 build 受環境影響失敗，需要明確記錄原因與已通過的 narrower checks。
