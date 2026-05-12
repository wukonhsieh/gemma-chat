# Task Spec

## Goal

- 在 renderer chat UI 顯示 pending tool permission request，提供 approve / deny controls，並透過 preload API 回覆 main process，使 Task 3 的 ask flow 可以由使用者完成。

## Non-Goals

- 本 task 不新增 persisted permission settings。
- 本 task 不設計全域 tool permission preference screen。
- 本 task 不改變 main process permission evaluation policy。
- 本 task 不實作多步記住選擇或 domain/path allowlist。

## Functional Spec

- Input:
  - `tool_permission` stream chunk。
  - Existing `tool_call` / `tool_result` chunks。
  - User approve / deny click。
- Output:
  - Matching `ToolCall` records receive pending permission state.
  - Tool card displays reason, target, and approve/deny buttons while permission is pending.
  - User response calls `window.api.respondToToolPermission`.
  - After tool result arrives, card displays approved/denied/final result state.
- State Transitions:
  - `tool_call` creates a running card.
  - `tool_permission` marks the matching card as pending permission.
  - User click locally marks the request as approved or denied.
  - `tool_result` marks running false and shows result/error.
- Rules:
  - Buttons only appear when permission status is pending.
  - Long path/command/args must not break layout.
  - Permission request should be visible without opening the details area.

## Constraints

- Keep renderer using `window.api`; no direct Electron/Node APIs.
- Preserve existing `done` / `error` stream cleanup behavior.
- UI should match existing dark tool card style and avoid nested cards.
- Do not remove existing tool result detail expansion.

## Acceptance Criteria

1. Given a `tool_permission` chunk for an existing tool call
   When Chat reducer processes it
   Then the matching `ToolCall` has pending permission state.
2. Given a pending permission tool call
   When the message renders
   Then the tool card shows approval context and approve/deny controls.
3. Given the user clicks approve
   When renderer calls the preload API
   Then it sends `{ requestId, decision: "allow" }` to main process.
4. Given the user clicks deny
   When renderer calls the preload API
   Then it sends `{ requestId, decision: "deny" }` to main process.
5. Given current renderer code
   When `npm run typecheck:web` runs
   Then the UI and preload contract compile.
