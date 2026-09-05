# @okkly/resume-fe

The chat UI for `@okkly/resume-be` — a Vite SPA (no Next, no SSR). Ask questions about
Oleksii; answers stream in from the backend's RAG agent, grounded in his CV.

## Quick start

Everything in one command via the dev compose (`../docker-compose.dev.yml`):

```bash
cd .. && cp be/.env.example be/.env   # fill GOOGLE_GENERATIVE_AI_API_KEY
docker compose -f docker-compose.dev.yml up --build
docker compose -f docker-compose.dev.yml --profile ingest run --rm ingest
# → http://localhost:5173   (Vite HMR; edits under fe/src hot-reload)
```

Or run the servers directly:

```bash
cd ../be && cp .env.example .env   # then: pnpm ingest && pnpm dev
cd ../fe && pnpm dev               # http://localhost:5173
```

Dev needs the backend on `:5300`. Vite proxies `/be/*` there (`vite.config.ts`), so the
app is single-origin and CORS never applies. `VITE_API_TARGET` repoints the proxy (the
dev container sets it to `http://be:5300`); for a production build set `VITE_API_BASE_URL`
to the backend's public origin (which must be in the backend's `CORS_ORIGINS`).

## Stack

| Concern             | Choice                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework           | React 19 + Vite, SPA only                                                                                                                                          |
| Global client state | `jotai` — transcript, model pick, streaming flag, menu state (`src/state/atoms.ts`)                                                                                |
| Server state        | `@tanstack/react-query` — `/models`, `/status`, and the chat send (a `useMutation` that drives the stream)                                                         |
| Chat transport      | the backend's custom SSE protocol, parsed by hand (`src/api/chat.ts`); the Vercel AI SDK (`ai`) supplies message-shape helpers only                                |
| History             | the visitor's `sessionStorage` — the single source of truth. Survives reload, gone on tab close. The backend is stateless; every turn replays the whole transcript |
| UI                  | `@okkly/react` + `@okkly/design-system` (dark tokens) + co-located `*.module.scss`                                                                                 |

## How a turn flows

```
send(text)                                  src/hooks/useChat.ts
  ├─ append user msg + streaming placeholder to messagesAtom
  ├─ useMutation → streamChat({ messages, modelId, signal })   src/api/chat.ts
  │     POST /be/chat  →  text/event-stream
  │     ├─ searching  → placeholder shows "Searching the CV…"
  │     ├─ delta      → text appended token by token
  │     ├─ sources    → "Grounded in" chips (server-derived, not model-claimed)
  │     ├─ done       → finalise
  │     └─ error      → terminal; StreamError with Try again (+ Switch model on 503)
  └─ Stop aborts and keeps the partial answer
```

`error` and `done` are mutually exclusive terminals — a `done` arriving after an `error`
is ignored, so a failed answer never renders blank.

## States (from the Figma)

- **Empty** — hero + starter prompts (`EmptyState`)
- **Conversation** — user/assistant bubbles, tiny Markdown renderer (`MessageText`: `**bold**`, `` `code` ``, `-` lists, paragraphs)
- **Streaming** — "thinking" dots → "Searching the CV…" → text with a caret
- **Error** — inline notice with retry / switch-model (`StreamError`)
- **Model menu** — popover from `/models`; unavailable models (no provider key) are disabled (`ModelPicker`)

A thin banner appears while the backend reports the knowledge base isn't ingested yet.

## Scripts

`pnpm dev` · `pnpm build` · `pnpm preview` · `pnpm typecheck` · `pnpm lint`
