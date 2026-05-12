# Task Spec

## Goal

- 建立 tool permission 的共享契約與 main process policy model baseline，讓後續 tasks 可以在不重塑資料結構的前提下加入 ask gate、workspace path forced ask 與 renderer controls。

## Non-Goals

- 本 task 不實作等待使用者 approve/deny 的完整流程。
- 本 task 不實作 workspace 外路徑分類或 forced ask。
- 本 task 不新增 renderer 的 approve/deny UI。
- 本 task 不改變現有 tool execution 行為；既有 tools 仍依目前流程執行。

## Functional Spec

- Input:
  - 現有 `ToolCall`、`ChatRequest`、`StreamChunk` contracts。
  - 後續 main process tool loop 可使用的 tool name、args、conversation id。
- Output:
  - Shared types 能表示 `deny`、`ask`、`allow`。
  - Shared types 能表示 pending permission request 與 approve/deny response。
  - `ToolCall` 能攜帶 permission 狀態，供後續 renderer 顯示。
  - Main process 有可重用 permission policy helper，能回傳基於 tool name 的 baseline decision。
- State Transitions:
  - Tool permission request 可從 pending 變成 approved 或 denied；本 task 只定義狀態，不實作 runtime transition。
- Rules:
  - `deny` 表示不得執行 tool。
  - `ask` 表示 tool 必須等待 user response。
  - `allow` 表示沒有更高優先級安全規則時可執行 tool。

## Constraints

- 跨 process payload 必須定義在 `src/shared/types.ts`。
- 新增 stream contract 時不能讓 preload terminal cleanup 誤判；`done` / `error` 仍是 terminal chunk。
- Main process permission helper 不可造成現有 tool behavior 改變。
- 保留現有 Project-based `workspacePath` contract 與 conversation persistence compatibility。

## Acceptance Criteria

1. Given the shared type contract
   When TypeScript checks `src/shared/types.ts`
   Then it exposes permission policy, request, response, and tool-call permission state types covering `deny`, `ask`, and `allow`.
2. Given main process permission evaluation
   When a known tool name is evaluated
   Then the helper returns a deterministic baseline decision from a default policy.
3. Given current chat streaming behavior
   When the new contract is compiled
   Then existing `done` / `error` terminal semantics remain unchanged.
4. Given the current codebase
   When `npm run typecheck:node` and `npm run typecheck:web` run
   Then both commands pass without implementing renderer approval UI.
