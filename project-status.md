# Todo List

- [x] Task 1 - Define Project persistence and workspace contracts
- [x] Task 2 - Add Project-aware renderer state and sidebar UI
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

## Task 2 - Add Project-aware renderer state and sidebar UI

### Summary

升級 renderer localStorage schema 為 Project-aware state，加入 Project list、last selected Project、Project-scoped conversations、legacy v2 conversation migration，以及 Sidebar 的 Project add/select/delete UI。Project 顯示 folder name，hover title 保留 full path；刪除 Project 只移除 app 記錄與其 chats。

### Changed Files

- project-status.md
- task-spec-task-2.md
- src/renderer/src/components/Chat.tsx
- src/renderer/src/components/Sidebar.tsx

### Notes

已通過 `npm run typecheck:web` 與 `npm run typecheck:node`。Project folder 尚未接到 Canvas workspace IPC，會在 Task 3 完成。
