# Requirements Spec

## Project Summary

### 簡述
為 Gabie 桌面應用程式加入設定頁（Settings Page），讓使用者能查看系統資訊並管理 tool 執行權限。

### 目標
- 提供一個從主畫面可直接進入的設定入口
- 在 General 分頁顯示 Workspace Root Folder 路徑（唯讀）
- 在 Permissions 分頁讓使用者管理每個 tool 的執行權限，異動即時寫入設定檔

### 假設
- Permissions 設定檔路徑沿用現有機制：`~/.config/gabie/gabie.json`
- Workspace Root Folder 路徑由 `workspacesRoot()` 提供，唯讀顯示不提供修改
- Tool 清單列出 registry 內所有已定義的 tools，不做隱藏或過濾

---

## User Requirements

- 使用者需要能在主畫面快速進入設定頁，不必透過選單或系統選單列
- 使用者需要能查看目前的 Workspace 根目錄路徑
- 使用者需要能對每個 tool 設定執行權限（Allow / Ask / Deny）
- 使用者需要能在更改 tool 權限後立即生效，不必額外按儲存
- 使用者需要能從設定頁返回主畫面（Chat 頁）

---

## Use Cases

### Use Case 1 — 進入設定頁
- **Actor:** 使用者
- **Trigger:** 點擊主畫面左下角的設定 icon
- **Outcome:** 畫面整頁切換到設定頁，預設顯示 General 分頁

### Use Case 2 — 查看 Workspace Root Folder
- **Actor:** 使用者
- **Trigger:** 進入設定頁 → General 分頁
- **Outcome:** 看到目前 Workspace Root Folder 的完整路徑（唯讀）

### Use Case 3 — 調整 Tool 執行權限
- **Actor:** 使用者
- **Trigger:** 進入設定頁 → Permissions 分頁，對某個 tool 的下拉選單進行變更
- **Outcome:** 選擇變更後立即寫入 `~/.config/gabie/gabie.json`，新權限即時生效

### Use Case 4 — 返回主畫面
- **Actor:** 使用者
- **Trigger:** 在設定頁點擊返回按鈕（或 back icon）
- **Outcome:** 畫面切換回 Chat 頁，對話狀態保持不變

---

## Functional Requirements

1. 主畫面左下角應顯示設定 icon（gear icon），點擊後觸發頁面切換至設定頁。
2. 設定頁採用 Sidebar Layout：左側為選單，右側為對應分頁內容。
3. 設定頁左側選單應包含兩個項目：**General** 與 **Permissions**。
4. 設定頁應提供返回按鈕，點擊後切換回 Chat 頁，對話內容與狀態不受影響。
5. **General 分頁**應顯示 Workspace Root Folder 路徑（唯讀，不可編輯）。
6. **Permissions 分頁**應列出 tool registry 內所有已定義的 tools。
7. 每個 tool 項目應顯示 tool name 與 description。
8. 每個 tool 項目右側應有下拉選單，選項為 **Allow**、**Ask**、**Deny**。
9. 下拉選單應於頁面載入時反映目前已儲存的權限值；若無設定，顯示 default 值。
10. 使用者變更下拉選單後，應立即將新值寫入 `~/.config/gabie/gabie.json`，不需要額外儲存步驟。
11. Permissions 設定寫入後應即時反映在後續的 tool 執行權限判斷中。

---

## Technical Specifications

- **Programming Language:** TypeScript
- **Framework:** React 19（Renderer）+ Electron（Main Process）
- **UI Library / Styling:** Tailwind CSS，沿用既有 dark macOS-like 視覺語言
- **State Management:** React local state（`useState`）；設定頁不需要跨 component 的全域 state store
- **IPC Pattern:** 沿用 `window.api` preload bridge；需新增讀取與寫入 permissions 的 IPC handler
- **Permissions Storage:** `~/.config/gabie/gabie.json`，沿用 `src/main/permissions.ts` 的現有讀寫邏輯
- **Workspace Root 來源:** `src/main/workspace.ts` 的 `workspacesRoot()`，透過 IPC 回傳給 renderer
- **Tool 清單來源:** `src/main/tools.ts` 的 `TOOLS` registry，透過 IPC 回傳 name + description 給 renderer
- **Navigation:** App-level phase state（仿現有 `App.tsx` phase 機制），加入 `settings` phase 做整頁切換
- **Assumptions / Notes:**
  - Permissions 頁的 tool 清單目前不做隱藏或 subset 過濾，直接列出 registry 所有 tools
  - 設定頁不做 i18n，UI 文字以英文為主（符合現有 app 語言風格）
