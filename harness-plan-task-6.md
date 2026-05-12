# Harness Plan

## 建議建立的護欄清單

| AC 編號 | 護欄形式 | 工具 | 預期輸出 |
|---|---|---|---|
| AC-1 | Config loader review + typecheck | TypeScript | Missing file path writes default config and returns defaults |
| AC-2 | Config merge review + typecheck | TypeScript | Valid configured tool value overrides default |
| AC-3 | Normalization review + typecheck | TypeScript | Missing/invalid values fallback to defaults |
| AC-4 | Full verification | npm scripts | `npm run typecheck` and `npm run build` pass |

## Domain Invariants

- Config file policy cannot bypass workspace outside forced ask.
- Config load failure must not crash chat/tool execution.
- Built-in default policy remains the fallback source of truth.

## Contract Tests

- Config file format is `{ "tools": Record<string, ToolPermissionMode> }`.

## 快速執行命令

- `npm run typecheck && npm run build`
