# Todo List

- [x] Task 1 - Search state + Ctrl+F 快捷鍵 + Search bar UI
- [ ] Task 2 - Match 計算 + 全訊息 passive 高亮
- [ ] Task 3 - Active match 追蹤 + prev/next 導航 + scrollIntoView

# Change Logs

## Task 1 - Search state + Ctrl+F 快捷鍵 + Search bar UI

### Summary
`Chat.tsx` 新增 `searchOpen`、`searchQuery` state 與 `searchOpenRef`（避免 keyboard listener stale closure）。`closeSearch` useCallback 統一處理關閉並清空 query。keyboard `useEffect` 監聽 `window` keydown：`Ctrl+F` / `Cmd+F` 開啟或關閉搜尋列，`Esc` 呼叫 `closeSearch`。主 column div 加入 `relative`，`{searchOpen && <SearchBar .../>}` 渲染搜尋列於訊息區右上角（`absolute top-11 right-4 z-50`）。`SearchBar` 包含 input（autoFocus）、`—` 計數佔位符、disabled prev/next 按鈕、× 關閉按鈕。`npm run typecheck && npm run build` 通過。

### Changed Files
- src/renderer/src/components/Chat.tsx

### Notes
- `activeMatchIndex` 延至 Task 3 才宣告（Task 1 / Task 2 尚未使用，宣告會觸發 TS `declared but never read` 錯誤）
- Task 2 在實作計數顯示時以 hardcoded `0` 作為 active index 起點，Task 3 再替換為真實 state
