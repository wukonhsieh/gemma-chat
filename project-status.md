# Todo List

- [x] Task 1 - Define Project persistence and workspace contracts
- [ ] Task 2 - Add Project-aware renderer state and sidebar UI
- [ ] Task 3 - Route Build Mode workspace operations through Project folders
- [ ] Task 4 - Final verification and Cortex/project status updates

# Change Logs

## Task 1 - Define Project persistence and workspace contracts

### Summary

新增 Project/workspace routing 的 shared contract、folder picker preload API，以及 main process conversation-to-workspace path registration。未提供 Project path 的 conversation 仍會 fallback 到既有 `userData/workspaces/<conversationId>`。

### Changed Files

- requirements-spec.md
- project-plan.md
- project-status.md
- task-spec-task-1.md
- src/shared/types.ts
- src/preload/index.ts
- src/main/index.ts
- src/main/workspace.ts

### Notes

已通過 `npm run typecheck:node` 與 `npm run typecheck:web`。完整 Project UI 與持久化會在後續 tasks 實作。
