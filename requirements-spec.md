# Project Summary

Gemma Chat 目前以 conversation 作為 Build Mode workspace 的唯一單位。這次需求要在聊天室之前加入一層 Project：使用者先選擇或建立一個 Project，每個 Project 對應到使用者指定的本機 folder，新的聊天會歸屬到目前選擇的 Project，Build Mode 的檔案操作與 preview 也應以該 folder 作為 workspace。

Project 的資料是 app 內的記錄，不代表對實體 folder 的所有權。刪除 Project 時只移除 app 內記錄與其聊天記錄，不刪除使用者 folder 裡的檔案。若尚未建立 Project，系統 fallback 到既有預設 workspace 目錄，維持現有使用流程可用。

## Assumptions

- Project 的顯示名稱來自 folder basename，不另外提供手動命名。
- Project path 由 Electron main process 的 folder picker 取得，renderer 只保存與傳遞已選 path。
- 刪除 Project 記錄時，該 Project 底下的 conversation records 一併從 app 記錄移除，但不刪除磁碟 folder。
- Project 排序依該 Project 底下最後一次聊天活動時間，新的在上面。

# User Requirements

- Users need to create or select a Project before starting new chats.
- Users should be able to reuse the last selected Project as the default target for new chats.
- Users should be able to see Project names as folder names and inspect full paths on hover.
- Users need Project records and chat records to persist across app reloads.
- Users should be able to delete a Project record without deleting files in the Project folder.
- Users should still be able to chat when no Project exists, using the existing default workspace behavior.
- Users should see Projects ordered by their latest chat activity so active work stays near the top.

# Use Cases

## Select a Project for New Work

- Actor: App user
- Trigger: User wants Gemma Chat to work inside an existing local folder
- Intended outcome: User picks a folder, sees it as a Project, and new chats use that folder as the workspace.

## Continue the Last Project

- Actor: Returning app user
- Trigger: User opens the app after previously choosing a Project
- Intended outcome: The last selected Project is active by default, and New chat uses it without requiring another folder selection.

## Inspect Project Location

- Actor: App user
- Trigger: User hovers a Project entry
- Intended outcome: The full folder path is visible through the hover tooltip.

## Delete a Project Record

- Actor: App user
- Trigger: User no longer wants a Project listed in Gemma Chat
- Intended outcome: The Project and its chat records disappear from the app, while folder contents remain untouched.

## Fallback Without Projects

- Actor: New or reset app user
- Trigger: App has no stored Project records
- Intended outcome: Chat and Build Mode still work using the existing per-conversation default workspace directory.

# Functional Requirements

1. The application must maintain a persisted Project list in renderer storage.
2. Each Project record must include a stable id, folder path, display name derived from folder basename, created timestamp, and last activity timestamp.
3. Each conversation record must include the Project id and Project path that should be used as its workspace when available.
4. New conversations must be created under the currently selected Project; if no Project is selected, they must use the last selected Project; if no Project exists, they must fall back to the existing default workspace behavior.
5. The UI must let users add a Project by selecting a local folder through Electron.
6. The UI must show Project display names using folder names.
7. Project UI entries must expose the full folder path on hover.
8. The UI must let users delete a Project record, and deletion must not remove files from the local folder.
9. Project records must be sorted by latest chat activity descending.
10. Sending or regenerating a chat message must update the Project's last activity timestamp.
11. Build Mode workspace operations must run against the conversation's Project folder when a Project path is present.
12. Workspace preview, file listing, open-folder, live write, file tools, and bash execution must continue to use the protected workspace boundary for the resolved workspace root.
13. Existing stored conversations without Project metadata must remain loadable and must fall back to the current default per-conversation workspace directory.

# Technical Specifications

- Runtime: Existing Electron + Vite + React 19 + TypeScript application.
- Renderer persistence: Continue using `localStorage`, with a new schema version for Project-aware conversations.
- Main/preload boundary: Add typed IPC through `src/shared/types.ts` and `src/preload/index.ts` for folder selection and Project workspace routing.
- Workspace routing: Main process may keep a runtime mapping from `conversationId` to Project folder path, with fallback to existing `userData/workspaces/<conversationId>` directories.
- Filesystem safety: All generated file operations, preview reads, and bash execution must remain scoped to the resolved workspace root and keep path traversal protection.
- Verification baseline: `npm run typecheck` and `npm run build`.
