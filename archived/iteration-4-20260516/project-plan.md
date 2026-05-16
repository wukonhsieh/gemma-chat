# Project Plan — Settings Page

## 規劃摘要

- **目標:** 為 Gabie 加入設定頁，包含 General（Workspace Root 唯讀顯示）與 Permissions（Tools 權限即時寫入）兩個分頁，透過主畫面左下角 gear icon 整頁切換進入
- **假設:**
  - Permissions 設定檔沿用 `~/.config/gabie/gabie.json`，讀寫邏輯沿用 `src/main/permissions.ts`
  - Navigation 沿用 `App.tsx` phase 機制，新增 `settings` phase
  - Tool 清單從 `TOOLS` registry 透過 IPC 傳給 renderer
  - Workspace Root 從 `workspacesRoot()` 透過 IPC 傳給 renderer
- **風險:**
  - `App.tsx` 的 phase 機制目前處理 boot/setup/ready/switching，加入 `settings` 需確認 abort/model-switch 等非同步狀態不受影響
  - Permissions 寫入需確認與 `evaluateToolPermission` runtime 判斷的一致性（寫後新值即時反映）

---

## 任務清單

### Task 1 - 擴充 shared types 與 IPC channel 合約

- **為什麼現在做:** Renderer / Preload / Main 三層共用的型別與 IPC channel 名稱必須先確立，後續所有 task 都依賴這份合約，避免各層各自假設格式
- **目標:** 在 `src/shared/types.ts` 新增 `ToolInfo`、`ToolPermissionValue` 型別，以及 Settings 相關 IPC channel 常數或型別；在 App phase 型別中加入 `'settings'`
- **背景 / 依賴:** `src/shared/types.ts` 是跨 process 合約來源；`src/renderer/src/App.tsx` 目前 phase 型別需要擴充
- **粗略作法:**
  - 新增 `ToolInfo { name: string; description: string }` 型別
  - 新增 `ToolPermissionValue = 'allow' | 'ask' | 'deny'` 型別
  - 新增 Settings IPC channels（可以是 string literal union 或 const）：`settings:get-tool-list`、`settings:get-permissions`、`settings:set-permission`、`settings:get-workspace-root`
  - 在 App phase 型別中加入 `'settings'`
- **驗證方式:** `npm run typecheck` 通過；可在 shared types 檔案中看到新型別與 channel 定義
- **風險 / 備註:** 修改 phase 型別時確認 `App.tsx` 的 switch/conditional 不因新增 case 而出現 type error

---

### Task 2 - Main process IPC handlers + Preload bridge 擴充

- **為什麼現在做:** Renderer 需要透過 `window.api` 取得 tool 清單、讀寫 permissions、取得 workspace root；這些 handler 必須在 Settings UI 開發前就位，renderer 才能實際呼叫
- **目標:** 在 `src/main/index.ts` 新增 4 個 IPC handler；在 `src/preload/index.ts` 對應新增 4 個 `window.api` 方法
- **背景 / 依賴:** 依賴 Task 1 確立的型別與 channel 名稱；讀寫 permissions 沿用 `src/main/permissions.ts` 的 `loadToolPermissionPolicy` / `saveToolPermission`（若 save 尚未存在則需新增）；tool 清單從 `TOOLS` registry 取出 `name` + `description`；workspace root 由 `workspacesRoot()` 提供
- **粗略作法:**
  - `settings:get-tool-list` → 回傳 `ToolInfo[]`（從 `TOOLS` registry 取）
  - `settings:get-workspace-root` → 回傳 `workspacesRoot()` 字串
  - `settings:get-permissions` → 讀取 `~/.config/gabie/gabie.json`，回傳 `Record<string, ToolPermissionValue>`
  - `settings:set-permission` → 接收 `{ tool: string; value: ToolPermissionValue }`，更新 `gabie.json` 對應欄位後寫回
  - Preload 對應新增 4 個 invoke wrapper，回傳型別與 shared types 對齊
- **驗證方式:** `npm run typecheck` 通過；可在主 process console 或 DevTools Network/IPC tab 確認 handler 被觸發並回傳正確資料（或寫一個簡單的 invoke test）
- **風險 / 備註:** `permissions.ts` 若無 save function 需新增；寫入 `gabie.json` 要保留既有欄位（partial update，不整檔覆蓋）

---

### Task 3 - App-level navigation：settings phase + gear icon

