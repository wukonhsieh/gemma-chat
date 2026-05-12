import type { ToolPermissionMode } from '../shared/types'

export type ToolPermissionPolicy = Partial<Record<string, ToolPermissionMode>>

export interface ToolPermissionEvaluation {
  mode: ToolPermissionMode
  reason: string
}

export const DEFAULT_TOOL_PERMISSION_POLICY: ToolPermissionPolicy = {
  web_search: 'ask',
  fetch_url: 'ask',
  calc: 'allow',
  write_file: 'allow',
  read_file: 'allow',
  edit_file: 'allow',
  list_files: 'allow',
  delete_file: 'ask',
  run_bash: 'ask',
  open_preview: 'allow'
}

export function evaluateToolPermission(
  toolName: string,
  policy: ToolPermissionPolicy = DEFAULT_TOOL_PERMISSION_POLICY
): ToolPermissionEvaluation {
  const mode = policy[toolName] ?? 'ask'
  return {
    mode,
    reason: `Tool policy for ${toolName} is ${mode}.`
  }
}
