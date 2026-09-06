# @okkly/resume-be

RAG agent that answers questions about Oleksii, grounded in his CV and personal notes.
Built on Mastra, with a libSQL vector store and a multi-provider model registry.

## Quick start

```bash
cp .env.example .env                       # fill in GOOGLE_GENERATIVE_AI_API_KEY at minimum
cp knowledge/cv.example.md       knowledge/cv.md          # your real CV — gitignored
cp knowledge/personal.example.md knowledge/personal.md    # your real notes — gitignored
pnpm install
pnpm ingest                               # embeds knowledge/*.md into the vector store
pnpm dev                                  # http://localhost:5300
```

`pnpm ingest` must run once before the agent can answer anything. Until then it honestly
says it doesn't know — `GET /status` reports `knowledgeBase: "missing"` so you can tell
the two apart.

The knowledge base is **private, operator-supplied input, like `.env`**. Only
`knowledge/*.example.md` templates are tracked; `knowledge/*.md` is gitignored and never
committed. The vector store is a derived artifact — always rebuildable from these files
with `pnpm ingest`, so keep them somewhere safe (a private repo, a secrets store, a
backup), not only inside the `.db`.

## How it works

```
knowledge/*.md
  └─ ingest ──> heading-aware chunks ──> Google embeddings ──> libSQL vector index
                                                                      │
POST /chat ──> Resume Agent ──> search-resume tool ───────────────────┘
                    │
                    └─ model chosen per request from MODELS
```

The agent is instructed to retrieve before answering and to say "I don't know" rather
than guess — for a CV, an invented job title or metric is worse than a non-answer.

## Endpoints

Custom routes live at the root, because Mastra reserves `/api/*` for its own built-in
agent endpoints (and serves its playground at `/`).

Interactive docs: **Swagger UI at `GET /swagger-ui`**, spec at `GET /api/openapi.json`
(enabled via `server.build` in `src/mastra/index.ts`). The three routes below are tagged
`resume`; everything else in the spec is Mastra's built-in surface.

### `GET /models`

Lists the model registry. `available` is false when the provider's API key is not set,
so the picker can disable it instead of failing on send.

```json
{
  "defaultModelId": "minimax-m3",
  "models": [
    {
      "id": "gemini-3.6-flash",
      "name": "Gemini 3.6 Flash",
      "description": "…",
      "provider": "google",
      "contextWindow": 1048576,
      "available": true
    }
  ]
}
```

### `POST /chat`

```json
{
  "messages": [
    { "role": "user", "content": "Where did he work in 2023?" },
    { "role": "assistant", "content": "Oleksii was Frontend Lead at Datasport…" },
    { "role": "user", "content": "And before that?" }
  ],
  "modelId": "gpt-oss-120b"
}
```

The endpoint is **stateless** — send the whole transcript so far, oldest first, with the
user's new question last (2000 chars max, 60 messages max). The frontend keeps this
history in `sessionStorage`; the backend stores nothing per conversation. `modelId` is
optional, must be a registry id, and defaults to `DEFAULT_MODEL_ID`.

Responds with `text/event-stream`. Each frame is one JSON object matching
`chatEventSchema` in `src/server/sse.ts`:

| Event       | Payload              | Meaning                                      |
| ----------- | -------------------- | -------------------------------------------- |
| `delta`     | `{ text }`           | A piece of the answer; concatenate in order. |
| `searching` | —                    | Retrieval started; show a spinner.           |
| `sources`   | `{ sources: [...] }` | Documents actually retrieved for the answer. |
| `done`      | —                    | Terminal. Answer complete.                   |
| `error`     | `{ message }`        | Terminal. Answer is incomplete.              |

Errors detectable before streaming starts (unknown model, missing provider key,
validation failure) come back as normal JSON with a 400/502/503 instead, so the client
can distinguish "never started" from "died halfway".

`fe` should import `chatEventSchema` to parse events with the same definition the server
writes them with.

### `GET /status`

`200` when the index exists and holds vectors; `503` with a hint when it doesn't.

## Editing the knowledge base

Edit or add markdown files in `knowledge/` (real files are gitignored — `*.example.md`
are just templates, and `pnpm ingest` skips them), then re-run `pnpm ingest`. Ingest
drops and rebuilds the index each time — editing a file changes chunk boundaries, so an
in-place upsert would leave orphaned chunks that still match queries and get cited as
fact.

Structure files with headings. Each section becomes a chunk carrying its heading
breadcrumb, so a passage under "Experience > <Company>" still matches "where did they
work in 2023?" even though the employer name appears only in the heading.

