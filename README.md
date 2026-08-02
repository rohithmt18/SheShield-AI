# SheShield AI

An AI-powered platform for detecting, supporting, and reporting cyber harassment against women.

Most platforms give you a report button and nothing else. SheShield AI is the part that comes
after: it reads the messages someone has been sent, says plainly how serious they are, stays with
her while she decides what to do, and turns the evidence into a report she can actually file.

---

## What it does

| | |
|---|---|
| **Threat detection** | Per-message severity scoring (0–100) across 11 harm categories — harassment, sexual harassment, threats, stalking, grooming, doxxing, sextortion, non-consensual imagery, impersonation, hate speech, financial exploitation. Detects escalation and names the behavioural pattern. |
| **Anonymous companion** | A trauma-informed chat companion. No account, no name. Crisis language (self-harm, immediate danger) is intercepted **before** the model and answered with helplines directly. |
| **Incident reports** | Flagged excerpts, timeline, and classifications compiled into a structured PDF for cybercrime.gov.in, a Cyber Crime Cell, or a platform's trust & safety team. |
| **Guided reporting** | Helplines, portals, and NGOs routed by incident type *and* state — the Bengaluru CEN station, not a generic list. Plus an evidence-preservation checklist. |

### Design decisions worth knowing

- **It works without the AI.** No API key, quota exhausted, or Gemini unreachable → an offline
  heuristic engine still scores messages, the scripted responder still supports her, and the
  rule-based builder still produces a filable PDF. Support never goes dark; the UI says which
  engine ran.
- **Anonymous by construction.** No login, because there is nothing to log in to. The session id is
  the only handle, lives in `sessionStorage`, and expires. Rate-limiter keys are hashed IPs.
- **Quick exit.** Escape ×3 (or the button) wipes local state and replaces the history entry, so
  Back doesn't return here.
- **Flagged text starts blurred.** Re-reading abuse is re-living it; she chooses when.
- **Nothing is invented.** Report fields she didn't supply render as `[not provided]`, never guessed.

---

## Stack

**Frontend** React 19 · Vite · Tailwind CSS v4 · shadcn/ui · Aceternity-style hero & animations ·
Magic UI-style dashboard motion · Framer Motion
**Backend** Node 20+ · Express 5 · Groq or Google Gemini (swappable) · PDFKit
**Database** MongoDB Atlas, with JSON-file and in-memory adapters behind one interface

---

## Layout

```
sheshieldai/
├── database/                  # @sheshieldai/database — shared data layer
│   └── src/
│       ├── taxonomy.js        # categories, severity levels — the shared vocabulary
│       ├── schema.js          # document shapes + normalisation of AI output
│       ├── index.js           # adapter selection, session resolution, retention
│       └── adapters/          # mongo · jsonFile · memory (same interface)
│
├── backend/                   # @sheshieldai/backend — API
│   ├── src/
│   │   ├── config.js
│   │   ├── index.js           # Express app, CORS, error handling, shutdown
│   │   ├── middleware/        # hashed-IP rate limiting
│   │   ├── providers/         # index.js (selection) · groq.js · gemini.js
│   │   │                      # prompts.js (shared) · heuristic.js (offline)
│   │   ├── routes/            # session · analyze · chat · report
│   │   └── services/          # parse · analyze · chat · report · pdf · resources
│   └── test/smoke.mjs         # 17 tests, no key or network needed
│
└── frontend/                  # @sheshieldai/frontend — React app
    └── src/
        ├── lib/               # api client, session handling, AppContext
        ├── components/
        │   ├── ui/            # shadcn primitives
        │   ├── aceternity/    # aurora background, spotlight, text reveal
        │   ├── magic/         # number ticker, shine border, bento grid
        │   └── layout/        # navbar, footer, quick exit
        └── pages/             # Landing · Dashboard · Analyze · Companion · Report · Resources
```

---

## Running it

Requires Node 20+.

```bash
npm install
cp backend/.env.example backend/.env    # optional — it runs without this
npm run dev
```

- Frontend → http://localhost:5273
- API → http://localhost:5050

`npm run dev` starts both. Vite proxies `/api` to the backend, so there is no CORS setup in dev.

### Configuration

Everything in `backend/.env` is optional. With an empty file you get the offline engine and
in-memory storage — the whole app still works.

| Variable | Default | Notes |
|---|---|---|
| `AI_PROVIDER` | auto | `groq` or `gemini`. Unset → whichever key is present, Groq first. |
| `GROQ_API_KEY` | — | Free key at [console.groq.com/keys](https://console.groq.com/keys). |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Any Groq chat model. |
| `GEMINI_API_KEY` | — | Free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). |
| `GEMINI_MODEL` | `gemini-3.6-flash` | `gemini-2.5-flash` is retired for new keys. `gemini-flash-latest` always tracks the newest. |
| `MONGODB_URI` | — | Atlas free M0. Falls back to `DATA_FILE` if unreachable. |
| `DATA_FILE` | `./.data/sessions.json` | Set empty to force in-memory. |
| `RETENTION_DAYS` | `7` | Sessions deleted this long after last activity (Mongo TTL index). |
| `PORT` | `5050` | |
| `CORS_ORIGIN` | `http://localhost:5273` | Comma-separated. |

