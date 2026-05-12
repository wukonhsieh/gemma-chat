# Harness Plan

## 建議建立的護欄清單

| AC 編號 | 護欄形式 | 工具 | 預期輸出 |
|---|---|---|---|
| AC-1 | Main-process control-flow review + typecheck | TypeScript | `deny` branch returns a denied result before `runTool` |
| AC-2 | Main-process pending registry check + typecheck | TypeScript | `ask` branch emits `tool_permission` and awaits IPC response |
| AC-3 | Workspace forced ask guard | TypeScript | path tools use `classifyWorkspacePath` to upgrade outside paths to ask |
| AC-4 | Live-write guard | TypeScript | external `write_file` paths skip partial `wsWriteFile` before approval |
| AC-5 | Regression typecheck | npm script | `npm run typecheck:node` pass |

## Domain Invariants

- A denied tool must never call `runTool`.
- A pending permission request must be removed after approve, deny, abort, or error.
- Workspace outside access is single-call scoped and explicit.
- `assertInWorkspace` remains the default path guard for normal workspace operations.

## Contract Tests

- `tool_permission` stream chunk plus `tool-permission:respond` IPC form the runtime contract for this task. Renderer UI handling is deferred to Task 4.

## 快速執行命令

- `npm run typecheck:node`
