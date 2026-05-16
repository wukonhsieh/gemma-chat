# Todo List

- [x] Task 1 - 擴充 shared types 與 IPC channel 合約
- [ ] Task 2 - Main process IPC handlers + Preload bridge 擴充
- [ ] Task 3 - App-level navigation：settings phase + gear icon
- [ ] Task 4 - Settings 頁面：Sidebar layout + General 分頁
- [ ] Task 5 - Settings 頁面：Permissions 分頁（Tool 清單 + 即時寫入）

# Change Logs

## Task 1 - 擴充 shared types 與 IPC channel 合約

### Summary
在 `src/shared/types.ts` 新增 `ToolInfo`、`ToolPermissionValue`（`ToolPermissionMode` 的 type alias）、`SETTINGS_CHANNELS` as const object（四個 IPC channel 名稱）。在 `src/renderer/src/App.tsx` 的 `AppState` union 加入 `{ phase: 'settings'; model: string }`。`npm run typecheck` 全部通過。

### Changed Files
- src/shared/types.ts
- src/renderer/src/App.tsx

### Notes
- `ToolPermissionValue` 直接 alias `ToolPermissionMode`，避免重複定義相同 union
- `settings` phase 帶 `model` 欄位，方便返回 `ready` 時保留 model 狀態
