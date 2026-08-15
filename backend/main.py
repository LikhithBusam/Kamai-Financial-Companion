"""
FastAPI Backend for the Kamai agent pipeline.

This backend:
1. Receives a verified user_id from the frontend's Supabase Auth session
2. Triggers 9 agents for analysis (context_agent, knowledge_agent, and
   pattern_agent were removed -- see agents/finance_helpers.py and
   CLAUDE.md's Phase 1 notes for why)
3. Agents compute real numbers from real transaction/profile data and write
   directly to Supabase (see backend/agents/finance_helpers.py) -- the LLM
   is used only for short narrative text, not for the numbers themselves
4. Returns status to frontend
5. Frontend fetches results directly from database
"""

import logging
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import Depends, FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Load environment variables from .env file
load_dotenv()

from auth import get_current_user_id, get_user_id_for_rate_limit

# Add agents directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'agents'))

# finance_helpers configures the root logger on first import -- this logger
# just needs the name, not to configure logging itself.
logger = logging.getLogger(__name__)

# Reused as-is for analysis_jobs (durable job state) -- no new DB-access
# code needed, these already exist and are already used by every agent.
from finance_helpers import fetch_records, write_record, update_record

# Import all agents
from budget_agent import BudgetAnalysisAgent
from volatility_agent import VolatilityForecasterAgent
from tax_agent import TaxComplianceAgent
from risk_agent import RiskAssessmentAgent
from savings_investment_agent import SavingsInvestmentAgent
from bill_payment_agent import BillPaymentAgent
from goals_agent import FinancialGoalsAgent
from recommendation_agent import RecommendationAgent
from action_agent import ActionExecutionAgent

# Initialize FastAPI
app = FastAPI(
    title="Agente AI - Spare Backend",
    description="Background financial analysis service for gig workers",
    version="1.0.0"
)

# Per-user (not per-IP -- see auth.get_user_id_for_rate_limit) rate limiting
# on the expensive analysis-trigger endpoints.
limiter = Limiter(key_func=get_user_id_for_rate_limit)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: defaults to the frontend's actual dev port (8080, see
# frontend/vite.config.ts); production deployments must set
# CORS_ALLOWED_ORIGINS to the real deployed frontend origin(s).
CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS", "http://localhost:8080"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class AnalysisResponse(BaseModel):
    status: str
    message: str
    user_id: str
    analysis_started: str
    estimated_completion_minutes: int

class StatusResponse(BaseModel):
    user_id: str
    status: str
    agents_completed: int
    total_agents: int
    last_updated: str

def _get_job(user_id: str) -> Optional[Dict[str, Any]]:
    """Latest analysis_jobs row for a user, or None if they've never run one."""
    rows = fetch_records("analysis_jobs", user_id, order_by="updated_at.desc", limit=1)
    return rows[0] if rows else None


def _start_job(user_id: str) -> Dict[str, Any]:
    """
    Resets (or creates) the one job row for this user to a fresh in_progress
    state and returns it, synchronously, before the background task starts --
    so a status poll right after /api/analyze returns sees real state
    immediately, matching the old in-memory dict's behavior.
    """
    now = datetime.now().isoformat()
    existing = _get_job(user_id)
    fields = {
        "status": "in_progress",
        "agents_completed": 0,
        "total_agents": 9,
        "started_at": now,
        "updated_at": now,
        "error_message": None,
    }
    if existing:
        return update_record("analysis_jobs", existing["id"], fields)
    return write_record("analysis_jobs", {**fields, "user_id": user_id})


class AgentOrchestrator:
    """
    Orchestrates the 9 agents for a user, in an order that matters now:
    budget/volatility/tax/risk/savings/bills/goals all compute from real
    transaction data independently, but recommendation_agent and
    action_agent read those agents' freshly-written rows (risk_assessments,
    budgets, savings_goals, tax_records, bills) to ground their output in
    real numbers -- so they must run last.
    """

    def __init__(self, mcp_servers: str = ".mcp.json"):
        self.mcp_servers = mcp_servers
        self.agents = {
            "budget": BudgetAnalysisAgent(mcp_servers),
            "volatility": VolatilityForecasterAgent(mcp_servers),
            "tax": TaxComplianceAgent(mcp_servers),
            "risk": RiskAssessmentAgent(mcp_servers),
            "savings": SavingsInvestmentAgent(mcp_servers),
            "bills": BillPaymentAgent(mcp_servers),
            "goals": FinancialGoalsAgent(mcp_servers),
            "recommendation": RecommendationAgent(mcp_servers),
            "action": ActionExecutionAgent(mcp_servers),
        }

    async def run_all_agents(self, user_id: str) -> Dict[str, Any]:
        """Run all 9 agents in sequence"""

        logger.info(f"Starting analysis for user {user_id}")

        job = _get_job(user_id)
        job_id = job["id"] if job else None

        results = {
            "user_id": user_id,
            "analysis_started": datetime.now().isoformat(),
            "agents": {}
        }

        agent_names = [
            ("budget", "Budget Analysis"),
            ("volatility", "Volatility Forecaster"),
            ("tax", "Tax & Compliance"),
            ("risk", "Risk Assessment"),
            ("savings", "Savings & Investment"),
            ("bills", "Bill Payment"),
            ("goals", "Financial Goals"),
            ("recommendation", "Recommendation Engine"),
            ("action", "Action Execution"),
        ]

        try:
            for idx, (agent_key, agent_name) in enumerate(agent_names, 1):
                logger.info(f"[{idx}/9] Running {agent_name} Agent...")

                try:
                    result = await self.agents[agent_key].analyze_user(user_id)
                    results["agents"][agent_key] = result
                    logger.info(f"{agent_name} completed")
                except Exception as e:
                    logger.error(f"{agent_name} failed: {str(e)}", exc_info=True)
                    results["agents"][agent_key] = {
                        "success": False,
                        "error": str(e)
                    }

                if job_id:
                    update_record("analysis_jobs", job_id, {
                        "agents_completed": idx,
                        "updated_at": datetime.now().isoformat(),
                    })

            results["analysis_completed"] = datetime.now().isoformat()

            if job_id:
                update_record("analysis_jobs", job_id, {
                    "status": "completed",
                    "updated_at": datetime.now().isoformat(),
                })

            logger.info(f"Analysis complete for user {user_id}")

        except Exception as e:
            # Catches failures outside any single agent's own try/except
            # (e.g. the analysis_jobs update call itself failing) so the job
            # row reflects reality instead of getting stuck "in_progress"
            # forever.
            logger.error(f"Analysis run failed for user {user_id}: {str(e)}", exc_info=True)
            if job_id:
                update_record("analysis_jobs", job_id, {
                    "status": "failed",
                    "error_message": str(e),
                    "updated_at": datetime.now().isoformat(),
                })
            raise

        return results


