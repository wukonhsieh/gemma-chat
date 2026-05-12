# Todo List

- [x] Task 1 - Define tool permission contracts and policy model
- [ ] Task 2 - Add workspace path classification and forced ask checks
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