Storage priority: `MONGODB_URI` → `DATA_FILE` → in-memory.

### Tests

```bash
npm test
```

17 tests covering the parser, the offline classifier, region routing, every endpoint, and PDF
generation. They force the offline path, so they need no API key and no network.

---

## API

| Method | Endpoint | |
|---|---|---|
| `GET` | `/health` | Storage backend and AI availability |
| `GET` | `/api/meta` | Categories, levels, regions, helplines |
| `POST` | `/api/session` | Create or resume an anonymous session |
| `GET` `DELETE` | `/api/session/:id` | Fetch, or erase everything held |
| `POST` | `/api/analyze` | Score a conversation (raw text or structured messages) |
| `POST` | `/api/analyze/preview` | Parse without scoring |
| `POST` | `/api/chat` | Companion reply |
| `GET` `DELETE` | `/api/chat/:sessionId` | Transcript, or clear it |
| `POST` | `/api/report` | Build an incident report |
| `GET` | `/api/report/:sessionId` | Fetch the report |
| `GET` | `/api/report/:sessionId/pdf` | Download it as PDF |
| `GET` | `/api/resources` | Directory filtered by category, level, region |

---

## Scope and honesty

**Ingestion.** The problem statement describes continuously monitoring connected social accounts.
Meta, X, and Google do not expose another person's DMs to third-party apps, so that would require
platform partnerships rather than OAuth. What is built is the same detection pipeline against
**paste and file upload** — WhatsApp exports (both formats), Instagram DMs, or anything pasted. A
monitoring feed can be attached to the identical `/api/analyze` path if such access is ever granted.

**The severity score is an automated assessment, not a legal or professional risk determination.**
It can be wrong in both directions. The UI and every generated PDF say so.

**Legal references are informational.** Provisions are cited to help someone describe what happened,
not to advise. Every report ends by saying it is not legal advice.

**Region coverage** is 10 states plus national resources. Helpline numbers were correct when written
and should be re-verified before any real deployment.

---

### A note on Gemini 3.x thinking tokens

Gemini 3 models reason before answering, and **those thinking tokens are billed against
`maxOutputTokens`**. A chat turn spends roughly 700–900 tokens thinking before writing a word, so a
budget that looks generous will silently return a truncated fragment with `finishReason:
MAX_TOKENS`. Two guards are in place ([`gemini.js`](backend/src/providers/gemini.js)):

- The conversational path budgets 2048 tokens and requests `thinkingLevel: 'low'` — but only on
  Gemini 3+, since `thinkingBudget` (the 2.5-era equivalent) is rejected with a 400 on newer models
  and vice versa.
- A `MAX_TOKENS` finish that yields under 80 characters is treated as a **failure**, not a reply, so
  the offline responder takes over. Half a sentence of advice to someone in crisis is worse than none.

## Deployment

**Backend — Render.** Root Directory must be **blank** (the repo root), because `backend` depends on
`@sheshieldai/database` as a workspace and npm has to install from the top. Build `npm install`,
start `npm start`. Set `NODE_ENV=production`, `GROQ_API_KEY`, `GROQ_MODEL`, `MONGODB_URI`, and
`MONGODB_DB`. Do **not** set `PORT` — Render injects it. MongoDB Atlas needs Network Access set to
`0.0.0.0/0`, since the free tier has no static outbound IP.

**Frontend — Vercel.** Root Directory must be **`frontend`**. Vercel reads `vercel.json` from the
Root Directory, so the config lives at [`frontend/vercel.json`](frontend/vercel.json), not the repo
root — put it at the root with Root Directory set to `frontend` and it is silently ignored, which
surfaces as *"No Output Directory named `dist`"*.

That file does two things:

- rewrites `/api/*` to the Render service, so the browser stays same-origin and **CORS never applies**
- falls back to `index.html`, so `/dashboard` and `/analyze` survive a refresh

The Render URL in it is hardcoded; update it if the service is renamed. Alternatively drop the first
rewrite and set `VITE_API_URL` to the backend's URL, in which case `CORS_ORIGIN` on Render must list
the Vercel domain.

## Known issues

- `npm audit` reports a high-severity advisory in `react-router` ([GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)).
  It affects **RSC mode** CSRF handling; this app is a plain client-side `BrowserRouter` SPA with no
  server actions, so it is not reachable here. The advisory range (`7.12.0 – 8.2.0`) currently
  includes every published 7.x release, so there is no patched version to move to yet.
- The frontend bundle is ~574 kB (184 kB gzipped) in one chunk. Route-level `React.lazy` would fix
  it if that matters.
