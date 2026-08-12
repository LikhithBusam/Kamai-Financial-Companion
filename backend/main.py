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

import os
import sys
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import Depends, FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from auth import get_current_user_id

# Add agents directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'agents'))

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

# In-memory status tracking (for MVP)
analysis_status: Dict[str, Dict[str, Any]] = {}


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

        print(f"\n{'='*60}")
        print(f"Starting analysis for user {user_id}")
        print(f"{'='*60}\n")

        results = {
            "user_id": user_id,
            "analysis_started": datetime.now().isoformat(),
            "agents": {}
        }

        # Update status
        analysis_status[user_id] = {
            "status": "in_progress",
            "agents_completed": 0,
            "total_agents": 9,
            "last_updated": datetime.now().isoformat()
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

        for idx, (agent_key, agent_name) in enumerate(agent_names, 1):
            print(f"\n[{idx}/9] Running {agent_name} Agent...")

            try:
                result = await self.agents[agent_key].analyze_user(user_id)
                results["agents"][agent_key] = result

                # Update status
                analysis_status[user_id]["agents_completed"] = idx
                analysis_status[user_id]["last_updated"] = datetime.now().isoformat()

                print(f"+ {agent_name} completed")

            except Exception as e:
                print(f"X {agent_name} failed: {str(e)}")
                results["agents"][agent_key] = {
                    "success": False,
                    "error": str(e)
                }

            # Brief pause between agents
            await asyncio.sleep(2)

        results["analysis_completed"] = datetime.now().isoformat()

        # Update final status
        analysis_status[user_id]["status"] = "completed"
        analysis_status[user_id]["last_updated"] = datetime.now().isoformat()

        print(f"\n{'='*60}")
        print(f"Analysis complete for user {user_id}")
        print(f"{'='*60}\n")

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
async def trigger_analysis(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    """
    Trigger complete financial analysis for the authenticated caller.

    user_id comes from the verified Supabase JWT, not a client-supplied
    value, so a caller can only ever trigger analysis for themselves.
    Analysis runs in background; frontend fetches results directly from
    the database.
    """

    # Check if analysis already in progress
    if user_id in analysis_status and analysis_status[user_id]["status"] == "in_progress":
        raise HTTPException(
            status_code=409,
            detail=f"Analysis already in progress for user {user_id}"
        )

    # Start analysis in background
    background_tasks.add_task(orchestrator.run_all_agents, user_id)

    return AnalysisResponse(
        status="started",
        message=f"Analysis started for user {user_id}. Results will be written to database.",
        user_id=user_id,
        analysis_started=datetime.now().isoformat(),
        estimated_completion_minutes=8
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

    if user_id not in analysis_status:
        raise HTTPException(
            status_code=404,
            detail=f"No analysis found for user {user_id}"
        )

    status = analysis_status[user_id]

    return StatusResponse(
        user_id=user_id,
        status=status["status"],
        agents_completed=status["agents_completed"],
        total_agents=status["total_agents"],
        last_updated=status["last_updated"]
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
async def trigger_analysis_sync(user_id: str = Depends(get_current_user_id)):
    """
    Trigger analysis and wait for completion (synchronous)

    WARNING: This will take 5-10 minutes
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
