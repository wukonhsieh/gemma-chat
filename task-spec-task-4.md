# Task Spec

## Goal

- 完成 Project feature 的整體驗收、狀態記錄與 Cortex project memory 補充，確認前面 tasks 的變更能通過 repository baseline verification。

## Non-Goals

- 不新增新的 product behavior。
- 不重構已完成的 Project UI 或 workspace routing。
- 不修改既有 unrelated Cortex dirty files。

## Functional Spec

- Input:
  - 已完成的 Task 1 到 Task 3 commits。
  - Repository verification commands。
  - Cortex project memory rules。
- Output:
  - `npm run typecheck` 與 `npm run build` 結果記錄。
  - `project-status.md` 標記 Task 4 完成。
  - Cortex wiki/log 新增 Project workspace 的 reusable understanding。
- State Transitions:
  - Project status Todo List 全部完成。
  - Cortex nested repo 新增可供後續 agent retrieval 的 Project workspace concept page 與 workflow log。
- Rules:
  - 不 stage unrelated source repo 或 Cortex repo dirty files。
  - Cortex 新增內容使用繁體中文。

## Constraints

- Source project 與 Cortex nested repo 必須分開 commit。
- 若 Cortex 既有檔案已 dirty，避免修改那些檔案以免混入他人變更。
- Verification failure 必須記錄原因，不可假裝通過。

## Acceptance Criteria

1. Given the implementation is complete
   When `npm run typecheck` runs
   Then it exits successfully.
2. Given the implementation is complete
   When `npm run build` runs
   Then it exits successfully.
3. Given Project feature adds reusable architecture knowledge
   When Cortex memory is updated
   Then a Project workspace page/log captures the behavior and code locators.
4. Given project status is updated
   When reading `project-status.md`
   Then all planned tasks are checked complete with verification notes.

# Harness Plan

## 建議建立的護欄清單

| AC 編號 | 護欄形式 | 工具 | 預期輸出 |
|---|---|---|---|
| AC-1 | Full typecheck | `npm run typecheck` | exit 0 |
| AC-2 | Production build | `npm run build` | exit 0 |
| AC-3 | Cortex file review | Markdown review | new concept page and log exist |
| AC-4 | Status review | Markdown review | all todos complete and Task 4 log exists |

## Domain Invariants

- Verification must happen after implementation changes, not before.
- Source repo commit must not include nested Cortex content.
- Cortex commit must not include unrelated pre-existing dirty files.

## Contract Tests

- No new API contract is introduced in Task 4.

## 快速執行命令

- `npm run typecheck && npm run build`
