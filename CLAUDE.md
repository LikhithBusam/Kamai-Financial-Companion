# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Kamai is a hackathon project: a financial companion for Indian gig workers. React/TypeScript frontend, a FastAPI backend that orchestrates 12 LLM "agents" (AutoGen + Azure OpenAI), and Supabase (Postgres) as the database. The frontend talks to Supabase directly for most reads/writes and calls the backend only to trigger agent analysis runs.

## Commands

### Frontend (`frontend/`)
```bash
npm install
npm run dev        # Vite dev server on port 8080 (see vite.config.ts; README says 5173, that's stale)
npm run build       # production build
npm run build:dev   # development-mode build
npm run lint         # eslint .
```
No test runner is configured for the frontend.

### Backend (`backend/`)
```bash
python -m venv venv
venv\Scripts\activate        # Windows; source venv/bin/activate on WSL/Linux
pip install -r requirements.txt
python main.py                 # FastAPI app on port 8000, docs at /docs
```
Requires `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT` (see `backend/.env.example`). There is no automated test suite; agent modules are runnable individually as smoke tests, e.g.:
```bash
python agents/financial_agent.py   # runs analyze_user() against a hardcoded test user_id
```

### Standalone transaction-parser API (repo root)
```bash
pip install -r requirements.txt
uvicorn simple_api_server:app --reload --port 8000
```
This is a separate FastAPI app (OCR/voice receipt parsing via `transaction_parser.py`) and also defaults to port 8000 — don't run it at the same time as `backend/main.py`.

## Architecture

### Three services, not one backend
- **`backend/main.py`** — the live orchestrator. `AgentOrchestrator` runs 12 agent classes from `backend/agents/*.py` in sequence for a given `user_id` (`POST /api/analyze` for async/background, `/api/analyze-sync` to await inline, `/api/status/{user_id}` to poll). Each agent's `.analyze_user(user_id)` calls into `backend/autogen_runtime.py`.
- **`simple_api_server.py`** (repo root) — unrelated standalone service wrapping `transaction_parser.py` for OCR/voice-based transaction entry. Not invoked from `backend/`.
- **`backend/README.md` and `backend/configs/agent_config.yaml`** describe a *third*, older design ("Spare Backend": Claude Agent SDK + direct Postgres access via MCP, orchestrator + 3 sub-agents via the Task tool). That design is **not** what `main.py` runs — treat those two files as stale/aspirational, not as documentation of current behavior.

### How an agent actually runs (`backend/autogen_runtime.py`)
Despite the "MCP" naming in comments, agents do **not** use MCP or the Claude Agent SDK. Each agent (e.g. `backend/agents/financial_agent.py`) defines a system prompt that forces a specific JSON output shape, then calls `run_autogen_mcp_task(agent_name, system_prompt, task, user_id, use_azure=True)`, which:
1. Builds an `AzureOpenAIClient` (custom Azure Foundry REST client, not the official SDK) and calls it directly with `[system, user]` messages — no AutoGen tool-calling loop.
2. Strips markdown fences from the model's response and `json.loads`s it.
3. Dispatches on `agent_name` inside `write_agent_output_to_db()` — a big if/elif chain that knows, per agent, which JSON key to pull out and which Supabase REST table to `POST` it to (e.g. `budget_agent` → `data["budgets"]` → `/rest/v1/budgets`).

**When adding a new agent**, you must both create the agent class/prompt *and* add a matching branch in `write_agent_output_to_db()` — the agent's own code never writes to the database itself.

`AzureOpenAIClient` also self-imposes a 60s rate-limit delay between calls (`RATE_LIMIT_DELAY` in `autogen_runtime.py`) — a full 12-agent run takes minutes, hence `main.py` runs agents in the background and the frontend polls `/api/status/{user_id}`.

### Frontend data flow
- `src/lib/supabase.ts` creates the Supabase client used by most of the app.
- `src/services/database.ts` (~1500 lines) is the primary data-access layer — direct Supabase table reads/writes, one interface per table, mirroring the schema in `docs/DATABASE_TABLES_DOCUMENTATION.md`.
- `src/services/spareBackend.ts` and `src/services/api.ts` call the FastAPI backend (`VITE_API_BASE_URL`/`VITE_SPARE_API_URL`, default `http://localhost:8000/api`) purely to kick off/poll agent analysis — not for CRUD.
- Auth is Supabase Auth (see "Auth & database" below) — `src/contexts/AppContext.tsx` derives `isAuthenticated`/`user` from the real Supabase session via `onAuthStateChange`, mirroring `user_id` into `localStorage` so the ~1500 lines of CRUD in `database.ts` (which read it directly) didn't need to change. `ProtectedRoute` gates purely on `AppContext`'s `isAuthenticated`.
- Routing (`src/App.tsx`) is flat: public routes (`/`, `/features`, `/phases`, `/login`, `/signup`) plus protected routes each individually wrapped in `<ProtectedRoute><MainLayout>...</MainLayout></ProtectedRoute>` — there's no nested/layout route group, so a new protected page means one more `<Route>` block following the existing pattern.

### Auth & database (Phase 0 security rebuild — read this before touching auth/DB code)
As of the Phase 0 rebuild, auth and data isolation are real:
- **Auth is Supabase Auth**, not the old custom phone/password check. The UI still collects a phone number, but signup/login use a synthetic "shadow email" (`{phone}@users.kamai.internal`, see `shadowEmail()` in `frontend/src/services/database.ts`) as the actual Supabase Auth identity. A DB trigger (`handle_new_user()` in `supabase/migrations/20260811000100_profiles.sql`) auto-creates the matching `profiles` row from signup metadata.
- **RLS is enabled and enforced** on every user-owned table (`supabase/migrations/20260811000400_rls_policies.sql`) — `auth.uid() = user_id` on every row. `government_schemes` is the one public-read reference table.
- **Backend endpoints require a verified Supabase JWT** (`backend/auth.py`'s `get_current_user_id` dependency) — `user_id` is derived from the token, never trusted from the request body/path without an ownership check.
- Schema lives in `supabase/migrations/` (ordered, idempotent SQL files) — apply them via the Supabase SQL editor in filename order. The old root-level `fix_users_table.sql`/`fix_auth_rls.sql`/`ensure_users_table.sql`/`supabase_new_tables.sql` are gone; they were three competing, unordered schemas (one of which `DROP TABLE ... CASCADE`d on every re-run).
- Secrets come from env vars only: `frontend/.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and `backend/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, plus the existing `AZURE_OPENAI_*`). See `frontend/.env.example`/`backend/.env.example`. Agent writes in `autogen_runtime.py` use the **service-role** key (bypasses RLS, since agents write on a user's behalf server-side) — never the anon key.
- Not yet done (future phases, see the project's Phase 1/2/3 roadmap): the 12 agents still don't fetch real transaction data or do deterministic math (their tool-calling wiring is dead code, so all numbers are LLM-fabricated), and several frontend features are still decorative stubs (Actions approve/pause, Savings "Start Investing" button, RiskDashboard's silent fake fallback, Profile's password-change form — the last one is now buildable via `supabase.auth.updateUser()`).

### Other known rough edges
- `main.py`'s module docstring and a couple of comments still say "9 agents" — the code (`AgentOrchestrator.agents`, `agent_names`) runs 12.
- `backend/main.py` and root `simple_api_server.py` both default to port 8000 and aren't designed to run simultaneously — still unresolved (planned for a future deployment-readiness phase).
