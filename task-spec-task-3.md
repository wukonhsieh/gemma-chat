# Task Spec

## Goal

- 在 main process tool execution flow 中加入 permission gate，使 tool side effect 在執行前依 `deny` / `ask` / `allow` 決策處理，且 workspace 外檔案存取會強制進入 ask。

## Non-Goals

- 本 task 不設計最終 renderer UI；只提供 stream chunk / IPC contract 和 main process runtime behavior。
- 本 task 不加入 persisted permission settings UI。
- 本 task 不擴充 shell command 的完整語意解析；`run_bash` 先依 default policy ask。

## Functional Spec

- Input:
  - Parsed XML action: tool name、args、conversation id。
  - `ChatRequest.toolPermissions` 或 default tool permission policy。
  - Workspace path classification result。
- Output:
  - `deny`: tool 不執行，tool result 回傳 denied message。
  - `allow`: tool 正常執行。
  - `ask`: main process emit pending permission request，等待 renderer 以 IPC approve/deny 後再繼續。
- State Transitions:
  - `ask` request 進入 pending registry。
  - approve 後移除 pending request 並執行 tool 一次。
  - deny 或 abort 後移除 pending request 並不執行 tool。
- Rules:
  - Workspace 外 path tools 必須提升為 ask，除非 tool 已被 general policy deny。
  - Workspace 外 live-write partial update 不得在 permission approval 前寫入。
  - Permission request 必須包含 tool name、args、target summary、reason。

## Constraints

- `done` / `error` 仍是 stream terminal chunks。
- Abort chat 時不得留下 pending permission request。
- Approval 只適用於該次 tool call。
- `assertInWorkspace` 仍保留；workspace 外 access 僅在該次已批准 tool call 中使用 explicit option。

## Acceptance Criteria

1. Given a tool with policy `deny`
   When the model emits that action
   Then main process returns a denied tool result without running the tool.
2. Given a tool with policy `ask`
   When the model emits that action
   Then main process emits a permission request and waits for approve/deny response.
3. Given a workspace file tool targeting `../outside.txt`
   When the tool's general policy is `allow`
   Then main process still emits an ask request before filesystem access.
4. Given Build Mode live-write detects a workspace-external `write_file` path
   When content streams before approval
   Then no partial outside-workspace write is attempted.
5. Given current node code
   When `npm run typecheck:node` runs
   Then the permission gate compiles with existing chat/tool flow.
