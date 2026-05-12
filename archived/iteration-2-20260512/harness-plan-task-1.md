# Harness Plan

## 建議建立的護欄清單

| AC 編號 | 護欄形式 | 工具 | 預期輸出 |
|---|---|---|---|
| AC-1 | Type contract check | TypeScript | `ToolPermissionMode`、permission request/response、tool permission state 型別可被 main/preload/renderer 引用 |
| AC-2 | Unit-level policy helper check through compile-time usage | TypeScript | Main process permission helper 可用 default policy 回傳 deterministic decision |
| AC-3 | Regression typecheck | TypeScript | `StreamChunk` 新增 non-terminal contract 後 preload 仍只以 `done` / `error` 結束 stream listener |
| AC-4 | Project typecheck | npm scripts | `npm run typecheck:node`、`npm run typecheck:web` pass |

## Domain Invariants

- `deny`、`ask`、`allow` 必須是唯一 permission modes。
- `done` 與 `error` 仍是 chat stream 的 terminal chunks。
- Task 1 不應改變現有 tool execution runtime behavior。

## Contract Tests

- 本 task 的 contract boundary 是 `src/shared/types.ts`。以 TypeScript typecheck 作為最小 contract guard；後續 task 若加入 runtime permission response IPC，再補 runtime harness。

## 快速執行命令

- `npm run typecheck:node && npm run typecheck:web`