- **為什麼現在做:** 設定頁需要一個明確的進入點（gear icon）與整頁切換機制；這個 navigation layer 必須在 Settings component 開發前就位，才能掛載與測試設定頁
- **目標:** 在 `App.tsx` 加入 `settings` phase 的 render 分支；在主畫面（Chat phase）左下角加入 gear icon，點擊後切換到 `settings` phase；Settings component 暫時顯示佔位符
- **背景 / 依賴:** 依賴 Task 1 的 phase 型別擴充；`App.tsx` 目前管理 `boot` / `setup` / `ready` / `switching` 等 phase；gear icon 位置在既有 Chat UI 左下角（可能在 `Chat.tsx` 或 `App.tsx` 加入，依實際 layout 決定）
- **粗略作法:**
  - `App.tsx` phase state 加入 `'settings'`，render 時加入對應分支（先 render 佔位 `<div>Settings</div>`）
  - 在 ready phase 的主畫面左下角加入 gear icon（Tailwind styled，沿用既有 dark 風格）
  - Gear icon click → `setPhase('settings')`
  - 確認 abort / model-switch 等非同步操作在 phase 切換時不受影響（必要時在切換前 abort）
- **驗證方式:** `npm run dev` 啟動後，在主畫面左下角看到 gear icon；點擊後畫面整頁切換到佔位設定頁；`npm run typecheck` 通過
- **風險 / 備註:** 若 Chat 有進行中的 streaming，切換到 settings 時需確認 IPC listener 不 leak；`ready` phase 下 gear icon 位置需與現有 sidebar / composer layout 不衝突

---

### Task 4 - Settings 頁面：Sidebar layout + General 分頁

- **為什麼現在做:** 建立 Settings component 的結構骨架（Sidebar layout + 分頁切換），並實作較簡單的 General 分頁（IPC 取 workspace root，唯讀顯示），讓整體 UI 框架可視化驗證
- **目標:** 建立 `src/renderer/src/components/Settings.tsx`，實作 Sidebar layout（左側 General / Permissions 選單，右側內容區）、返回按鈕、General 分頁內容
- **背景 / 依賴:** 依賴 Task 2 的 `window.api.getWorkspaceRoot()`；依賴 Task 3 的 `setPhase` callback 傳入 Settings component 作為返回機制
- **粗略作法:**
  - 左側 Sidebar：General / Permissions 兩個選單項，active 樣式高亮
  - 頂部或左上角返回按鈕：呼叫 `onBack()` prop（對應 `setPhase('ready')`）
  - General 分頁：`useEffect` 呼叫 `window.api.getWorkspaceRoot()`，顯示路徑字串（monospace，唯讀樣式）
  - Permissions 分頁暫時顯示佔位符
  - 整體沿用 dark macOS-like Tailwind 風格
- **驗證方式:** `npm run dev` 進入設定頁，左側看到 General / Permissions 選單；General 分頁顯示正確的 workspace root 路徑；返回按鈕回到 Chat 頁；`npm run typecheck` 通過
- **風險 / 備註:** Sidebar layout 的寬度、字體、顏色需與既有 UI 風格一致；IPC 呼叫若失敗需 graceful fallback（顯示 error 或 fallback 字串）

---

### Task 5 - Settings 頁面：Permissions 分頁（Tool 清單 + 即時寫入）

- **為什麼現在做:** 這是本次 iteration 的核心功能，在 Sidebar 框架（Task 4）確立後實作 Permissions 分頁，完成完整的設定頁功能
- **目標:** 實作 Permissions 分頁：列出所有 tools（name + description），每個 tool 右側有 Allow / Ask / Deny 下拉選單，變更後立即呼叫 IPC 寫入 `gabie.json`
- **背景 / 依賴:** 依賴 Task 2 的 `window.api.getToolList()` 與 `window.api.getPermissions()` / `window.api.setPermission()`；依賴 Task 4 的 Settings Sidebar 框架
- **粗略作法:**
  - `useEffect` 並行呼叫 `getToolList()` 與 `getPermissions()`，合併成 `{ tool: ToolInfo; value: ToolPermissionValue }[]` 的 local state
  - 每個 tool row：左側顯示 name（粗體）與 description（較小字灰色），右側 `<select>` 綁定當前值
  - `onChange` 觸發 `window.api.setPermission({ tool, value })`，同時 optimistic 更新 local state
  - Loading / error state 處理（fetch 期間顯示 loading 指示）
  - 如果某個 tool 在 `gabie.json` 沒有設定，顯示 default 值（從 `DEFAULT_TOOL_PERMISSION_POLICY` 取得）
- **驗證方式:** `npm run dev` 進入 Permissions 分頁，看到所有 10 個 tools 列表；下拉選單顯示目前值；變更後重新進入頁面仍保持新值；`gabie.json` 內容對應更新；`npm run typecheck` + `npm run build` 通過
- **風險 / 備註:** 需確認 `DEFAULT_TOOL_PERMISSION_POLICY` 可從 main 傳回或 renderer 可取得；若 `gabie.json` 不存在，讀取時需 graceful fallback 到 default policy；Optimistic update 若 IPC 寫入失敗需 rollback 或提示
