# Task Spec

## Goal

- 完成本 iteration 的最終驗收與 durable project memory 更新，確認 tool permission flow、workspace forced ask、renderer controls 能通過完整 typecheck/build，並把完成狀態記錄在 `project-status.md` 與 Cortex wiki/logs。

## Non-Goals

- 本 task 不再新增新的 permission behavior。
- 本 task 不調整 default tool permission policy。
- 本 task 不加入 persisted settings 或 allowlist。

## Functional Spec

- Input:
  - 已完成的 Task 1-4 變更。
  - Existing Cortex wiki structure。
- Output:
  - Full verification result。
  - Updated `project-status.md` marking Task 5 complete。
  - Cortex reusable memory describing tool permission flow and workspace forced ask behavior。
- State Transitions:
  - Project status Task 5 從 incomplete 變 complete。
  - Cortex nested repo 新增或更新 wiki/log 記錄。
- Rules:
  - 若 verification fail，不能標記 Task 5 complete；需記錄 blocker。
  - Cortex 內容使用繁體中文，保留 technical symbols。

## Constraints

- Source project changes and nested `cortex/` repo changes must be committed separately.
- Do not stage unrelated untracked agent bootstrap files.
- Verification baseline is `npm run typecheck` and `npm run build`.

## Acceptance Criteria

1. Given completed Task 1-4 changes
   When `npm run typecheck` runs
   Then it passes.
2. Given completed Task 1-4 changes
   When `npm run build` runs
   Then it passes.
3. Given reusable permission-flow understanding
   When Cortex wiki is updated
   Then future agents can find code locators, retrieval order, and change guidance for tool permissions.
4. Given final status update
   When `project-status.md` is read
   Then all tasks are marked complete with a Task 5 change log.
