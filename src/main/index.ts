import { app, shell, BrowserWindow, ipcMain, nativeTheme, session, nativeImage, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { AVAILABLE_MODELS } from '@shared/types'
import {
  locateMLX,
  installMLX,
  startServer,
  stopServer,
  chatStream,
  listLocalModels,
  type MLXChatMessage
} from './mlx'
import {
  TOOLS,
  chatSystemPrompt,
  codeSystemPrompt,
  findNextAction,
  emitSafeBoundary,
  runTool,
  cleanFileContent,
  type ToolContext
} from './tools'
import {
  ensureWorkspace,
  startWorkspaceServer,
  stopWorkspaceServer,
  getWorkspaceServerPort,
  previewUrl,
  listTree,
  workspaceDir,
  workspacesRoot,
  wsWriteFile,
  registerConversationWorkspace,
  classifyWorkspacePath
} from './workspace'
import {
  evaluateToolPermission,
  loadToolPermissionPolicy,
  saveToolPermission,
  type ToolPermissionPolicy,
  type ToolPermissionEvaluation
} from './permissions'
import { scanAllSkills, type ScopeEntry } from './skills/scanner'
import { writeSkillArtifacts, buildSkillCatalogFromIndex } from './skills/indexer'
import { detectSkillInvocation } from './skills/detector'
import { loadSkill, type LoadedSkillsRegistry } from './skills/loader'
import type { SkillIndex } from './skills/types'
import {
  SETTINGS_CHANNELS,
  type ChatRequest,
  type StreamChunk,
  type ToolCall,
  type ToolInfo,
  type ToolPermissionRequest,
  type ToolPermissionResponse,
  type ToolPermissionResponseDecision,
  type ToolPermissionValue
} from '../shared/types'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 820,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0e0e0e',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (is.dev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function send(channel: string, payload: unknown): void {
  mainWindow?.webContents.send(channel, payload)
}

let mlxPython: string | null = null

async function ensureMLXRunning(model: string): Promise<string> {
  let mlx = locateMLX()
  if (!mlx) {
    throw new Error(
      'Python 3.10–3.14 not found. Install via Homebrew or Miniforge.'
    )
  }

  let pythonToUse = mlx.python

  if (!mlx.installed) {
    send('setup:status', {
      stage: 'installing-mlx',
      message: 'Installing MLX runtime…'
    })
    // installMLX creates the venv and returns the venv python path
    pythonToUse = await installMLX((p) => {
      send('setup:status', {
        stage: 'installing-mlx',
        message: p.message
      })
    })
  }

  mlxPython = pythonToUse

  const label = AVAILABLE_MODELS.find((m) => m.name === model)?.label ?? model
  send('setup:status', { stage: 'starting-mlx', message: 'Starting model runtime…' })
  send('setup:status', {
    stage: 'downloading-model',
    message: `Loading ${label}… (first run downloads the model)`
  })
  await startServer(pythonToUse, model, (p) => {
    send('setup:status', {
      stage: 'downloading-model',
      message: p.message,
      progress: p.progress
    })
  })
  return pythonToUse
}

async function handleSetup(model: string): Promise<void> {
  try {
    send('setup:status', { stage: 'checking', message: 'Checking system…' })
    await ensureMLXRunning(model)
    send('setup:status', { stage: 'ready', message: 'Ready to chat.' })
  } catch (e) {
    send('setup:status', {
      stage: 'error',
      message: 'Setup failed',
      error: (e as Error).message
    })
  }
}

const MAX_TOOL_ROUNDS_CHAT = 6
const MAX_TOOL_ROUNDS_CODE = 40

const PATH_PERMISSION_TOOLS = new Set(['write_file', 'read_file', 'edit_file', 'delete_file'])

interface ActionPermissionEvaluation extends ToolPermissionEvaluation {
  allowOutsideWorkspaceOnApproval?: boolean
}

interface PendingToolPermission {
  conversationId: string
  resolve: (decision: ToolPermissionResponseDecision) => void
  reject: (error: Error) => void
}

const pendingToolPermissions = new Map<string, PendingToolPermission>()