## Adding a model

Add an entry to `MODELS` in `src/config/models.ts`. If it uses a provider that already
exists, that is the only change — `modelIdSchema`, `/models`, and request validation all
derive from that array. A new provider also needs a client and a `case` in
`src/config/providers.ts`, plus its key in `env.ts`.

## Notes on the implementation

Two places deviate from the obvious approach, both deliberately:

- **Chunking is hand-rolled** (`src/rag/knowledge.ts`) rather than using
  `MDocument.chunk({ strategy: 'markdown' })`. That strategy in `@mastra/rag@2.6.0`
  rewrites every `##` in its output as the literal string `#{1,6}` — its splitting regex
  leaking into the text. Embedding that degrades retrieval and the agent quotes it back
  to visitors. Worth re-testing on upgrade.
- **Embeddings call the AI SDK directly** (`src/rag/embedder.ts`) instead of using
  `createVectorQueryTool`. That tool's `MastraEmbeddingModel` type accepts only spec
  v1–v3 embedding models, and `@ai-sdk/google@4` emits v4. Going direct also lets the
  retrieval tool own a zod-validated output shape and a relevance floor.

Queries are embedded with `taskType: RETRIEVAL_QUERY` and documents with
`RETRIEVAL_DOCUMENT`. That asymmetry matters: without it, short questions and long CV
paragraphs land in noticeably different regions of the embedding space.

## Docker

Two compose files, both with a real **libSQL server** container for the vector store (no
code change — just `VECTOR_DB_URL=http://libsql:8080`).

### Dev — `docker-compose.dev.yml` (one command, hot reload)

```bash
cd ..                                             # repo root
cp be/.env.example be/.env                        # fill GOOGLE_GENERATIVE_AI_API_KEY
cp be/knowledge/cv.example.md       be/knowledge/cv.md         # your real content,
cp be/knowledge/personal.example.md be/knowledge/personal.md   # both gitignored
docker compose -f docker-compose.dev.yml up --build
docker compose -f docker-compose.dev.yml --profile ingest run --rm ingest
```

`be` runs `mastra dev`, `fe` runs Vite. `{be,fe}/src` is bind-mounted, so edits there
hot-reload — Vite in ~seconds, `mastra dev` in ~30–50s (its own rebundle + restart).
Polling is on (`CHOKIDAR_USEPOLLING` / `VITE_DEV_CONTAINER`) because Docker Desktop
doesn't forward file events across a bind mount. `node_modules` live in the image; adding
a dependency means re-running with `--build`.

Both services build from the app Dockerfiles' `dev` stage — there is no separate dev
image.

### Deploy — `ops/docker-compose.yml`

The VPS stack. Images come from ghcr instead of being built, nothing is published to the
internet, and both containers join `vps-infra_default` so the root Caddy reaches them as
`resume-be:5300` and `resume-fe:80`. Shipped by `.github/workflows/deploy.yml`.

Ingest does not run there: the `runtime` stage carries no sources and no `tsx`, and
`knowledge/*.md` is gitignored anyway. libSQL is published on loopback only so you can
fill the index from your machine through an SSH tunnel — see the file header.

### Why storage isn't on the libSQL server

Conversation state (`STORAGE_DB_URL`) stays on the embedded driver on a separate volume:
`@mastra/libsql` runs its schema init in parallel, which the libSQL server's hrana
protocol rejects with `SQLITE_SCHEMA` on first boot. Only the storage path does that — the
vector store's single `CREATE TABLE` is fine against the server.

## Deployment

`pnpm build` bundles to `.mastra/output`; `pnpm start` runs it. For a real deployment
point `VECTOR_DB_URL` at a libSQL server or Turso (`libsql://…` plus auth token), keep
`STORAGE_DB_URL` on a persistent volume or Turso, and set `CORS_ORIGINS` to the real
frontend origin.

**Set `TRUST_PROXY=true` if — and only if — a reverse proxy sits in front and sets
`X-Forwarded-For`.** The per-IP limit on `/chat` (`CHAT_RATE_LIMIT`, 40 requests a minute
by default) reads that header only under this flag. Behind a proxy without it, every
visitor shares the proxy's address and the limit throttles them collectively; exposed
directly with it on, the header is caller-supplied and the limit can be bypassed by
sending a fresh value per request.

The limiter's counters live in this process's memory, so they are per-instance: running
two replicas doubles the effective allowance, and a restart forgets the window.
