# Harness Plan

## 建議建立的護欄清單

| AC 編號 | 護欄形式 | 工具 | 預期輸出 |
|---|---|---|---|
| AC-1 | Full typecheck | npm script | `npm run typecheck` pass |
| AC-2 | Production build | npm script | `npm run build` pass |
| AC-3 | Cortex memory review | Markdown review | Tool permission wiki page includes code locators, retrieval order, change guidance |
| AC-4 | Status review | Markdown review | `project-status.md` marks all tasks complete and includes Task 5 log |

## Domain Invariants

- Permission flow must not remove workspace path protection.
- Workspace outside access remains approval-gated and single-call scoped.
- Main/preload/renderer shared contracts remain synchronized.

## Contract Tests

- No new runtime contract is introduced in this task; it verifies the contracts added in Tasks 1-4.

## 快速執行命令

- `npm run typecheck && npm run build`
