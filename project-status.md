# Todo List

- [x] Task 1 - Define tool permission contracts and policy model
- [x] Task 2 - Add workspace path classification and forced ask checks
- [ ] Task 3 - Gate tool execution in the main process
- [ ] Task 4 - Render permission requests and user controls
- [ ] Task 5 - Final verification and Cortex/status updates

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
