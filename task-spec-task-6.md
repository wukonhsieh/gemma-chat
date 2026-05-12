# Task Spec

## Goal

- 讓 main process 從 `~/.config/gabie/gabie.json` 載入 tool permission policy；如果檔案不存在，建立包含預設 policy 的 config 並使用預設值。

## Non-Goals

- 本 task 不新增 renderer settings UI。
- 本 task 不支援熱更新已在執行中的 chat request。
- 本 task 不改變 workspace 外 forced ask 的優先級。

## Functional Spec

- Input:
  - `~/.config/gabie/gabie.json`
  - Built-in `DEFAULT_TOOL_PERMISSION_POLICY`
- Output:
  - Effective `ToolPermissionPolicy` for each `handleChat` run。
  - Missing config file is created with default values.
- Rules:
  - Config format uses `{ "tools": { "<toolName>": "deny|ask|allow" } }`.
  - Missing tool keys fallback to built-in defaults.
  - Invalid mode values are ignored and fallback to built-in defaults.
  - Config parse/read errors other than missing file fallback to built-in defaults without crashing the tool loop.

## Constraints

- Config loading belongs in main process code.
- Tool permission decisions must still allow `ChatRequest.toolPermissions` to override loaded policy when provided.
- Workspace outside file access still forces `ask` even when config says `allow`.

## Acceptance Criteria

1. Given `~/.config/gabie/gabie.json` does not exist
   When the app needs tool permissions
   Then it writes a config file with default tool policy and uses those defaults.
2. Given the config file contains `{ "tools": { "run_bash": "deny" } }`
   When `run_bash` permission is evaluated
   Then the effective policy returns `deny`.
3. Given the config file omits some tools or contains invalid values
   When permissions are loaded
   Then omitted/invalid entries fall back to built-in defaults.
4. Given the current codebase
   When `npm run typecheck` and `npm run build` run
   Then both pass.
