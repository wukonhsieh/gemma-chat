# Project Plan — Agent Skills Lightweight Runtime (MVP v1)

## Overview

實作 Gabie app 的 Agent Skills Runtime MVP v1。
分為四個階段：資料層、掃描引擎、呼叫偵測與注入、整合與串接。

---

## Task 1 — 定義 Skill 資料型別與 lock file schema

**目標：** 建立 TypeScript types 與 JSON schema，供後續所有 tasks 使用。

**產出：**
- `src/main/skills/types.ts`
  - `SkillFrontmatter`、`SkillMetadata`、`SkillsLockFile` type definitions
- `src/shared/types.ts`（擴充）
  - 新增 `SkillIndexEntry`、`SkillCatalogEntry` 供 renderer 使用（預留）

**涵蓋 FR：** FR-2, FR-3, FR-4

---

## Task 2 — 實作 Skill Scanner（scan + frontmatter parse + sha256）

**目標：** 掃描 `.agents/skills/*/SKILL.md`，讀取 frontmatter，計算 sha256，寫入 skills.lock.json。

**產出：**
- `src/main/skills/scanner.ts`
  - `scanSkills(projectRoot: string): Promise<SkillsLockFile>`
  - 讀取 SKILL.md frontmatter（使用 gray-matter 或自製 YAML parser）
  - 計算 sha256（Node.js crypto）
  - 比對 cache，只更新有變動的 skills
  - 寫入 `<project>/.agents/cache/skills.lock.json`

**依賴：** Task 1
**涵蓋 FR：** FR-1, FR-2, FR-3, FR-4

---

## Task 3 — 產生 skill-index.json / skill-catalog.yaml / skill-ui-index.json

**目標：** 從 skills.lock.json 產生三個輸出檔案。

**產出：**
- `src/main/skills/indexer.ts`
  - `buildSkillIndex(lock: SkillsLockFile): SkillIndex`
  - `buildSkillCatalog(lock: SkillsLockFile): string`（YAML string）
  - `buildSkillUiIndex(lock: SkillsLockFile): SkillUiEntry[]`
  - 寫入 `<project>/.agents/cache/` 目錄

**依賴：** Task 2
**涵蓋 FR：** FR-5

---

## Task 4 — 實作 Skill Detector（解析 user message 中的 $skill-name）

**目標：** 從 user message 中偵測 `$skill-name` pattern，回傳 skill name 與剩餘 message text。

**產出：**
- `src/main/skills/detector.ts`
  - `detectSkillInvocation(message: string): { skillName: string | null; strippedMessage: string }`
  - 支援 `$skill-name` 在開頭或 inline 的情況
  - 回傳 stripped message（移除 `$skill-name` 後的純文字）

**依賴：** Task 1
**涵蓋 FR：** FR-6

---

## Task 5 — 實作 Skill Loader（檢查 policy + 載入 SKILL.md 內容）

**目標：** 根據 skill name 從 index 找到 skill，檢查 `user-invocable`，載入完整 SKILL.md，組成 injection block。

**產出：**
- `src/main/skills/loader.ts`
  - `loadSkill(skillName, index, projectRoot, loadedSkills): Promise<SkillLoadResult>`
  - `SkillLoadResult`: `{ ok: true; content: string } | { ok: false; reason: string }`
  - 檢查 `user_invocable`（FR-8）
  - 若找不到回傳 not-found reason（FR-11）
  - 注入 header（FR-10）：`Skill: <name>\nHash: <source_hash>\n\n<SKILL.md content>`
  - 記錄已載入的 skills，同 session 內不重複載入（FR-13）

**依賴：** Task 3, Task 4
**涵蓋 FR：** FR-7, FR-8, FR-9, FR-10, FR-11, FR-13

---

## Task 6 — 整合至 main process chat flow

**目標：** 在 `src/main/index.ts` 的 chat handler 中串接 lazy scan、skill detection、skill injection。

**產出：**
- 修改 `src/main/index.ts`
  - 在 session 第一個 user message 時呼叫 `scanSkills()`
  - 每個 user message 呼叫 `detectSkillInvocation()`
  - 若偵測到 skill，呼叫 `loadSkill()` 並將結果注入 messages array
  - 若 skill not found，在 assistant message 前插入錯誤提示（FR-11）
  - 若無 skill invocation，正常流程（FR-12）

**依賴：** Task 2, Task 3, Task 4, Task 5
**涵蓋 FR：** FR-1, FR-6 ~ FR-13

---

## Task 7 — 安裝 frontmatter 解析套件並確認 build

**目標：** 確認 gray-matter（或輕量替代）可在 Electron main process 正常使用，並通過 TypeScript build。

**產出：**
- 安裝 `gray-matter`（若適用）
- 確認 `tsconfig.node.json` 涵蓋 `src/main/skills/`
- `npm run build` 無錯誤

**依賴：** Task 2（先行確認再實作）

---

## Execution Order

```
Task 7（確認依賴）
  → Task 1（types）
  → Task 2（scanner）
  → Task 3（indexer）
  → Task 4（detector）
  → Task 5（loader）
  → Task 6（整合）
```

---

## 不在此 iteration 範圍

- UI autocomplete（`$` trigger in Composer）
- Passive invocation（router 判斷）
- Indexer LLM（enriched metadata）
- Global / builtin skill scopes
- Risk-based confirmation dialog
