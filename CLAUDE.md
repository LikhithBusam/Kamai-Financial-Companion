# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Kamai is a hackathon project: a financial companion for Indian gig workers. React/TypeScript frontend, a FastAPI backend that orchestrates 9 agents (`backend/agents/*.py`) computing real numbers from real transaction data (Gemini, with Groq as fallback, used only for narrative text), and Supabase (Postgres) as the database. The frontend talks to Supabase directly for most reads/writes and calls the backend only to trigger agent analysis runs.

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
Requires `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (real data fetching/writes) and `GOOGLE_API_KEY`/`GROQ_API_KEY` (narrative text only) — see `backend/.env.example`. `main.py` no longer needs `autogen-agentchat`/`autogen-ext` installed to boot (see Architecture below) — only `fastapi`, `requests`, `PyJWT`, `python-dotenv` are actually exercised by the live pipeline. There is no automated test suite; agent modules are runnable individually as smoke tests, e.g.:
```bash
python agents/budget_agent.py   # runs analyze_user() against a hardcoded test user_id
```

### Standalone transaction-parser API (repo root)
```bash
pip install -r requirements.txt
uvicorn simple_api_server:app --reload --port 8000
```
This is a separate FastAPI app (OCR/voice receipt parsing via `transaction_parser.py`) and also defaults to port 8000 — don't run it at the same time as `backend/main.py`.

## Architecture

### Three services, not one backend
- **`backend/main.py`** — the live orchestrator. `AgentOrchestrator` runs 9 agent classes from `backend/agents/*.py` in sequence for a given `user_id` (`POST /api/analyze` for async/background, `/api/analyze-sync` to await inline, `/api/status/{user_id}` to poll).
- **`simple_api_server.py`** (repo root) — unrelated standalone service wrapping `transaction_parser.py` for OCR/voice-based transaction entry. Not invoked from `backend/`.
- **`backend/README.md` and `backend/configs/agent_config.yaml`** describe a *third*, older design ("Spare Backend": Claude Agent SDK + direct Postgres access via MCP, orchestrator + 3 sub-agents via the Task tool). That design is **not** what `main.py` runs — treat those two files as stale/aspirational, not as documentation of current behavior.

### How an agent actually runs (Phase 1 rewrite — `backend/agents/finance_helpers.py`)
As of the Phase 1 rewrite, agents compute real numbers in Python from real Supabase data — the LLM is used only to phrase already-computed facts as a short narrative string, never to invent the numbers themselves. Each agent's `analyze_user(user_id)`:
1. Fetches real rows via `finance_helpers.fetch_transactions()`/`fetch_profile()`/`fetch_records()` (direct Supabase REST calls using the service-role key, bypassing RLS since the caller's ownership was already verified by `backend/auth.py` upstream).
2. Computes real numbers via a `finance_helpers.compute_*()` function — e.g. `compute_risk_assessment()` (deterministic DTI/emergency-fund/volatility formula), `compute_gig_worker_tax()` (ported from `frontend/src/pages/Tax.tsx`'s New Regime FY24-25 slab + Section 87A rebate logic, so both surfaces agree), `compute_budgets()`, `compute_volatility_forecast()`, `compute_savings_plan()`, `compute_goal_projection()`.
3. Optionally calls `finance_helpers.generate_narrative()` (re-exported from `backend/llm_client.py`) with the already-computed numbers, to get 1-2 sentences of plain-language explanation. Gemini first, Groq fallback on any failure — see `llm_client.py`. **Gemini 2.5's "thinking" mode will silently return empty/truncated content unless `reasoning_effort: "none"` is set** (confirmed empirically; `llm_client.OpenAICompatibleClient` already sets this for Gemini calls) — worth knowing if you add a new narrative call path that bypasses this client.
4. Writes the result directly to its target table via `finance_helpers.write_record()`/`update_record()` — no LLM-JSON-parsing, no separate dispatch table. Each agent owns its own write.

**`backend/autogen_runtime.py` and its `run_autogen_mcp_task()`/`write_agent_output_to_db()` are now dead code for the live pipeline** — none of the 9 agents import it anymore (confirmed: `main.py` boots without `autogen-agentchat`/`autogen-ext` installed). It's kept only because two orphaned, not-wired-into-`main.py` files (`agents/financial_agent.py`, `agents/monitor.py`) still import it; if those get cleaned up too, `autogen_runtime.py` can go. `backend/llm_client.py` holds the actual live LLM client now (extracted out of `autogen_runtime.py` specifically so `finance_helpers.py` doesn't need the AutoGen dependency stack).

**Removed agents** (audited and found to be pure no-ops or fully redundant, not just "needs fixing"): `context_agent` (never in the DB-write dispatch allowlist even before this rewrite — burned an LLM call and wrote nothing), `knowledge_agent` (same), `pattern_agent` (targeted a table, `income_patterns`, that was never actually queried by the frontend — `Stats.tsx` computes weekday/volatility patterns client-side from raw transactions directly — and its function is now provided for free by `finance_helpers.compute_income_expense_stats()`, which every other agent already calls).

**Orchestration order matters now**: `budget`/`volatility`/`tax`/`risk`/`savings`/`bills`/`goals` each compute independently from real transactions, but `recommendation` and `action` read those agents' freshly-written rows (via `finance_helpers.fetch_records()`) to ground their output in real numbers — so they run last (see `AgentOrchestrator.agents` dict order in `main.py`).

**When adding a new agent**: follow the pattern above (fetch → compute in a `finance_helpers.compute_*()` function → optionally narrate → `write_record()`), not the old LLM-produces-the-whole-JSON pattern.

### Frontend data flow
- `src/lib/supabase.ts` creates the Supabase client used by most of the app.
- `src/services/database.ts` (~1500 lines) is the primary data-access layer — direct Supabase table reads/writes, one interface per table, mirroring the schema in `docs/DATABASE_TABLES_DOCUMENTATION.md`.
- `src/services/spareBackend.ts` and `src/services/api.ts` call the FastAPI backend (`VITE_API_BASE_URL`/`VITE_SPARE_API_URL`, default `http://localhost:8000/api`) purely to kick off/poll agent analysis — not for CRUD.
- Auth is Supabase Auth (see "Auth & database" below) — `src/contexts/AppContext.tsx` derives `isAuthenticated`/`user` from the real Supabase session via `onAuthStateChange`, mirroring `user_id` into `localStorage` so the ~1500 lines of CRUD in `database.ts` (which read it directly) didn't need to change. `ProtectedRoute` gates purely on `AppContext`'s `isAuthenticated`.
- Routing (`src/App.tsx`) is flat: public routes (`/`, `/features`, `/phases`, `/login`, `/signup`) plus protected routes each individually wrapped in `<ProtectedRoute><MainLayout>...</MainLayout></ProtectedRoute>` — there's no nested/layout route group, so a new protected page means one more `<Route>` block following the existing pattern.

### Auth & database (Phase 0 security rebuild — read this before touching auth/DB code)
As of the Phase 0 rebuild, auth and data isolation are real:
- **Auth is Supabase Auth**, not the old custom phone/password check. The UI still collects a phone number, but signup/login use a synthetic "shadow email" (`{phone}@users.kamai.app`, see `shadowEmail()` in `frontend/src/services/database.ts`) as the actual Supabase Auth identity. A DB trigger (`handle_new_user()` in `supabase/migrations/20260811000100_profiles.sql`) auto-creates the matching `profiles` row from signup metadata. Two gotchas confirmed empirically against the live project: (1) Supabase's signup validator rejects reserved/placeholder domains (`.internal`, `.test`, `.invalid`, `.example`, `example.com`) with `email_address_invalid` — it doesn't do DNS/MX lookups, so any other-looking domain passes; (2) the Supabase project's Auth setting **"Confirm email" must be OFF** (Authentication → Sign In / Providers → Email), since these shadow addresses have no real inbox to click a confirmation link in — with it on, signup succeeds but the account can never be confirmed/logged into.
- **RLS is enabled and enforced** on every user-owned table (`supabase/migrations/20260811000400_rls_policies.sql`) — `auth.uid() = user_id` on every row. `government_schemes` is the one public-read reference table.
- **Backend endpoints require a verified Supabase JWT** (`backend/auth.py`'s `get_current_user_id` dependency) — `user_id` is derived from the token, never trusted from the request body/path without an ownership check.
- Schema lives in `supabase/migrations/` (ordered, idempotent SQL files) — apply them via the Supabase SQL editor in filename order. The old root-level `fix_users_table.sql`/`fix_auth_rls.sql`/`ensure_users_table.sql`/`supabase_new_tables.sql` are gone; they were three competing, unordered schemas (one of which `DROP TABLE ... CASCADE`d on every re-run).
- Secrets come from env vars only: `frontend/.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and `backend/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `GOOGLE_API_KEY`, `GROQ_API_KEY`). See `frontend/.env.example`/`backend/.env.example`. Agent writes in `finance_helpers.write_record()`/`update_record()` use the **service-role** key (bypasses RLS, since agents write on a user's behalf server-side) — never the anon key.
- Done as of the Phase 1 rewrite (see the "How an agent actually runs" section above): the 9 remaining agents fetch real transaction/profile data and compute real numbers instead of LLM-fabricating them.
- Not yet done: several frontend features are still decorative stubs (Actions approve/pause, Savings "Start Investing" button, RiskDashboard's silent fake fallback, Profile's password-change form — the last one is now buildable via `supabase.auth.updateUser()`). These are Phase 2, unstarted.

### Other known rough edges
- `backend/main.py` and root `simple_api_server.py` both default to port 8000 and aren't designed to run simultaneously — still unresolved (planned for a future deployment-readiness phase).
- `docs/DATABASE_TABLES_DOCUMENTATION.md` still documents `income_patterns` — it was never created (see the removed-agents note above) and never will be; the doc's own top note already flags tables like this as aspirational, not live schema.
