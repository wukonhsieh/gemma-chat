<p align="center">
  <img src="gemma-extruded-app.png" alt="Gabie" width="180" />
</p>

<h1 align="center">Gabie</h1>

<p align="center">
  <strong>你身邊的 AI 小幫手。</strong><br/>
  一個使用 local LLM 的極輕量 Agent 工具，可調用 Tools、Skills、MVC，幫你處理日常雜事。<br/>
  No API keys. No cloud. No Wi-Fi required.
</p>

---

> **注意：** local LLM 會出錯。本專案計劃對可使用的模型做基本安全性測試，在那之前請小心使用。目前有基本存取限制 & 限制存取 project 資料夾，但完成完整測試前先謹慎使用。

---

## 這是什麼？

Gabie 是從 [gemma_chat](https://github.com/ammaarreshi/gemma-chat-public) fork 出來的專案，目標是成為一個使用 local LLM 的 Agent 小幫手。

由於多數的 Agent IDE 的 tool schema 過大，不適合 local 小型 LLM 使用，這個專案希望能成為一個極輕量的 LLM Agent Tool，可以調用 Tools、Skills、MVC，幫助處理日常雜事，是你身邊的小幫手。

<img width="960" height="593" alt="Gabie screenshot" src="https://github.com/user-attachments/assets/b4149e63-48df-456e-8007-c607b7d46f37" />

## Features

- 🛠 **Build Mode** — Coding agent with a live preview canvas. Writes multi-file projects into a sandboxed workspace.
- 💬 **Chat Mode** — Conversational AI with tool use (web search, URL fetch, calculator, bash).
- 🔄 **Model Switching** — Hot-swap between Gemma variants on the fly.
- 🎤 **Voice Input** — Local speech-to-text via in-browser Whisper.
- ✈️ **Works Offline** — After the one-time model download, everything runs without internet.
- 💾 **Zero Config** — Python venv + MLX runtime auto-provisions on first launch.

## Available Models

| Model | Size | Best For |
|---|---|---|
| Gemma 4 E2B | ~1.5 GB | Fast Q&A, simple tasks |
| **Gemma 4 E4B** | **~3 GB** | **Recommended.** Speed + capability balance |
| Gemma 4 27B MoE | ~8 GB | Stronger reasoning (needs 16 GB+ RAM) |
| Gemma 4 31B | ~18 GB | Maximum quality (needs 32 GB+ RAM) |

## Getting Started

**Requirements:** macOS on Apple Silicon, Python 3.10–3.14, Node 20+.

```bash
git clone https://github.com/ammaarreshi/gemma-chat-public.git
cd gemma-chat-public
npm install
npm run dev
```

First launch will auto-detect Python → create a venv → install MLX-VLM → download the model (~3 GB) → ready to go.

### Building a Distributable

```bash
npm run dist
```

Produces a signed `.dmg` in `dist/`.

## Tech Stack

| Layer | Tech |
|---|---|
| App Shell | Electron + Vite + React 19 + TypeScript + Tailwind |
| Model Runtime | MLX-VLM (auto-installed into a local venv) |
| Speech-to-Text | transformers.js (Whisper, runs in-browser via WASM) |
| Workspace | Per-conversation sandboxed filesystem + local HTTP server |

## Architecture

```
src/
├── main/              Electron main process
│   ├── index.ts       Window + IPC + agent loop
│   ├── mlx.ts         MLX-VLM venv install / server lifecycle / chat streaming
│   ├── workspace.ts   Per-conversation workspace + static file server
│   └── tools.ts       Tool definitions + system prompts + XML action parser
├── preload/           contextBridge API surface
├── renderer/src/
│   ├── components/
│   │   ├── Setup.tsx      First-run onboarding + download progress
│   │   ├── Chat.tsx       Main layout + model switcher
│   │   ├── Canvas.tsx     Preview / Code / Files tabs (Build mode)
│   │   ├── Message.tsx    Chat bubbles + tool cards + activity bar
│   │   ├── Composer.tsx   Input + mic button
│   │   └── Sidebar.tsx    Conversation list
│   └── lib/whisper.ts     Browser Whisper pipeline
└── shared/types.ts    IPC types + model registry
```

## Credits

- [gemma_chat](https://github.com/ammaarreshi/gemma-chat-public) by [@ammaar](https://x.com/ammaar) — the upstream project this is forked from
- [Gemma](https://ai.google.dev/gemma) by Google DeepMind
- [MLX](https://github.com/ml-explore/mlx) by Apple Machine Learning Research
- [transformers.js](https://github.com/huggingface/transformers.js) by Hugging Face

## License

MIT
