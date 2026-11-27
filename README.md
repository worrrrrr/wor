# Wor

A local-first AI workspace for chat, agents, projects, and model providers. Built with SvelteKit, Svelte 5, Tailwind CSS 4, and the Vercel AI SDK. Conversations and settings are stored in SQLite on this machine.

## What it does

- **Projects** group related sessions and carry shared instructions into every conversation.
- **Sessions** are chats or agents. Chat is conversational; Agent can call tools and show each step.
- **Model picker** covers local Ollama models, Groq and Google when API keys are present, and any OpenAI-compatible endpoint you add.
- **Provider settings** store API keys encrypted with AES-256-GCM. Stored keys are never sent back to the browser.
- **Streaming** responses arrive as NDJSON: text, reasoning, tool calls, usage, and stop state.
- **Attachments** accept images and text files, with size and count limits.
- **Markdown** renders with syntax highlighting, per-code-block copy, and copy-whole-chat as Markdown.
- **Light, dark, and system themes** with a responsive sidebar and mobile drawer.
- **Local persistence** keeps sessions and messages in `app/local.db`.

Agent tools:

| Tool | Purpose |
| --- | --- |
| `calculate` | Exact arithmetic via a small recursive-descent parser |
| `astrology` | Natal chart through the optional local `astro.py` engine |
| `current_time` | Time in a requested timezone |
| `web_fetch` | Fetch a public page, with private-network blocking |

## Requirements

- Bun 1.3+
- Ollama running locally for local models
- Python 3 only if you want the `astrology` tool

## Setup

```bash
cd app
bun install
cp .env.example .env
bun run db:migrate
bun run dev
```

Open <http://localhost:5173/project>. The root path redirects to `/project`; `/chat` and `/agent` start new sessions.

For local models:

```bash
ollama serve
ollama pull lfm3:1.7b
```

Cloud models are optional. Add `GROQ_API_KEY` or `GEMINI_API_KEY` to `app/.env`, or configure a custom OpenAI-compatible provider under **Settings → Model providers**.

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `local.db` | SQLite file, relative to `app/` |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama endpoint |
| `GROQ_API_KEY` | none | Enables Groq models |
| `GEMINI_API_KEY` | none | Enables Google models |
| `BODY_SIZE_LIMIT` | `12M` | Maximum request body |
| `WOR_SECRET` | generated | 32-byte key (64 hex or base64) for provider keys |
| `ASTRO_SCRIPT` | `~/skills/astro/scripts/astro.py` | Optional astrology engine override |
| `PYTHON` | `python` / `python3` | Optional Python override |

Without `WOR_SECRET`, the server creates `app/.wor-secret` with owner-only permissions. It is gitignored; back it up if you want encrypted provider keys to survive a reinstall.

## Architecture

```text
app/
  drizzle/                     SQL migrations
  src/
    app.html                   theme bootstrap before paint
    routes/
      +layout.svelte           shell, sidebar, settings, toasts
      +page.server.ts          redirect / -> /project
      layout.css               all design tokens and component styles
      project/                 project list and project detail
      chat/                    new chat, [id] conversation
      agent/                   new agent
      api/chat/                streaming endpoint (NDJSON)
    lib/
      chat/types.ts            shared message and model types
      components/              Sidebar, ChatView, Composer, MessageItem, SettingsDialog, ...
      remote/                  SvelteKit remote functions
        models.remote.ts
        conversations.remote.ts
        projects.remote.ts
        providers.remote.ts
      server/
        db/                    Drizzle schema and SQLite client
        chat-stream.ts         validation, history, prompt, stream, persistence
        conversations.ts       session CRUD and message storage
        projects.ts            project CRUD
        providers.ts           custom provider CRUD, discovery, model mapping
        secrets.ts             AES-256-GCM provider-key encryption
        models.ts              model catalogue and resolution
        tools/                 calculate, astrology, current_time, web_fetch
      stores/                  runes-based client state
```

CRUD and provider settings use SvelteKit **remote functions** (`query` and `command`). Chat streaming stays on `POST /api/chat` with NDJSON because a token stream is an ordered event log, not a replaceable query value; the endpoint also has write side effects that belong in a command-style request.

## Scripts

Run these from `app/`.

| Script | Action |
| --- | --- |
| `bun run dev` | Vite dev server |
| `bun run build` | Production build (adapter-bun) |
| `bun run start` | Serve the build with Bun |
| `bun run check` | Svelte and TypeScript diagnostics |
| `bun run format` | Prettier |
| `bun run db:generate` | Generate a migration from the schema |
| `bun run db:migrate` | Apply migrations |
| `bun run db:studio` | Drizzle Studio |

Production:

```bash
cd app
bun run build
PORT=3001 ORIGIN=http://localhost:3001 bun run start
```

## Limits and behaviour

- Single-user and unauthenticated. Do not expose it to an untrusted network without putting authentication in front.
- Attachments: up to 8 files. Images up to 5 MB each and only for vision models. Text up to 20,000 characters.
- History sent to the model: the last 24 messages or roughly 60,000 characters.
- `web_fetch` accepts only `http` and `https`, blocks loopback and private ranges, and strips scripts, navigation, and footers.
- Small local models can call tools unreliably. Use a model that supports tool calling for Agent mode.
- The `astrology` tool needs the optional engine at its path; without it the tool returns an error instead of a chart.
- Provider discovery filters obvious embedding and reranker model names. You can always edit the model list manually.
