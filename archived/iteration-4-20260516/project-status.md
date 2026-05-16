# Todo List

- [x] Task 1 - 擴充 shared types 與 IPC channel 合約
- [x] Task 2 - Main process IPC handlers + Preload bridge 擴充
- [x] Task 3 - App-level navigation：settings phase + gear icon
- [x] Task 4 - Settings 頁面：Sidebar layout + General 分頁
- [x] Task 5 - Settings 頁面：Permissions 分頁（Tool 清單 + 即時寫入）

# Change Logs

## Task 5 - Settings 頁面：Permissions 分頁（Tool 清單 + 即時寫入）

### Summary
在 `Settings.tsx` 新增 `PermissionsTab` component。掛載時並行呼叫 `settingsGetToolList()` + `settingsGetPermissions()`，渲染全部 tools（name + description + Allow/Ask/Deny `<select>`）。`onChange` 觸發 optimistic 更新 local state，再呼叫 `settingsSetPermission`；IPC 失敗時 rollback 至舊值。Loading / error fallback 均已實作。`npm run typecheck && npm run build` 全通過。

### Changed Files
- src/renderer/src/components/Settings.tsx

### Notes
- AC-1 ~ AC-6 的 runtime 行為需 `npm run dev` 手動確認（Vitest node 環境無法測試 renderer component）
- 本次 iteration 全部 5 個 tasks 均已完成

## Task 4 - Settings 頁面：Sidebar layout + General 分頁

### Summary
新建 `src/renderer/src/components/Settings.tsx`，實作 Sidebar layout（左側 General / Permissions 選單 + 返回按鈕，右側內容區）。General 分頁透過 `settingsGetWorkspaceRoot()` 取得路徑並以 monospace 唯讀顯示，含 loading（`…`）與 error（`Unable to load path`）狀態。Permissions 分頁留佔位符。`App.tsx` 將 `SettingsPlaceholder` 替換為正式 `<Settings onBack={...} />`。`npm run typecheck && npm run build` 全通過。

### Changed Files
- src/renderer/src/components/Settings.tsx
- src/renderer/src/App.tsx

### Notes
- `SettingsPlaceholder` 函式已從 `App.tsx` 移除（Task 5 接手實作 Permissions 分頁）

## Task 3 - App-level navigation：settings phase + gear icon

### Summary
`App.tsx` 新增 `handleOpenSettings()`（ready → settings）、`handleCloseSettings()`（settings → ready）、`settings` phase render 分支（`SettingsPlaceholder`）。`Chat.tsx` 新增 `onOpenSettings` optional prop 並傳入 `Sidebar`。`Sidebar.tsx` 新增 `onOpenSettings` prop 及 gear icon button 於底部「Running locally」區塊右側。`npm run typecheck && npm run build` 全通過。

### Changed Files
- src/renderer/src/App.tsx
- src/renderer/src/components/Chat.tsx
- src/renderer/src/components/Sidebar.tsx

### Notes
- `SettingsPlaceholder` 為暫時佔位符，Task 4 直接替換成正式 Settings component，App.tsx 不需再動
- `switching` phase 的 `<Chat>` render 不傳 `onOpenSettings`，符合 spec non-goal（切換期間不觸發 settings）

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