# Global orchestrator instance
orchestrator = AgentOrchestrator()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Agente AI - Spare Backend",
        "status": "running",
        "version": "1.0.0",
        "agents": 9
    }


@app.post("/api/analyze", response_model=AnalysisResponse)
@limiter.limit("1/minute")
async def trigger_analysis(
    request: Request,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    """
    Trigger complete financial analysis for the authenticated caller.

    user_id comes from the verified Supabase JWT, not a client-supplied
    value, so a caller can only ever trigger analysis for themselves.
    Analysis runs in background; frontend fetches results directly from
    the database. Rate-limited to 1/minute per user (in addition to the
    409-on-already-in-progress check below) -- a full analysis run is
    expensive enough that nothing legitimate needs to trigger it faster.
    """

    # Check if analysis already in progress
    existing = _get_job(user_id)
    if existing and existing["status"] == "in_progress":
        raise HTTPException(
            status_code=409,
            detail=f"Analysis already in progress for user {user_id}"
        )

    # Reset/create the job row synchronously so a status poll right after
    # this call sees real state immediately, then run the agents in the
    # background.
    _start_job(user_id)
    background_tasks.add_task(orchestrator.run_all_agents, user_id)

    return AnalysisResponse(
        status="started",
        message=f"Analysis started for user {user_id}. Results will be written to database.",
        user_id=user_id,
        analysis_started=datetime.now().isoformat(),
        estimated_completion_minutes=2
    )


@app.get("/api/status/{user_id}", response_model=StatusResponse)
async def get_analysis_status(
    user_id: str,
    current_user: str = Depends(get_current_user_id),
):
    """
    Get current status of analysis for a user

    Frontend can poll this to show progress. Callers may only read their
    own status.
    """

    if current_user != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this user's status")

    job = _get_job(user_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail=f"No analysis found for user {user_id}"
        )

    return StatusResponse(
        user_id=user_id,
        status=job["status"],
        agents_completed=job["agents_completed"],
        total_agents=job["total_agents"],
        last_updated=job["updated_at"]
    )


@app.get("/api/agent-logs/{user_id}")
async def get_agent_logs(
    user_id: str,
    current_user: str = Depends(get_current_user_id),
):
    """
    Get detailed agent execution logs for a user.

    Returns all agent responses and outputs for frontend display. Callers
    may only read their own logs; the 403 check below is what makes it safe
    to then read with the service-role key (which bypasses RLS) on their
    behalf.
    """
    if current_user != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this user's logs")

    try:
        import requests

        url = f"{os.environ['SUPABASE_URL']}/rest/v1/agent_logs"
        service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
        }

        params = {
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": "20"
        }

        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()

        logs = response.json()

        return {
            "user_id": user_id,
            "logs": logs,
            "total_count": len(logs)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch agent logs: {str(e)}")


@app.post("/api/analyze-sync")
@limiter.limit("1/minute")
async def trigger_analysis_sync(request: Request, user_id: str = Depends(get_current_user_id)):
    """
    Trigger analysis and wait for completion (synchronous)

    Use /api/analyze (async) for production
    """

    try:
        results = await orchestrator.run_all_agents(user_id)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "Agente AI Spare Backend",
        "agents": {
            "budget": "ready",
            "volatility": "ready",
            "tax": "ready",
            "risk": "ready",
            "savings": "ready",
            "bills": "ready",
            "goals": "ready",
            "recommendation": "ready",
            "action": "ready",
        },
        "database": "supabase_rest",
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn

    print("\n" + "="*60)
    print("Starting Agente AI Spare Backend")
    print("="*60)
    print("\nFrontend (Windows) can connect to:")
    print("  > http://localhost:8000")
    print("  > http://127.0.0.1:8000")
    print("\nAPI Endpoints:")
    print("  POST /api/analyze          - Trigger analysis (async)")
    print("  POST /api/analyze-sync     - Trigger analysis (sync)")
    print("  GET  /api/status/{user_id} - Get analysis status")
    print("  GET  /api/health           - Health check")
    print("\nDocs available at:")
    print("  > http://localhost:8000/docs")
    print("="*60 + "\n")

    uvicorn.run(
        app,
        host="0.0.0.0",  # Accept connections from Windows
        port=8000,
        log_level="info"
    )
