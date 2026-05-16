# Todo List

- [x] Task 1 - 擴充 shared types 與 IPC channel 合約
- [x] Task 2 - Main process IPC handlers + Preload bridge 擴充
- [ ] Task 3 - App-level navigation：settings phase + gear icon
- [ ] Task 4 - Settings 頁面：Sidebar layout + General 分頁
- [ ] Task 5 - Settings 頁面：Permissions 分頁（Tool 清單 + 即時寫入）

# Change Logs

## Task 2 - Main process IPC handlers + Preload bridge 擴充

### Summary
新增 `saveToolPermission()` 至 `permissions.ts`（partial update gabie.json）。在 `index.ts` 新增 4 個 Settings IPC handlers（`settings:get-tool-list`、`settings:get-workspace-root`、`settings:get-permissions`、`settings:set-permission`）。在 `preload/index.ts` 新增對應的 4 個 `window.api` 方法。`vitest.config.ts` include 範圍擴充至 `test/**`，新增 Vitest 單元測試 4 筆。`npm run typecheck` + `vitest run` 全數通過。

### Changed Files
- src/main/permissions.ts
- src/main/index.ts
- src/preload/index.ts
- vitest.config.ts
- test/settings/save-tool-permission.test.ts

### Notes
- AC-1 / AC-2 / AC-3 的完整 IPC runtime 行為需 `npm run dev` 手動以 DevTools 觸發確認
- `loadToolPermissionPolicy()` 回傳型別為 `ToolPermissionPolicy`（`Partial<Record<string, ToolPermissionMode>>`），handler 以 `as Promise<Record<string, ToolPermissionValue>>` cast；Task 5 UI 端需處理可能的 undefined（已由 default policy merge 保護）

## Task 1 - 擴充 shared types 與 IPC channel 合約

### Summary
在 `src/shared/types.ts` 新增 `ToolInfo`、`ToolPermissionValue`（`ToolPermissionMode` 的 type alias）、`SETTINGS_CHANNELS` as const object（四個 IPC channel 名稱）。在 `src/renderer/src/App.tsx` 的 `AppState` union 加入 `{ phase: 'settings'; model: string }`。`npm run typecheck` 全部通過。

### Changed Files
- src/shared/types.ts
- src/renderer/src/App.tsx

### Notes
- `ToolPermissionValue` 直接 alias `ToolPermissionMode`，避免重複定義相同 union
- `settings` phase 帶 `model` 欄位，方便返回 `ready` 時保留 model 狀態
