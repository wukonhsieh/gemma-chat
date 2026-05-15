# Requirements Spec — Agent Skills Lightweight Runtime (MVP v1)

## Project Summary

### 簡述
在 Gabie（Electron + React + TypeScript）app 中加入 Agent Skills Runtime，
讓 app 可以掃描 `.agents/skills/` 目錄下的 skills，並在使用者明確以
`$skill-name` 呼叫時，將該 skill 的完整 SKILL.md 載入聊天 context 中。

### 目標
- 不把所有 SKILL.md 全塞進 system prompt
- 支援 explicit invocation（`$skill-name`）
- 被選中的 skill 才載入完整內容
- 建立輕量的 skill-index.json / skill-catalog / skill-ui-index.json 作為基礎
- 為後續 v2（Indexer LLM）與 v3（Router LLM / embedding）預留架構空間

### 假設
- MVP v1 不做 UI autocomplete
- MVP v1 不做 passive invocation（router 判斷）
- MVP v1 不做 Indexer LLM，只讀取 frontmatter
- Skills 只來自 project scope：`<project>/.agents/skills/`
- Skill frontmatter 至少有 `name` 與 `description`；其他欄位為 optional
- 高風險欄位（disable-model-invocation）如不存在，預設允許模型呼叫

## User Requirements

- 使用者需要能在聊天輸入框中輸入 `$skill-name` 來明確呼叫某個 skill
- 使用者需要 app 在收到第一句 user message 時自動掃描並更新 skill index
- 使用者需要 skill 的完整指令只在明確呼叫時才被注入 LLM context
- 使用者需要 SKILL.md 異動時，下次對話能自動反映最新版本

## Use Cases

### Use Case 1 — 明確呼叫 skill
- Actor: 使用者
- Trigger: 在 Composer 輸入 `$write-requirements-spec 幫我整理這個功能的需求`
- Outcome: app 辨識出 skill 名稱，載入完整 SKILL.md，注入 context，LLM 以 skill 指令回應

### Use Case 2 — Lazy Scan on First Message
- Actor: 系統
- Trigger: 使用者送出對話的第一句 message
- Outcome: app 掃描 `.agents/skills/*/SKILL.md`，產生 skill-index.json，
  對未變更的 skill（sha256 相同）沿用 cache

### Use Case 3 — Skill 內容異動後自動更新
- Actor: 使用者（開發者）
- Trigger: 修改某個 SKILL.md 後，下次開啟對話
- Outcome: app 偵測到 source_hash 不同，重新讀取 frontmatter，更新 skill-index.json

### Use Case 4 — 呼叫不存在的 skill
- Actor: 使用者
- Trigger: 輸入 `$unknown-skill 做什麼事`
- Outcome: app 回報找不到該 skill，不注入任何額外內容，聊天繼續正常進行

## Functional Requirements

1. The system shall scan `<project>/.agents/skills/*/SKILL.md` on the first user message of each session.
2. The system shall compute sha256 of each SKILL.md and compare against cached value in `<project>/.agents/cache/skills.lock.json`.
3. The system shall extract frontmatter fields: `name`, `description`, `summary`（optional）, `user-invocable`（optional, default true）, `disable-model-invocation`（optional, default false）, `risk`（optional）, `triggers`（optional）.
4. The system shall write updated metadata to `<project>/.agents/cache/skills.lock.json`.
5. The system shall generate `skill-index.json`, `skill-catalog.yaml`, and `skill-ui-index.json` from the lock file.
6. The system shall parse user message input to detect the pattern `$<skill-name>` at the start or inline.
7. The system shall look up the detected skill name in skill-index.
8. The system shall check `user-invocable` before loading; if false, the skill shall not be loaded via explicit user call.
9. The system shall load the full SKILL.md content and inject it into the LLM context when the skill check passes.
10. The system shall prepend a skill header when injecting: skill name and source_hash.
11. The system shall respond with a clear error message if the skill name is not found in skill-index.
12. The system shall not load any SKILL.md into context if no explicit `$skill-name` is detected.
13. The system shall avoid re-loading the same skill full content twice in the same session.

## Technical Specifications

- Programming Language: TypeScript
- Framework: Electron + React (Vite + electron-vite)
- Runtime / Platform: macOS（Electron main process + renderer process）
- Skill Root: `<project>/.agents/skills/`
- Cache Location: `<project>/.agents/cache/skills.lock.json`
- Skill Detection: string parsing in main process before sending to MLX
- Skill Injection Point: main process，注入至 chatStream 的 messages array（system 或首個 user message 之前）
- sha256: Node.js built-in `crypto` module
- Assumptions / Notes:
  - v1 不使用 LLM 產生 enriched metadata，只讀 frontmatter
  - 若 frontmatter 缺少 `summary`，以 `description` 代替
  - skill-catalog 與 skill-ui-index 在 v1 產生但主要供後續版本使用
