# Harness Plan

## 建議建立的護欄清單

| AC 編號 | 護欄形式 | 工具 | 預期輸出 |
|---|---|---|---|
| AC-1 | Helper behavior check | TypeScript compile + code review invariant | `index.html` path classification returns workspace-safe shape |
| AC-2 | Helper behavior check | TypeScript compile + code review invariant | `../outside.txt` classification returns `requiresAsk: true` |
| AC-3 | Helper behavior check | TypeScript compile + code review invariant | Absolute outside path classification returns `requiresAsk: true` |
| AC-4 | Regression typecheck | npm script | `npm run typecheck:node` pass |

## Domain Invariants

- `assertInWorkspace` remains the final guard for normal workspace file operations.
- `classifyWorkspacePath` must never label traversal or outside absolute paths as workspace-safe.
- Workspace root resolution must continue using `workspaceDir(conversationId)` so Project folders and fallback workspaces share one policy.

## Contract Tests

- No public renderer contract changes in this task. The internal contract is the exported workspace classification shape from `src/main/workspace.ts`.

## 快速執行命令

- `npm run typecheck:node`