function abortError(message: string): Error {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

function evaluateActionPermission(
  req: ChatRequest,
  basePolicy: ToolPermissionPolicy,
  toolName: string,
  args: Record<string, unknown>
): ActionPermissionEvaluation {
  const policy = { ...basePolicy, ...(req.toolPermissions ?? {}) }
  const decision = evaluateToolPermission(toolName, policy)
  if (decision.mode === 'deny') return decision

  if (PATH_PERMISSION_TOOLS.has(toolName) && typeof args.path === 'string') {
    const pathCheck = classifyWorkspacePath(req.conversationId, args.path)
    if (pathCheck.requiresAsk) {
      return {
        mode: 'ask',
        reason: `${pathCheck.reason} Approval is required to access ${pathCheck.resolvedPath}.`,
        allowOutsideWorkspaceOnApproval: true
      }
    }
  }

  return decision
}

function waitForToolPermission(
  request: ToolPermissionRequest,
  signal: AbortSignal
): Promise<ToolPermissionResponseDecision> {
  if (signal.aborted) return Promise.reject(abortError('Permission request aborted.'))
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      pendingToolPermissions.delete(request.id)
      reject(abortError('Permission request aborted.'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
    pendingToolPermissions.set(request.id, {
      conversationId: request.conversationId,
      resolve: (decision) => {
        signal.removeEventListener('abort', onAbort)
        pendingToolPermissions.delete(request.id)
        resolve(decision)
      },
      reject: (error) => {
        signal.removeEventListener('abort', onAbort)
        pendingToolPermissions.delete(request.id)
        reject(error)
      }
    })
  })
}

function resolveToolPermission(response: ToolPermissionResponse): boolean {
  const pending = pendingToolPermissions.get(response.requestId)
  if (!pending) return false
  pending.resolve(response.decision)
  return true
}

function clearConversationPermissions(conversationId: string): void {
  for (const [id, pending] of pendingToolPermissions.entries()) {
    if (pending.conversationId !== conversationId) continue
    pending.reject(abortError('Conversation ended before permission was resolved.'))
    pendingToolPermissions.delete(id)
  }
}

function actionTarget(_name: string, args: Record<string, unknown>): string | undefined {
  if (typeof args.path === 'string') return args.path
  if (typeof args.query === 'string') return String(args.query)
  if (typeof args.url === 'string') return String(args.url)
  if (typeof args.command === 'string')
    return String(args.command).slice(0, 80)
  return undefined
}

function latestUserMessage(req: ChatRequest): string {
  for (let i = req.messages.length - 1; i >= 0; i--) {
    const message = req.messages[i]
    if (message.role === 'user') return message.content
  }
  return ''
}

function hasExplicitBuildIntent(req: ChatRequest): boolean {
  const text = latestUserMessage(req).toLowerCase()
  if (!text.trim()) return false

  const negativeIntent =
    /\b(don't|do not|dont|without|no need to|not asking you to)\b.{0,40}\b(build|create|make|write|code|app|page|site|file)\b/.test(
      text
    ) ||
    /(不要|不用|不需要|先不要|沒有要).{0,24}(寫|做|建立|創建|產生|生成|開發|實作|app|應用|網頁|網站|檔案|程式)/.test(
      text
    )

  if (negativeIntent) return false

  return (
    /\b(build|create|make|implement|generate|write|code|scaffold|prototype)\b.{0,80}\b(app|page|site|website|demo|script|component|game|tool|file|project)\b/.test(
      text
    ) ||
    /\b(app|page|site|website|demo|script|component|game|tool|project)\b.{0,80}\b(build|create|make|implement|generate|write|code|scaffold|prototype)\b/.test(
      text
    ) ||
    /(做|建立|創建|產生|生成|寫|開發|實作|刻|弄).{0,24}(app|應用|網頁|網站|頁面|demo|腳本|程式|遊戲|工具|專案|檔案)/.test(
      text
    ) ||
    /(app|應用|網頁|網站|頁面|demo|腳本|程式|遊戲|工具|專案|檔案).{0,24}(做|建立|創建|產生|生成|寫|開發|實作|刻|弄)/.test(
      text
    )
  )
}

async function handleChat(req: ChatRequest, channel: string): Promise<void> {
  const abort = new AbortController()
  chatAbortControllers.set(req.conversationId, abort)
  registerConversationWorkspace(req.conversationId, req.workspacePath)
  const toolPermissionPolicy = await loadToolPermissionPolicy()

  const emit = (chunk: StreamChunk): void => send(channel, chunk)

  try {
    const baseMessages: MLXChatMessage[] = []

    if (req.mode === 'code') {
      const wsPath = await ensureWorkspace(req.conversationId)
      const href = previewUrl(req.conversationId)
      baseMessages.push({ role: 'system', content: codeSystemPrompt(wsPath, href) })
    } else {
      baseMessages.push({ role: 'system', content: chatSystemPrompt(req.enableTools) })
    }

    // Skill scan: runs on first handleChat, and re-runs whenever workspacePath changes
    // (e.g. user links a project mid-conversation) or the previous scan failed.
    // Scans project (if open) → global (~/.agents/skills) → builtin (app resources/skills).
    const cachedSkillState = conversationSkillStates.get(req.conversationId)
    let skillState: ConversationSkillState
    if (cachedSkillState && cachedSkillState.scannedWorkspacePath === req.workspacePath) {
      skillState = cachedSkillState
    } else {
      const prevLoadedSkills = cachedSkillState?.loadedSkills ?? {}
      const prevTurnCount = cachedSkillState?.turnCount ?? 0
      try {
        const homeDir = app.getPath('home')
        const userDataDir = app.getPath('userData')
        const builtinRoot = is.dev
          ? join(app.getAppPath(), 'resources', 'skills')
          : join(process.resourcesPath, 'skills')

        const scopes: ScopeEntry[] = []
        if (req.workspacePath) {
          scopes.push({
            scope: 'project',
            root: join(req.workspacePath, '.agents', 'skills'),
            cacheRoot: join(req.workspacePath, '.agents', 'cache')
          })
        }
        scopes.push({
          scope: 'global',
          root: join(homeDir, '.agents', 'skills'),
          cacheRoot: join(homeDir, '.agents', 'cache')
        })
        scopes.push({
          scope: 'builtin',
          root: builtinRoot,
          cacheRoot: join(userDataDir, '.agents', 'cache', 'builtin')
        })

        const artifactRoot = req.workspacePath ?? userDataDir
        const lock = await scanAllSkills(scopes)
        const { index } = await writeSkillArtifacts(artifactRoot, lock)
        skillState = { index, loadedSkills: prevLoadedSkills, turnCount: prevTurnCount, scannedWorkspacePath: req.workspacePath }
        conversationSkillStates.set(req.conversationId, skillState)
      } catch {
        // Don't cache a failed scan — mark scannedWorkspacePath as undefined so the next
        // turn will retry. Use an empty index for the current turn only.
        skillState = { index: { skills: [] }, loadedSkills: prevLoadedSkills, turnCount: prevTurnCount, scannedWorkspacePath: undefined }
        conversationSkillStates.set(req.conversationId, skillState)
      }
    }
    skillState.turnCount++

    // Inject available skill catalog so the model always knows which skills exist.
    const modelInvocableSkills = skillState.index.skills.filter((s) => s.modelInvocable)
    if (modelInvocableSkills.length > 0) {
      baseMessages.push({ role: 'system', content: buildSkillCatalogFromIndex(skillState.index) })
      console.log(`>>>> skill index: ${buildSkillCatalogFromIndex(skillState.index)}`);
    }

    // Detect explicit skill invocation in the latest user message.
    const lastUserMsg = [...req.messages].reverse().find((m) => m.role === 'user')
    let skillInjection: string | null = null
    let skillError: string | null = null
    let strippedLastUserContent: string | null = null

    if (lastUserMsg) {
      const { skillName, strippedMessage } = detectSkillInvocation(lastUserMsg.content)
      if (skillName) {
        strippedLastUserContent = strippedMessage || lastUserMsg.content
        const result = await loadSkill(
          skillName,
          skillState.index,
          skillState.loadedSkills,
          skillState.turnCount
        )
        if (result.ok) {
          skillInjection = result.content
        } else {
          skillError = result.reason
        }
      }
    }

    for (const m of req.messages) {
      const isLastUser = m === lastUserMsg && strippedLastUserContent !== null
      let content = isLastUser ? strippedLastUserContent! : m.content
      if (isLastUser && skillInjection) {
        content = skillInjection + '\n\n---\n\n' + content
      }
      baseMessages.push({ role: m.role as MLXChatMessage['role'], content })
      if (m.toolCalls) {
        for (const tc of m.toolCalls) {
          if (tc.result != null) {
            baseMessages.push({
              role: 'user',
              content: `<tool_result name="${tc.name}" status="ok">\n${tc.result}\n</tool_result>`
            })
          }
        }
      }
    }

    if (skillError) {
      emit({ type: 'token', text: `⚠️ ${skillError}\n\n` })
    }

    const ctx: ToolContext = {
      conversationId: req.conversationId,
      onFileChange: () => send('workspace:changed', { conversationId: req.conversationId })
    }

    const useTools = req.mode === 'code' || req.enableTools
    const maxRounds = req.mode === 'code' ? MAX_TOOL_ROUNDS_CODE : MAX_TOOL_ROUNDS_CHAT

    emit({ type: 'activity', activity: { kind: 'thinking', chars: 0 } })

    for (let round = 0; round < maxRounds; round++) {
      let buffer = ''
      let emittedIdx = 0
      let firstToken = true
      let executedAction = false
      let lastActivityTs = 0
      let pendingAction: { name: string; target?: string } | null = null

      // Live-write state for write_file streaming
      let livePath: string | null = null
      let liveContentStart = -1
      let lastLiveWrite = 0
      let livePending: Promise<unknown> | null = null
      let lastEmittedContent = ''
      const writeLivePartial = (): void => {
        if (!livePath || liveContentStart < 0 || livePending) return
        let partial = buffer.slice(liveContentStart)
        if (partial.startsWith('\n')) partial = partial.slice(1)
        const closeIdx = partial.indexOf('</content>')
        if (closeIdx >= 0) partial = partial.slice(0, closeIdx)
        const cleaned = cleanFileContent(partial, livePath)
        if (cleaned !== lastEmittedContent) {
          lastEmittedContent = cleaned
          send('file:streaming', {
            conversationId: req.conversationId,
            path: livePath,
            content: cleaned,
            done: false
          })
        }
        livePending = wsWriteFile(req.conversationId, livePath, cleaned)
          .then(() => {
            send('workspace:changed', { conversationId: req.conversationId })
          })
          .catch(() => {
            /* tolerate partial write failures */
          })
          .finally(() => {
            livePending = null
          })
      }

      const emitActivity = (): void => {
        const now = Date.now()
        if (now - lastActivityTs < 400) return
        lastActivityTs = now
        if (pendingAction) {
          emit({
            type: 'activity',
            activity: {
              kind: 'tool',
              tool: pendingAction.name,
              target: pendingAction.target,
              chars: buffer.length
            }
          })
        } else {
          emit({ type: 'activity', activity: { kind: 'generating', chars: buffer.length } })
        }
      }

      streamLoop: for await (const chunk of chatStream({
        model: req.model,
        messages: baseMessages,
        signal: abort.signal
      })) {
        if (chunk.content) {
          if (firstToken) {
            firstToken = false
            emit({ type: 'activity', activity: { kind: 'generating', chars: 0 } })
          }
          buffer += chunk.content

          // Forward raw token to devtools console for debugging
          mainWindow?.webContents.send('chat:raw', {
            conversationId: req.conversationId,
            chunk: chunk.content
          })

          // Detect if we've started an action (for activity label + live writes)
          if (!pendingAction) {
            const openMatch = buffer
              .slice(emittedIdx)
              .match(/<action\s+name\s*=\s*["']?([a-zA-Z_][\w]*)["']?\s*>/i)
            if (openMatch) {
              const name = openMatch[1]
              const rest = buffer.slice(emittedIdx + (openMatch.index ?? 0))
              const pathM = rest.match(/<path>([^<]+?)<\/path>/i)
              const urlM = rest.match(/<url>([^<]+?)<\/url>/i)
              const qM = rest.match(/<query>([^<]+?)<\/query>/i)
              const cmdM = rest.match(/<command>([^<\n]+)/i)
              pendingAction = {
                name,
                target: pathM?.[1] || urlM?.[1] || qM?.[1] || cmdM?.[1]
              }
            }
          } else if (!pendingAction.target) {
            const rest = buffer.slice(emittedIdx)
            const pathM = rest.match(/<path>([^<]+?)<\/path>/i)
            const urlM = rest.match(/<url>([^<]+?)<\/url>/i)
            const qM = rest.match(/<query>([^<]+?)<\/query>/i)
            const cmdM = rest.match(/<command>([^<\n]+)/i)
            const t = pathM?.[1] || urlM?.[1] || qM?.[1] || cmdM?.[1]
            if (t) pendingAction.target = t
          }

          // Live write_file streaming — create/update the file as <content> grows
          if (pendingAction?.name === 'write_file' && pendingAction.target && !livePath) {
            const livePermission = evaluateActionPermission(
              req,
              toolPermissionPolicy,
              'write_file',
              { path: pendingAction.target }
            )
            if (livePermission.mode === 'allow') {
              livePath = pendingAction.target
            }
          }
          if (livePath && liveContentStart < 0) {
            const idx = buffer.indexOf('<content>')
            if (idx >= 0) liveContentStart = idx + '<content>'.length
          }
          if (livePath && liveContentStart >= 0) {
            const now = Date.now()
            if (now - lastLiveWrite > 450) {
              lastLiveWrite = now
              writeLivePartial()
            }
          }

          emitActivity()

          while (true) {
            if (!useTools) {
              // No tool parsing: stream tokens as they arrive
              if (emittedIdx < buffer.length) {
                emit({ type: 'token', text: buffer.slice(emittedIdx) })
                emittedIdx = buffer.length
              }
              break
            }

            const found = findNextAction(buffer, emittedIdx)

            if (found === null) {
              // No action starting in the remaining buffer: emit safe text
              const safe = emitSafeBoundary(buffer, emittedIdx)
              if (safe > emittedIdx) {
                emit({ type: 'token', text: buffer.slice(emittedIdx, safe) })
                emittedIdx = safe
              }
              break
            }

            if (found === 'incomplete') {
              // Action has started but not closed. Emit text up to the open tag.
              const openIdx = buffer.indexOf('<action', emittedIdx)
              if (openIdx > emittedIdx) {
                emit({ type: 'token', text: buffer.slice(emittedIdx, openIdx) })
                emittedIdx = openIdx
              }
              break
            }

            // Emit any text between last emit and action start
            if (found.start > emittedIdx) {
              emit({ type: 'token', text: buffer.slice(emittedIdx, found.start) })
            }
            emittedIdx = found.end

            const call: ToolCall = {
              id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              name: found.name,
              args: found.args,
              running: true
            }
            emit({ type: 'tool_call', call })
            emit({
              type: 'activity',
              activity: { kind: 'tool', tool: found.name, target: actionTarget(found.name, found.args) }
            })

            let result = ''
            let hadError = false
            let shouldRunTool = true
            let allowOutsideWorkspace = false
            const permission = evaluateActionPermission(
              req,
              toolPermissionPolicy,
              found.name,
              found.args
            )
            if (permission.mode === 'deny') {
              result = `Permission denied for ${found.name}: ${permission.reason}`
              hadError = true
              shouldRunTool = false
              emit({ type: 'tool_result', id: call.id, error: result })
            } else if (permission.mode === 'ask') {
              const request: ToolPermissionRequest = {
                id: `perm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                conversationId: req.conversationId,
                toolCallId: call.id,
                toolName: found.name,
                args: found.args,
                mode: 'ask',
                target: actionTarget(found.name, found.args),
                reason: permission.reason,
                createdAt: Date.now()
              }
              emit({ type: 'tool_permission', request })
              const decision = await waitForToolPermission(request, abort.signal)
              if (decision === 'deny') {
                result = `Permission denied for ${found.name}: ${permission.reason}`
                hadError = true
                shouldRunTool = false
                emit({ type: 'tool_result', id: call.id, error: result })
              } else {
                allowOutsideWorkspace = permission.allowOutsideWorkspaceOnApproval === true
              }
            }

            try {
              if (shouldRunTool) {
                result = await runTool(found.name, found.args, {
                  ...ctx,
                  allowOutsideWorkspace
                })
                emit({ type: 'tool_result', id: call.id, result })
              }
            } catch (e) {
              result = `Error: ${(e as Error).message}`
              hadError = true
              emit({ type: 'tool_result', id: call.id, error: result })
            }

            baseMessages.push({ role: 'assistant', content: buffer.slice(0, emittedIdx) })
            baseMessages.push({
              role: 'user',
              content: `<tool_result name="${found.name}" status="${hadError ? 'error' : 'ok'}">\n${result}\n</tool_result>`
            })
            executedAction = true
            if (livePath) {
              send('file:streaming', {
                conversationId: req.conversationId,
                path: livePath,
                content: lastEmittedContent,
                done: true
              })
            }
            pendingAction = null
            livePath = null
            liveContentStart = -1
            lastEmittedContent = ''
            emit({ type: 'activity', activity: { kind: 'thinking', chars: 0 } })
            // Break out of the current stream — we need to start a new
            // request with the updated conversation including the tool result.
            break streamLoop
          }
        }
        if (chunk.done) {
          break streamLoop
        }
      }

      if (!executedAction) {
        // In Build mode, if the model just described a plan without writing code,
        // nudge it to start coding immediately instead of ending the turn.
        if (
          req.mode === 'code' &&
          round === 0 &&
          buffer.trim().length > 0 &&
          hasExplicitBuildIntent(req)
        ) {
          // Flush the plan text to the UI
          if (emittedIdx < buffer.length) {
            emit({ type: 'token', text: buffer.slice(emittedIdx) })
          }
          baseMessages.push({ role: 'assistant', content: buffer })
          baseMessages.push({
            role: 'user',
            content:
              'Good plan. Now start building — emit a write_file action with the first file immediately.'
          })
          emit({ type: 'activity', activity: { kind: 'thinking', chars: 0 } })
          continue // go to round 1
        }
        emit({ type: 'activity', activity: { kind: 'idle' } })
        emit({ type: 'done' })
        return
      }
    }
    emit({ type: 'activity', activity: { kind: 'idle' } })
    emit({
      type: 'error',
      error: `Reached max tool rounds (${maxRounds}). Ask the model to finish up and try again.`
    })
  } catch (e) {
    emit({ type: 'activity', activity: { kind: 'idle' } })
    if ((e as Error).name === 'AbortError') {
      emit({ type: 'done' })
    } else {
      emit({ type: 'error', error: (e as Error).message })
    }
  } finally {
    clearConversationPermissions(req.conversationId)
    chatAbortControllers.delete(req.conversationId)
  }
}

const chatAbortControllers = new Map<string, AbortController>()

interface ConversationSkillState {
  index: SkillIndex
  loadedSkills: LoadedSkillsRegistry
  turnCount: number
  /** workspacePath used in the last successful scan; undefined means re-scan is needed */
  scannedWorkspacePath: string | undefined
}
const conversationSkillStates = new Map<string, ConversationSkillState>()

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.ammaar.gemmachat')
  nativeTheme.themeSource = 'dark'

  // Set dock icon (macOS) — ensures the Gemma icon shows in dev mode
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(join(__dirname, '../../build/icon.png'))
    if (!dockIcon.isEmpty()) app.dock.setIcon(dockIcon)
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await startWorkspaceServer()

  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === 'media' || permission === 'mediaKeySystem') {
      callback(true)
      return
    }
    callback(false)
  })
  session.defaultSession.setPermissionCheckHandler(() => true)

  ipcMain.handle('setup:start', async (_e, model: string) => {
    await handleSetup(model)
  })

  ipcMain.handle('model:switch', async (_e, model: string) => {
    const label = AVAILABLE_MODELS.find((m) => m.name === model)?.label ?? model
    send('setup:status', {
      stage: 'downloading-model',
      message: `Switching to ${label}…`
    })
    try {
      await stopServer()
      if (!mlxPython) {
        throw new Error('MLX Python path not available. Please restart the app.')
      }
      await startServer(mlxPython, model, (p) => {
        send('setup:status', {
          stage: 'downloading-model',
          message: p.message,
          progress: p.progress
        })
      })
      send('setup:status', { stage: 'ready', message: 'Ready to chat.' })
    } catch (e) {
      send('setup:status', {
        stage: 'error',
        message: 'Model switch failed',
        error: (e as Error).message
      })
    }
  })

  ipcMain.handle('setup:status', async () => {
    const mlx = locateMLX()
    return { hasMLX: !!(mlx && mlx.installed) }
  })

  ipcMain.handle('models:list-local', async () => {
    return listLocalModels()
  })

  ipcMain.handle('project:select-folder', async () => {
    const options: Electron.OpenDialogOptions = {
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Use as Project'
    }
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('chat:send', async (_e, req: ChatRequest) => {
    const channel = `chat:stream:${req.conversationId}`
    handleChat(req, channel).catch((err) => console.error('chat handler error', err))
    return { channel }
  })

  ipcMain.handle('chat:abort', async (_e, conversationId: string) => {
    const c = chatAbortControllers.get(conversationId)
    if (c) c.abort()
  })

  ipcMain.handle('tools:list', async () => {
    return Object.values(TOOLS).map((t) => ({
      name: t.name,
      description: t.description,
      mode: t.mode
    }))
  })

  ipcMain.handle(SETTINGS_CHANNELS.GET_TOOL_LIST, async (): Promise<ToolInfo[]> => {
    return Object.values(TOOLS).map((t) => ({ name: t.name, description: t.description }))
  })

  ipcMain.handle(SETTINGS_CHANNELS.GET_WORKSPACE_ROOT, async (): Promise<string> => {
    return workspacesRoot()
  })

  ipcMain.handle(
    SETTINGS_CHANNELS.GET_PERMISSIONS,
    async (): Promise<Record<string, ToolPermissionValue>> => {
      return loadToolPermissionPolicy() as Promise<Record<string, ToolPermissionValue>>
    }
  )

  ipcMain.handle(
    SETTINGS_CHANNELS.SET_PERMISSION,
    async (_e, { tool, value }: { tool: string; value: ToolPermissionValue }): Promise<void> => {
      await saveToolPermission(tool, value)
    }
  )

  ipcMain.handle('tool-permission:respond', async (_e, response: ToolPermissionResponse) => {
    return { ok: resolveToolPermission(response) }
  })

  ipcMain.handle(
    'workspace:info',
    async (_e, req: { conversationId: string; workspacePath?: string }) => {
      registerConversationWorkspace(req.conversationId, req.workspacePath)
      await ensureWorkspace(req.conversationId)
      return {
        conversationId: req.conversationId,
        path: workspaceDir(req.conversationId),
        previewUrl: previewUrl(req.conversationId)
      }
    }
  )

  ipcMain.handle(
    'workspace:list',
    async (_e, req: { conversationId: string; workspacePath?: string }) => {
      registerConversationWorkspace(req.conversationId, req.workspacePath)
      const base = await ensureWorkspace(req.conversationId)
      return listTree(base, 300)
    }
  )

  ipcMain.handle(
    'workspace:open-external',
    async (_e, req: { conversationId: string; workspacePath?: string }) => {
      registerConversationWorkspace(req.conversationId, req.workspacePath)
      await ensureWorkspace(req.conversationId)
      shell.openPath(workspaceDir(req.conversationId))
    }
  )

  ipcMain.handle('workspace:server-port', async () => getWorkspaceServerPort())

  ipcMain.handle(
    'audio:transcribe',
    async (_e, { base64: _base64, model: _model }: { base64: string; model: string }) => {
      // Audio transcription via MLX is not yet supported
      // Return empty text so the UI doesn't break
      return { text: '' }
    }
  )

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // On macOS, keep the app alive in the dock so reopening is instant and the
  // MLX subprocess + workspace server stay warm. Only non-darwin platforms
  // quit on last-window-close.
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopServer()
  stopWorkspaceServer()
})
