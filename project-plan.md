## 規劃摘要

- 目標: 為 Gemma Chat 建立 tool permission flow，支援 `deny`、`ask`、`allow`，並讓 workspace 外檔案存取一律強制進入 ask approval。
- 假設: 一般 permission policy 可先用 runtime/default policy 表示；workspace 外存取是更高優先級的 safety rule，會覆蓋一般 `allow`；使用者批准以單次 tool call 為範圍。
- 風險: 這會跨越 main process streaming/tool loop、workspace path normalization、preload IPC、renderer tool UI；尤其 Build Mode live-write 必須避免在 approval 前產生 workspace 外 side effect。

## 任務清單

### Task 1 - Define tool permission contracts and policy model

- 為什麼現在做: Permission flow 會影響 main/preload/renderer 的共享 payload 與 tool loop 狀態，必須先建立穩定 contract。
- 目標: 定義 `deny` / `ask` / `allow` 的 shared types、pending permission request shape、permission response shape，以及 tool permission decision 的基本 policy model。
- 背景 / 依賴: 依賴現有 `ToolCall`、`StreamChunk`、`ChatRequest`、`src/preload/index.ts` stream bridge。
- 粗略作法: 擴充 `src/shared/types.ts`，新增 permission request/decision type；在 main process 建立 permission evaluation helper 的骨架，先不改完整 UI。
- 驗證方式: `npm run typecheck:node`、`npm run typecheck:web`。
- 風險 / 備註: 新增 stream chunk 或 IPC 時要同步 preload listener cleanup 與 renderer reducer，避免 pending request 讓 chat 永久卡住。

### Task 2 - Add workspace path classification and forced ask checks

- 為什麼現在做: Workspace 外存取是本 iteration 的安全核心，需要先在 filesystem boundary 層有可重用判斷。
- 目標: 讓 workspace tools 能辨識 path 是否位於 resolved workspace root 內，並將 workspace 外路徑標記為必須 ask。
- 背景 / 依賴: 依賴 Task 1 的 permission decision shape，以及現有 `registerConversationWorkspace`、`workspaceDir`、`assertInWorkspace`。
- 粗略作法: 在 `src/main/workspace.ts` 或鄰近 helper 新增 normalized path classification；保留既有 relative workspace behavior；對 absolute path、`..` traversal、workspace root 外路徑產生 `requiresAsk` 結果。
- 驗證方式: 對 path classification 補最小 automated checks，並跑 `npm run typecheck:node`。
- 風險 / 備註: 不可把 classification 寫成替代 `assertInWorkspace` 的寬鬆通道；approval 後仍要使用安全解析。

### Task 3 - Gate tool execution in the main process

- 為什麼現在做: Contract 與 path classification 完成後，tool side effect 必須真的在執行前被 permission gate 攔住。
- 目標: 在 `handleChat` 的 tool execution flow 中套用 permission evaluation：deny 直接回傳 denied result，ask 暫停並等待 renderer response，allow 才執行 `runTool`。
- 背景 / 依賴: 依賴 Task 1 contracts、Task 2 workspace path checks、現有 `runTool` 與 `ToolCall` stream chunks。
- 粗略作法: 新增 pending permission request registry；main process emit permission request chunk 或 IPC event；新增 approve/deny IPC；tool loop await response 後繼續或返回 denied。
- 驗證方式: 使用最小 harness 驗證 deny 不執行 tool、ask 會等待 response、workspace 外 path 強制 ask；跑 `npm run typecheck:node`。
- 風險 / 備註: 需要處理 abort、conversation 結束、renderer 沒回覆、同 conversation 多個 pending request 等狀態清理。

### Task 4 - Render permission requests and user controls

- 為什麼現在做: Main process 能 ask 後，使用者需要在 chat UI 中看懂並回覆 permission request。
- 目標: Renderer 顯示 pending permission request，提供 approve / deny 控制，並把 response 傳回 main process。
- 背景 / 依賴: 依賴 Task 1/3 的 stream chunk 或 IPC contract；沿用現有 `Message.tsx` tool call card style。
- 粗略作法: 更新 `Chat.tsx` stream reducer 保存 permission 狀態；更新 `Message.tsx` 或 tool card 顯示 permission badge、target summary、approve/deny buttons；preload expose response API。
- 驗證方式: `npm run typecheck:web`；手動檢查 ask card、approve resumes、deny blocks。
- 風險 / 備註: UI 需要避免文字溢出，尤其 command/path 很長時要 truncate 並保留 title 或 detail view。

### Task 5 - Final verification and Cortex/status updates

- 為什麼現在做: Permission flow 跨多層並修改 protected workspace/tool areas，需要最後整體驗證與 durable 記錄。
- 目標: 跑完整 typecheck/build，更新 `project-status.md`，並視需要補充 Cortex wiki 的 reusable project memory。
- 背景 / 依賴: 依賴前四個 tasks 完成。
- 粗略作法: 執行 `npm run typecheck` 與 `npm run build`；手動驗證 Chat Mode tools、Build Mode workspace write、workspace 外 ask、deny、allow；更新 Cortex wiki/logs。
- 驗證方式: `npm run typecheck`、`npm run build`，外加上述手動 flows。
- 風險 / 備註: 若 build 受環境影響失敗，需要在 status notes 記錄原因與已通過的 narrower checks。

### Task 6 - Load tool permissions from Gabie config

- 為什麼現在做: 使用者需要用固定本機設定檔管理 tool permission，而不是只依賴內建 runtime default。
- 目標: Main process 讀取 `~/.config/gabie/gabie.json` 作為 tool permission policy；檔案不存在時寫入 default policy 並使用 default。
- 背景 / 依賴: 依賴 Task 1 的 `ToolPermissionMode` 與 Task 3 的 main-process permission gate。
- 粗略作法: 在 `src/main/permissions.ts` 新增 config path、default config、loader 與 normalization；`handleChat` 開始時載入 policy 並交給 `evaluateActionPermission`。
- 驗證方式: `npm run typecheck:node`、`npm run typecheck`、`npm run build`。
- 風險 / 備註: 缺漏或無效值應 fallback 到內建 default；不要讓 config parse error 造成 tool loop 崩潰。
