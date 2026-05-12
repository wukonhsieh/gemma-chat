# Project Summary

本 iteration 要替 Gemma Chat 加入工具權限控制，讓每次工具呼叫可以依政策被 `deny`、`ask` 或 `allow`。使用者需要能理解模型即將執行的 tool、目標與風險，並在需要確認時批准或拒絕。

第二個核心需求是限制檔案存取路徑預設必須位於目前 conversation 的 workspace 內。任何 tool 或 workspace operation 嘗試存取 workspace 外部路徑時，系統不能靜默執行，必須強制進入 `ask` 流程；只有使用者明確批准後才可執行該次越界存取。

## Assumptions

- `deny`、`ask`、`allow` 是 tool permission policy 的三種結果或設定，不是模型可自行覆寫的文字建議。
- Workspace 內相對路徑仍維持既有 protected behavior，預設可依 tool policy 執行。
- Workspace 外路徑屬高風險操作，即使某個 tool 的一般政策是 `allow`，也必須提升為 `ask`。
- 使用者批准 workspace 外存取時，批准範圍以單次 tool call 為 baseline；是否記住決定可作為後續 task 擴充，除非本 iteration 明確納入。
- Build Mode 的 live-write partial file update 也必須遵守 workspace path policy，不能在 ask 尚未批准前寫入 workspace 外部路徑。
- 現有沒有 Project 時的 fallback workspace 行為必須保留。

# User Requirements

- Users need tools to obey explicit permission outcomes: deny, ask, or allow.
- Users should be able to review an `ask` permission request before the tool side effect happens.
- Users should be able to approve or deny a pending tool request from the chat UI.
- Users need dangerous or external filesystem access to require confirmation, even when the tool would otherwise be allowed.
- Users should see which tool is requesting permission, the target path/URL/command, and enough context to make a decision.
- Users should not lose the current chat generation when a tool pauses for permission.
- Users should still get the existing smooth Build Mode behavior for normal workspace-relative writes.
- Users should be protected from accidental reads, writes, edits, deletes, preview serving, folder opening, or shell execution outside the active workspace.

# Use Cases

## Allow a Safe Workspace Tool

- Actor: App user
- Trigger: Build Mode generates `write_file` for `index.html`.
- Intended outcome: The tool runs normally because the path is workspace-relative and permitted by policy.

## Ask Before External File Access

- Actor: App user
- Trigger: The model attempts to read, write, edit, or delete `/Users/me/Documents/private.txt` or `../outside.txt`.
- Intended outcome: The tool pauses and shows a permission request; no filesystem access happens until the user approves.

## Deny a Tool Category

- Actor: App user
- Trigger: The model attempts a tool whose policy is `deny`.
- Intended outcome: The app blocks the tool, reports the denial to the model/UI, and continues without executing the side effect.

## Approve a Pending Tool

- Actor: App user
- Trigger: A tool request is waiting in `ask` state.
- Intended outcome: The user approves it, the tool executes once, and the model receives the tool result.

## Reject a Pending Tool

- Actor: App user
- Trigger: A tool request is waiting in `ask` state.
- Intended outcome: The user denies it, the tool does not execute, and the model receives a clear denied result.

## Preserve Normal Workspace Safety

- Actor: App user
- Trigger: The model calls workspace tools using normal relative paths.
- Intended outcome: Existing `assertInWorkspace` protection still prevents path traversal and normal workspace operations keep working.

# Functional Requirements

1. The application must represent tool permission as one of `deny`, `ask`, or `allow`.
2. The application must evaluate a permission decision before executing a tool side effect.
3. A `deny` decision must prevent tool execution and return a clear denied result to the chat/tool loop.
4. An `allow` decision must execute the tool without additional user interaction when no stronger safety rule applies.
5. An `ask` decision must pause the tool execution and emit a pending permission request to the renderer.
6. The renderer must display pending permission requests with the tool name, target summary, and approve/deny controls.
7. Approving a pending request must resume the paused tool call and execute it once.
8. Denying a pending request must not execute the tool and must return a denied result into the model context.
9. Workspace filesystem tools must distinguish workspace-relative access from workspace-external access.
10. Any attempt to access a path outside the resolved workspace root must force an `ask` decision, regardless of the tool's general policy.
11. Workspace-external access must not occur during streaming live-write before permission approval.
12. Existing workspace path traversal protection must remain active even after permission approval.
13. `run_bash` must continue to run with the workspace as its default `cwd`, and commands that attempt workspace-external filesystem effects must be treated as requiring confirmation when detectable.
14. Workspace preview, file listing, open folder, generated file writes, file reads, edits, deletes, and bash execution must keep using the resolved conversation workspace as their default boundary.
15. Existing conversations and Project-based workspace routing must remain compatible.
16. Permission request state must be represented in the shared main/preload/renderer contract so UI state and tool loop state stay synchronized.

# Technical Specifications

- Runtime: Existing Electron + Vite + React 19 + TypeScript application.
- Shared contracts: Extend `src/shared/types.ts` with tool permission policy/request/result shapes as needed.
- Main/preload boundary: Add typed IPC or stream chunks for permission request, permission response, and pending tool continuation.
- Tool loop: Permission evaluation belongs in the main process before `runTool` executes the tool.
- Workspace safety: Preserve `assertInWorkspace` or an equivalent normalized path guard in `src/main/workspace.ts`; permission approval must not remove path normalization.
- Renderer UI: Extend the existing tool call card or nearby message UI to show pending permission state and approve/deny actions.
- Persistence: This iteration may keep permission policy in runtime state unless a task explicitly adds persisted user settings.
- Verification baseline: `npm run typecheck` and `npm run build`.
