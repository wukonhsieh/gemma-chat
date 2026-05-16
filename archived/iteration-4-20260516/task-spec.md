# Task Spec — Task 4: Settings 頁面：Sidebar layout + General 分頁

## Goal

- 建立 `src/renderer/src/components/Settings.tsx`，實作 Settings 頁面的 Sidebar layout（左側選單 + 右側內容區）、返回按鈕、General 分頁內容
- 在 `App.tsx` 將 `SettingsPlaceholder` 替換為真正的 `Settings` component，`onBack` prop 已就位
- General 分頁透過 `window.api.settingsGetWorkspaceRoot()` 取得路徑並顯示（唯讀）

完成後，使用者可以在設定頁看到真正的 Sidebar layout 與可用的 General 分頁；Permissions 分頁留給 Task 5 實作。

## Non-Goals

- 不實作 Permissions 分頁的任何內容（屬 Task 5）；Permissions 選單項存在但點擊後顯示佔位符即可
- 不修改 `App.tsx` 的 phase 切換邏輯（Task 3 已完成，`onBack` 已傳入）
- 不實作任何表單輸入或可編輯欄位（General 分頁全部唯讀）
- 不對 workspace root 路徑做任何格式轉換或截斷

## Functional Spec

### Settings component 整體結構

- **Props：** `onBack: () => void`
- **Layout：** 左右分欄；左側固定寬度 Sidebar（選單），右側 flex-1 顯示當前分頁內容
- **Active 分頁 state：** local state，預設為 `'general'`；切換選單項時更新

### 左側 Sidebar 選單

- 頂部顯示返回按鈕（`←` icon 或文字），點擊呼叫 `onBack()`
- 選單項：`General`（對應 `'general'`）、`Permissions`（對應 `'permissions'`）
- Active 選單項有高亮樣式（沿用既有 dark macOS-like 風格）

### General 分頁

- 掛載時（`useEffect`）呼叫 `window.api.settingsGetWorkspaceRoot()`
- 取得結果後，以 monospace 字體唯讀顯示完整路徑字串
- Loading 狀態：取得前顯示 `…` 或 skeleton-like 佔位符
- Error 狀態：取得失敗時顯示 `Unable to load path` fallback 文字

### Permissions 分頁（Task 5 佔位符）

- 選擇 Permissions 時，右側顯示簡單佔位文字（如 `Coming soon` 或空白），不需要任何實際內容

## Constraints

- 新建 `src/renderer/src/components/Settings.tsx`；`App.tsx` 只需替換 `SettingsPlaceholder` 為 `<Settings onBack={...} />`
- 不引入新的外部 dependency（icon 使用 inline SVG 或文字）
- 樣式沿用既有 dark macOS-like Tailwind 風格，與 Sidebar.tsx / Chat.tsx 視覺一致
- `window.api.settingsGetWorkspaceRoot()` 由 Task 2 已提供，直接呼叫
- 不在 Settings component 內持有任何 global state；所有 state 為 local `useState`

## Acceptance Criteria

1. Given app 切換至 `settings` phase  
   When Settings component 渲染  
   Then 畫面顯示左側 Sidebar 選單（含 General、Permissions 兩項）與右側內容區；預設顯示 General 分頁

2. Given Settings 頁面顯示中  
   When 點擊左側返回按鈕  
   Then `onBack()` 被呼叫，畫面切換回 Chat（ready phase）

3. Given General 分頁為 active  
   When `settingsGetWorkspaceRoot()` IPC 呼叫成功  
   Then 右側顯示 workspace root 的完整路徑字串，以 monospace 樣式呈現

4. Given General 分頁  
   When IPC 呼叫進行中（尚未回傳）  
   Then 右側顯示 loading 狀態（`…` 或等效佔位符），不顯示空白或錯誤

5. Given 點擊左側 Permissions 選單項  
   When 切換完成  
   Then 右側顯示 Permissions 佔位內容（Task 5 會替換），Permissions 選單項高亮

6. Given 所有變更完成  
   When 執行 `npm run typecheck && npm run build`  
   Then 全部通過，無新增型別錯誤
