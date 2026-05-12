# Todo List

- [x] Task 1 - Define tool permission contracts and policy model
- [x] Task 2 - Add workspace path classification and forced ask checks
- [x] Task 3 - Gate tool execution in the main process
- [x] Task 4 - Render permission requests and user controls
- [x] Task 5 - Final verification and Cortex/status updates

# Change Logs

## Task 1 - Define tool permission contracts and policy model

### Summary

新增 tool permission 的 shared contract，涵蓋 `deny`、`ask`、`allow` policy mode、permission request/response payload、`ToolCall` permission state，以及 main process default tool permission policy helper。現有 tool execution 尚未改變，後續 tasks 會接上 workspace forced ask 與 runtime gating。

### Changed Files

- requirements-spec.md
- project-plan.md
- project-status.md
- task-spec-task-1.md
- harness-plan-task-1.md
- src/shared/types.ts
- src/main/permissions.ts

### Notes

已通過 `npm run typecheck:node` 與 `npm run typecheck:web`。`tool_permission` stream chunk 已定義但尚未由 main process emit，也尚未由 renderer 顯示。

## Task 2 - Add workspace path classification and forced ask checks

### Summary

在 workspace boundary 層新增 path classification helper，可判斷 requested path 是否落在 resolved workspace root 內，並對空 path、`..` traversal 與 workspace 外 absolute path 標記 `requiresAsk`。`assertInWorkspace` 仍保留為實際 workspace operation 的最後防線。

### Changed Files

- project-status.md
- task-spec-task-2.md
- harness-plan-task-2.md
- src/main/workspace.ts

### Notes

已通過 `npm run typecheck:node`。Task 3 會把 classification 接進 tool execution permission gate，讓 workspace 外存取真正暫停並等待使用者決策。

## Task 3 - Gate tool execution in the main process

### Summary

在 main process tool loop 加入 permission gate：`deny` 會直接回傳 denied result 且不執行 tool，`ask` 會 emit `tool_permission` chunk 並等待 `tool-permission:respond` IPC 回覆，`allow` 才正常執行 tool。workspace 外 file tools 會強制 ask，approval 只套用於該次 tool call；Build Mode live-write 也會在 permission 非 `allow` 時跳過 partial write。

### Changed Files

- project-status.md
- task-spec-task-3.md
- harness-plan-task-3.md
- src/main/index.ts
- src/main/tools.ts
- src/main/workspace.ts
- src/preload/index.ts

### Notes

已通過 `npm run typecheck:node` 與 `npm run typecheck:web`。Renderer 尚未顯示 permission request；Task 4 會接上 UI controls。

## Task 4 - Render permission requests and user controls

### Summary

Renderer 現在會處理 `tool_permission` stream chunk，將 pending permission state 寫入 matching `ToolCall`，並在 tool card 上顯示 permission reason、status badge、Approve / Deny controls。使用者回覆會透過 `window.api.respondToToolPermission` 傳回 main process。

### Changed Files

- project-status.md
- task-spec-task-4.md
- harness-plan-task-4.md
- src/renderer/src/components/Chat.tsx
- src/renderer/src/components/Message.tsx

### Notes

已通過 `npm run typecheck:web`。Task 5 會跑完整 `npm run typecheck` 與 `npm run build`，並補必要 Cortex 記錄。

## Task 5 - Final verification and Cortex/status updates

### Summary

完成最終驗收，`npm run typecheck` 與 `npm run build` 皆通過。新增 Task 5 spec/harness，並在 Cortex nested repo 補充 Tool Permissions concept 與 workflow log，記錄 permission gate、workspace 外 forced ask、renderer approval flow 與後續修改 guidance。

### Changed Files

- project-status.md
- task-spec-task-5.md
- harness-plan-task-5.md
- cortex/wiki/concepts/tool-permissions.md
- cortex/wiki/index.md
- cortex/wiki/logs/2026-05-12-tool-permissions.md

### Notes

Cortex lint 已通過。Source project 與 nested Cortex repo 需分開 commit；未追蹤的 agent bootstrap files 不屬於本 iteration commits。
