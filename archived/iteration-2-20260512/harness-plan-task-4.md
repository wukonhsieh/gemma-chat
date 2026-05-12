# Harness Plan

## 建議建立的護欄清單

| AC 編號 | 護欄形式 | 工具 | 預期輸出 |
|---|---|---|---|
| AC-1 | Reducer behavior check | TypeScript | `tool_permission` chunk updates matching `ToolCall.permission` |
| AC-2 | Component render check | TypeScript + manual UI review | Pending card exposes permission reason and controls |
| AC-3 | IPC contract check | TypeScript | approve calls `respondToToolPermission` with `decision: "allow"` |
| AC-4 | IPC contract check | TypeScript | deny calls `respondToToolPermission` with `decision: "deny"` |
| AC-5 | Regression typecheck | npm script | `npm run typecheck:web` pass |

## Domain Invariants

- Renderer must not execute tools directly; it only responds to main process permission requests.
- Pending permission controls must disappear after approved, denied, or final tool result state.
- Tool result cards remain usable for normal non-permission tools.

## Contract Tests

- The contract boundary is `StreamChunk.type === "tool_permission"` and `window.api.respondToToolPermission`. TypeScript compile protects both sides for this task.

## 快速執行命令

- `npm run typecheck:web`
