# Todo List

- [x] Task 1 - Search state + Ctrl+F 快捷鍵 + Search bar UI
- [x] Task 2 - Match 計算 + 全訊息 passive 高亮
- [x] Task 3 - Active match 追蹤 + prev/next 導航 + scrollIntoView

# Change Logs

## Task 1 - Search state + Ctrl+F 快捷鍵 + Search bar UI

### Summary
`Chat.tsx` 新增 `searchOpen`、`searchQuery` state 與 `searchOpenRef`（避免 keyboard listener stale closure）。`closeSearch` useCallback 統一處理關閉並清空 query。keyboard `useEffect` 監聽 `window` keydown：`Ctrl+F` / `Cmd+F` 開啟或關閉搜尋列，`Esc` 呼叫 `closeSearch`。主 column div 加入 `relative`，`{searchOpen && <SearchBar .../>}` 渲染搜尋列於訊息區右上角（`absolute top-11 right-4 z-50`）。`SearchBar` 包含 input（autoFocus）、`—` 計數佔位符、disabled prev/next 按鈕、× 關閉按鈕。`npm run typecheck && npm run build` 通過。

### Changed Files
- src/renderer/src/components/Chat.tsx

### Notes
- `activeMatchIndex` 延至 Task 3 才宣告（Task 1 / Task 2 尚未使用，宣告會觸發 TS `declared but never read` 錯誤）
- Task 2 在實作計數顯示時以 hardcoded `0` 作為 active index 起點，Task 3 再替換為真實 state

## Task 2 - Match 計算 + 全訊息 passive 高亮

### Summary
新增 `src/renderer/src/lib/highlight.ts`（純 TS，含 `escapeRegex`、`countMatches`、`highlightHtml`）。`Message.tsx` 加入 `searchQuery?` / `matchOffset?` props、export `parseThinking`、inline `highlightText` 函式；user messages 用 `highlightText` 包裝 span，assistant HTML 用 `highlightHtml` 注入 `<mark>` 標籤。`Chat.tsx` import `countMatches` + `parseThinking`，以 `useMemo` 計算 `matchOffsets[]` prefix sum 與 `totalMatches`，透過 `MessageList` 傳入每則 `<Message>`；`SearchBar` 加入 `totalMatches` prop，counter 依 query 空/有無匹配動態顯示。harness `test/search/highlight.test.ts` 7 tests 全 pass，typecheck + build 通過。

### Changed Files
- src/renderer/src/lib/highlight.ts（新增）
- test/search/highlight.test.ts（新增）
- src/renderer/src/components/Message.tsx
- src/renderer/src/components/Chat.tsx

### Notes
- `highlightText` 因回傳 JSX 無法放進 `.ts` 模組，保留在 `Message.tsx` inline
- `data-match-idx` 屬性與 `activeMatchIndex` state 延至 Task 3

## Task 3 - Active match 追蹤 + prev/next 導航 + scrollIntoView

### Summary
`highlightHtml` 升級為使用實際 `matchOffset` 並接受 `activeMatchIndex`，每個 `<mark>` 加上 `data-match-idx` 與 active/passive 內聯樣式（`rgba(250,204,21,0.8)` vs `0.3`）。`highlightText` 同理：每個 match span 加 `data-match-idx` 屬性與 active class（`bg-yellow-400/80` vs `/30`）。`Message.tsx` 新增 `activeMatchIndex` prop 並傳入兩個 highlight 函式。`Chat.tsx` 新增 `activeMatchIndex` state、`goNext`/`goPrev` useCallback（wrapping modulo）、reset effect（searchQuery 改變時歸零）、scrollIntoView effect（`[data-match-idx="${activeMatchIndex}"]`）。`SearchBar` 獲得 `activeMatchIndex`/`onNext`/`onPrev` props：計數器改為 `"X / N"` 格式，prev/next 按鈕在有匹配時啟用，input `onKeyDown` 支援 `Enter`（goNext）/ `Shift+Enter`（goPrev）。typecheck + build + 7 unit tests 全 pass。

### Changed Files
- src/renderer/src/lib/highlight.ts
- src/renderer/src/components/Message.tsx
- src/renderer/src/components/Chat.tsx

### Notes
- `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` 避免過度捲動
- `activeMatchIndex` reset 透過 `useEffect([searchQuery])` 觸發，確保新搜尋從第 0 個 match 開始
