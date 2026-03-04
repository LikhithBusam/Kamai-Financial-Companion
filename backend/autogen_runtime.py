import os
import json
import requests
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Rate limiting
import time
last_call_time = 0
RATE_LIMIT_DELAY = 60  # 1 minute between calls

# Helper function to write structured data to database
async def write_agent_output_to_db(user_id: str, agent_name: str, json_output: str):
    """Parse agent JSON output and write to appropriate database tables"""
    import json
    import requests
    from datetime import datetime, timedelta
    
    try:
        # Clean up the JSON output - AutoGen sometimes returns markdown code blocks
        cleaned_output = json_output.strip()
        if cleaned_output.startswith("```json"):
            cleaned_output = cleaned_output[7:]  # Remove ```json
        if cleaned_output.startswith("```"):
            cleaned_output = cleaned_output[3:]   # Remove ```
        if cleaned_output.endswith("```"):
            cleaned_output = cleaned_output[:-3]  # Remove trailing ```
        cleaned_output = cleaned_output.strip()
        
        print(f"[{agent_name}] Parsing JSON output: {cleaned_output[:200]}...")
        
        data = json.loads(cleaned_output)
        
        # Write to budgets table if budget agent
        if agent_name == "budget_agent" and "budgets" in data:
            for budget in data["budgets"]:
                budget["user_id"] = user_id
                budget["created_at"] = datetime.now().isoformat()
                budget["is_active"] = True
                
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/budgets",
                    headers={
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    json=budget
                )
                if response.status_code == 201:
                    print(f"[Budget Agent] Created budget: {budget['budget_type']}")
                else:
                    print(f"[Budget Agent] Error creating budget: {response.text}")
        
        # Write to recommendations table if recommendation agent
        elif agent_name == "recommendation_agent" and "recommendations" in data:
            for rec in data["recommendations"]:
                rec["user_id"] = user_id
                rec["created_at"] = datetime.now().isoformat()
                rec["status"] = "pending"
                rec["delivered_at"] = None
                rec["actioned_at"] = None
                rec["completed_at"] = None
                rec["user_feedback"] = None
                rec["actual_outcome"] = None
                
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/recommendations",
                    headers={
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    json=rec
                )
                if response.status_code == 201:
                    print(f"[Recommendation Agent] Created recommendation: {rec['title']}")
                else:
                    print(f"[Recommendation Agent] Error creating recommendation: {response.text}")
        
        # Write to income_patterns table if pattern agent
        elif agent_name == "pattern_agent" and "income_patterns" in data:
            pattern = data["income_patterns"]
            pattern["user_id"] = user_id
            pattern["created_at"] = datetime.now().isoformat()
            pattern["last_calculated"] = datetime.now().isoformat()
            pattern["valid_until"] = (datetime.now() + timedelta(days=120)).isoformat()
            
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/income_patterns",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                json=pattern
            )
            if response.status_code == 201:
                print(f"[Pattern Agent] Created income pattern: {pattern['pattern_type']}")
            else:
                print(f"[Pattern Agent] Error creating income pattern: {response.text}")
        
        # Write to risk_assessments table if risk agent
        elif agent_name == "risk_agent" and "risk_assessment" in data:
            assessment = data["risk_assessment"]
            assessment["user_id"] = user_id
            assessment["assessment_date"] = datetime.now().isoformat()
            assessment["created_at"] = datetime.now().isoformat()
            
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/risk_assessments",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                json=assessment
            )
            if response.status_code == 201:
                print(f"[Risk Agent] Created risk assessment: {assessment['overall_risk_level']}")
            else:
                print(f"[Risk Agent] Error creating risk assessment: {response.text}")
        
        # Write to tax_records table if tax agent
        elif agent_name == "tax_agent" and "tax_record" in data:
            tax_record = data["tax_record"]
            tax_record["user_id"] = user_id
            tax_record["created_at"] = datetime.now().isoformat()
            
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/tax_records",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                json=tax_record
            )
            if response.status_code == 201:
                print(f"[Tax Agent] Created tax record: {tax_record['financial_year']}")
            else:
                print(f"[Tax Agent] Error creating tax record: {response.text}")
        
        # Write to income_forecasts table if volatility agent
        elif agent_name == "volatility_agent" and "income_forecast" in data:
            forecast = data["income_forecast"]
            forecast["user_id"] = user_id
            forecast["forecast_date"] = datetime.now().isoformat()
            forecast["valid_until"] = (datetime.now() + timedelta(days=30)).isoformat()
            
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/income_forecasts",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                json=forecast
            )
            if response.status_code == 201:
                print(f"[Volatility Agent] Created income forecast: {forecast['volatility_category']}")
            else:
                print(f"[Volatility Agent] Error creating income forecast: {response.text}")
        
        # Write to financial_health table if financial agent
        elif agent_name == "financial_agent" and "financial_health" in data:
            health = data["financial_health"]
            health["user_id"] = user_id
            health["assessment_date"] = datetime.now().isoformat()
            health["created_at"] = datetime.now().isoformat()
            
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/financial_health",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                json=health
            )
            if response.status_code == 201:
                print(f"[Financial Agent] Created financial health: {health['health_category']}")
            else:
                print(f"[Financial Agent] Error creating financial health: {response.text}")
        
        # Write to executed_actions table if action agent
        elif agent_name == "action_agent" and "action_plan" in data:
            plan = data["action_plan"]
            
            # Convert action plan to executed actions
            for action in plan.get("actions", []):
                action_data = {
                    "user_id": user_id,
                    "action_type": plan.get("plan_type", "automation"),
                    "action_description": action.get("description", action.get("action_id", "")),
                    "status": "pending",
                    "amount": action.get("target_amount", 0),
                    "schedule": action.get("frequency", "one_time"),
                    "user_approved": False,
                }
                
                action_data["created_at"] = datetime.now().isoformat()
                
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/executed_actions",
                    headers={
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    json=action_data
                )
                if response.status_code == 201:
                    print(f"[Action Agent] Created executed action: {action_data['action_description']}")
                else:
                    print(f"[Action Agent] Error creating executed action: {response.text}")

        # Write to savings_goals table if savings agent
        elif agent_name == "savings_investment_agent" and "savings_plan" in data:
            plan = data["savings_plan"]

            # Save emergency fund goal
            if "emergency_fund" in plan:
                ef = plan["emergency_fund"]
                savings_goal = {
                    "user_id": user_id,
                    "goal_type": "emergency_fund",
                    "goal_name": "Emergency Fund",
                    "target_amount": ef.get("target_amount", 0),
                    "current_amount": ef.get("current_amount", 0),
                    "monthly_contribution": ef.get("monthly_contribution", 0),
                    "priority": ef.get("priority", "high"),
                    "status": ef.get("status", "in_progress"),
                    "reasoning": ef.get("reasoning", ""),
                    "created_at": datetime.now().isoformat()
                }

                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/savings_goals",
                    headers={
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    json=savings_goal
                )
                if response.status_code == 201:
                    print(f"[Savings Agent] Created emergency fund goal")
                else:
                    print(f"[Savings Agent] Error: {response.text}")

            # Save investment recommendations
            for inv in plan.get("investment_recommendations", []):
                inv_rec = {
                    "user_id": user_id,
                    "investment_type": inv.get("investment_type", ""),
                    "provider": inv.get("provider", ""),
                    "recommended_amount": inv.get("recommended_amount", 0),
                    "frequency": inv.get("frequency", "monthly"),
                    "expected_return": inv.get("expected_return", 0),
                    "risk_level": inv.get("risk_level", "low"),
                    "reasoning": inv.get("reasoning", ""),
                    "created_at": datetime.now().isoformat()
                }

                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/investment_recommendations",
                    headers={
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    json=inv_rec
                )
                if response.status_code == 201:
                    print(f"[Savings Agent] Created investment recommendation: {inv_rec['investment_type']}")

        # Write to bills table if bill payment agent
        elif agent_name == "bill_payment_agent" and "bill_analysis" in data:
            analysis = data["bill_analysis"]

            for bill in analysis.get("bills", []):
                bill_data = {
                    "user_id": user_id,
                    "bill_name": bill.get("bill_name", ""),
                    "bill_type": bill.get("bill_type", "utility"),
                    "amount": bill.get("amount", 0),
                    "due_date": bill.get("due_date", ""),
                    "frequency": bill.get("frequency", "monthly"),
                    "priority": bill.get("priority", "medium"),
                    "auto_pay_recommended": bill.get("auto_pay_recommended", False),
                    "payment_method": bill.get("payment_method", "upi"),
                    "status": bill.get("status", "pending"),
                    "created_at": datetime.now().isoformat()
                }

                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/bills",
                    headers={
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    json=bill_data
                )
                if response.status_code == 201:
                    print(f"[Bill Agent] Created bill: {bill_data['bill_name']}")
                else:
                    print(f"[Bill Agent] Error: {response.text}")

        # Write to financial_goals table if goals agent
        elif agent_name == "goals_agent" and "goals_plan" in data:
            plan = data["goals_plan"]

            for goal in plan.get("goals", []):
                goal_data = {
                    "user_id": user_id,
                    "goal_name": goal.get("goal_name", ""),
                    "goal_type": goal.get("goal_type", "savings"),
                    "description": goal.get("description", ""),
                    "target_amount": goal.get("target_amount", 0),
                    "current_amount": goal.get("current_amount", 0),
                    "target_date": goal.get("target_date", ""),
                    "priority": goal.get("priority", 1),
                    "status": goal.get("status", "not_started"),
                    "monthly_target": goal.get("monthly_target", 0),
                    "progress_percentage": goal.get("progress_percentage", 0),
                    "explanation": goal.get("explanation", {}),
                    "milestones": goal.get("milestones", []),
                    "action_steps": goal.get("action_steps", []),
                    "created_at": datetime.now().isoformat()
                }

                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/financial_goals",
                    headers={
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    json=goal_data
                )
                if response.status_code == 201:
                    print(f"[Goals Agent] Created goal: {goal_data['goal_name']}")
                else:
                    print(f"[Goals Agent] Error: {response.text}")

        return True
        
    except json.JSONDecodeError as e:
        print(f"[{agent_name}] JSON parsing error: {e}")
        print(f"[{agent_name}] Raw output received: {repr(json_output[:500])}")
        return False
    except Exception as e:
        print(f"[{agent_name}] Database write error: {e}")
        return False

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.messages import TextMessage
from autogen_core import CancellationToken
from autogen_core.models import ModelInfo
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_core.tools import Tool


# Supabase configuration
SUPABASE_URL = "https://ubjrclaiqqxngfcylbfs.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVianJjbGFpcXF4bmdmY3lsYmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NzMzOTEsImV4cCI6MjA3OTU0OTM5MX0.Kkp7BV0ZSWq0ZR6YVOzwQwX08u3NOCxClvQWknWJlbA"


class AzureFoundryClient:
    """Custom Azure Foundry client that handles the correct URL format"""
    
    def __init__(self, model: str, api_key: str, endpoint: str, api_version: str):
        self.model = model
        self.api_key = api_key
        self.endpoint = endpoint.rstrip('/')
        self.api_version = api_version
        self.base_url = f"{self.endpoint}/openai/deployments/{self.model}/chat/completions"
        self._model_info = ModelInfo(
            function_calling=True,
            structured_output=True,
            json_output=True,
            vision=False,
            family="openai"
        )
    
    @property
    def model_info(self):
        return self._model_info
    
    async def create(self, messages, **kwargs):
        """Create chat completion using Azure Foundry format"""
        headers = {
            'api-key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        # Convert AutoGen messages to OpenAI format
        openai_messages = []
        for msg in messages:
            if hasattr(msg, 'content'):
                openai_messages.append({
                    'role': 'user' if 'user' in str(type(msg)).lower() else 'assistant',
                    'content': msg.content
                })
            else:
                openai_messages.append({
                    'role': 'user',
                    'content': str(msg)
                })
        
        data = {
            'messages': openai_messages,
            'max_tokens': kwargs.get('max_tokens', 2000)  # Limit to 2000 tokens
        }
        
        response = requests.post(
            f"{self.base_url}?api-version={self.api_version}",
            headers=headers,
            json=data
        )
        
        if response.status_code != 200:
            raise Exception(f"Azure Foundry API error: {response.status_code} - {response.text}")
        
        result = response.json()
        
        # Convert to AutoGen-compatible format
        from autogen_ext.models.openai._openai_client import ChatCompletion
        choice = result.get('choices', [{}])[0]
        message = choice.get('message', {})
        content = message.get('content', '')
        
        return ChatCompletion(
            choices=[choice],
            created=result.get('created'),
            id=result.get('id'),
            model=result.get('model'),
            object=result.get('object'),
            usage=result.get('usage', {})
        )
    
    async def close(self):
        pass


def postgrestRequest(table: str, method: str = "GET", data: Optional[Dict] = None, filters: Optional[Dict] = None) -> str:
    """
    Execute database queries on Supabase using REST API
    
    Args:
        table: Table name to query
        method: HTTP method (GET, POST, PATCH, DELETE)
        data: Data for POST/PATCH requests
        filters: Filter conditions for GET requests
    
    Returns:
        JSON response from Supabase
    """
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    try:
        if method == "GET":
            # Apply filters as query parameters
            if filters:
                filter_params = []
                for key, value in filters.items():
                    if isinstance(value, str):
                        filter_params.append(f"{key}=eq.{value}")
                    else:
                        filter_params.append(f"{key}={value}")
                url += "?" + "&".join(filter_params)
            
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PATCH":
            response = requests.patch(url, headers=headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            return f"Error: Unsupported method {method}"
        
        response.raise_for_status()
        return json.dumps(response.json(), indent=2)
    
    except requests.exceptions.RequestException as e:
        return f"Error: {str(e)}"


def sqlToRest(sql: str) -> str:
    """
    Convert SQL to REST API call (simplified version)
    
    Args:
        sql: SQL query string
    
    Returns:
        Result of the query or error message
    """
    try:
        # Simple SQL parsing for basic queries
        sql_lower = sql.lower().strip()
        
        if sql_lower.startswith("select"):
            # Extract table name from SELECT ... FROM table
            if "from" in sql_lower:
                table_part = sql_lower.split("from")[1].strip()
                table_name = table_part.split()[0].strip(";")
                
                # Apply basic WHERE clause
                filters = {}
                if "where" in sql_lower:
                    where_clause = sql_lower.split("where")[1].strip()
                    # Simple equality filter
                    if "=" in where_clause:
                        condition = where_clause.split("=")[0].strip()
                        value = where_clause.split("=")[1].strip().strip("'\"")
                        filters[condition] = value
                
                return postgrestRequest(table_name, "GET", filters=filters)
        
        return "Error: Complex SQL not supported in this simplified version"
    
    except Exception as e:
        return f"Error parsing SQL: {str(e)}"


def _resolve_path(path_str: str) -> Path:
    p = Path(path_str)
    if p.is_absolute():
        return p

    backend_dir = Path(__file__).parent
    repo_root = backend_dir.parent

    candidate = (backend_dir / p).resolve()
    if candidate.exists():
        return candidate

    name = p.name
    alt_name = name[1:] if name.startswith(".") else f".{name}"

    for base in (backend_dir, repo_root):
        for n in (name, alt_name):
            alt = (base / n).resolve()
            if alt.exists():
                return alt

    return candidate


def _load_mcp_server_config(mcp_config_path: str, server_name: str) -> Dict[str, Any]:
    cfg_path = _resolve_path(mcp_config_path)
    with cfg_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    servers = data.get("mcpServers") or {}
    if server_name not in servers:
        raise KeyError(f"MCP server '{server_name}' not found in {cfg_path}")
    return servers[server_name]


def _normalize_npx_command(command: str) -> str:
    if os.name == "nt" and command == "npx":
        return "npx.cmd"
    return command


def create_openai_model_client(model: Optional[str] = None) -> OpenAIChatCompletionClient:
    """Create OpenAI ChatGPT model client with proper configuration"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    
    return OpenAIChatCompletionClient(
        model=model or os.getenv("OPENAI_MODEL", "gpt-4"),
        api_key=api_key,
    )


def create_openrouter_model_client(model: Optional[str] = None) -> OpenAIChatCompletionClient:
    """Create OpenRouter model client with proper configuration"""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY environment variable not set")
    
    return OpenAIChatCompletionClient(
        model=model or "openai/gpt-oss-20b:free",
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        model_info=ModelInfo(
            function_calling=True,
            structured_output=True,
            json_output=True,
            vision=False,
            family="openai"
        ),
        max_tokens=2000  # Add token limit for OpenRouter too
    )


class AzureOpenAIClient:
    """Custom Azure OpenAI client that works with AutoGen"""
    
    def __init__(self, api_key: str, endpoint: str, deployment: str, api_version: str):
        self.api_key = api_key
        self.endpoint = endpoint
        self.deployment = deployment
        self.api_version = api_version
        self.base_url = f"{endpoint}/openai/deployments/{deployment}"
        # Add model_info attribute for AutoGen compatibility
        self.model_info = {
            "function_calling": True,
            "structured_output": True,
            "json_output": True,
            "vision": False,
            "family": "openai"
        }
    
    async def create(self, messages, **kwargs):
        """Create chat completion"""
        import requests
        
        # Rate limiting - wait 1 minute between calls
        global last_call_time
        current_time = time.time()
        if current_time - last_call_time < RATE_LIMIT_DELAY:
            wait_time = RATE_LIMIT_DELAY - (current_time - last_call_time)
            print(f"[Azure Client] Rate limiting: waiting {wait_time:.1f} seconds...")
            await asyncio.sleep(wait_time)
        
        last_call_time = time.time()
        
        headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        # Convert AutoGen messages to OpenAI format
        openai_messages = []
        for msg in messages:
            if isinstance(msg, dict):
                # If it's already a dict, use it directly
                openai_messages.append(msg)
            elif hasattr(msg, 'content'):
                # If it's an object with content attribute
                openai_messages.append({
                    "role": "user" if not hasattr(msg, 'source') or msg.source == "user" else "assistant",
                    "content": msg.content
                })
            else:
                # Convert to string and use as user message
                openai_messages.append({
                    "role": "user",
                    "content": str(msg)
                })
        
        # Ensure we have at least one message
        if not openai_messages:
            openai_messages = [{"role": "user", "content": "Please analyze the data."}]
        
        data = {
            "messages": openai_messages,
            "max_tokens": kwargs.get('max_tokens', 8192),  # Increased to 8192 tokens
            "temperature": kwargs.get('temperature', 0.7)
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions?api-version={self.api_version}",
                headers=headers,
                json=data
            )
            
            if response.status_code != 200:
                raise Exception(f"Azure OpenAI API error: {response.status_code} - {response.text}")
            
            result = response.json()
            print(f"[Azure Client] Raw response: {str(result)[:500]}...")
            
            # Create a proper model result that AutoGen expects
            try:
                from autogen_ext.models.openai._openai_client import ChatCompletion
            except ImportError:
                # Fallback: Create a simple mock ChatCompletion
                class ChatCompletion:
                    def __init__(self, choices, created, id, model, object, usage):
                        self.choices = choices
                        self.created = created
                        self.id = id
                        self.model = model
                        self.object = object
                        self.usage = usage
            
            choice = result.get('choices', [{}])[0]
            message = choice.get('message', {})
            content = message.get('content', '')
            
            print(f"[Azure Client] Extracted content: {content[:200]}...")
            
            if content:
                # Create a proper ChatCompletion object that AutoGen expects
                return ChatCompletion(
                    choices=[choice],
                    created=result.get('created'),
                    id=result.get('id'),
                    model=result.get('model'),
                    object=result.get('object'),
                    usage=result.get('usage', {})
                )
            else:
                print(f"[Azure Client] No content in response")
                # Return a mock result with empty content
                return ChatCompletion(
                    choices=[{"message": {"content": "No response generated", "role": "assistant"}}],
                    created=result.get('created'),
                    id=result.get('id'),
                    model=result.get('model'),
                    object=result.get('object'),
                    usage=result.get('usage', {})
                )
            
        except Exception as e:
            print(f"[Azure Client] Error: {str(e)}")
            return None


def create_azure_openai_model_client(model: Optional[str] = None) -> AzureOpenAIClient:
    """Create Azure OpenAI model client that works with AutoGen"""
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1")
    
    if not api_key or not endpoint:
        raise RuntimeError("AZURE_OPENAI_API_KEY and AZURE_OPENAI_API_ENDPOINT environment variables must be set")
    
    print(f"[Azure] Using endpoint: {endpoint}")
    print(f"[Azure] Using deployment: {deployment}")
    print(f"[Azure] Using API version: {api_version}")
    
    return AzureOpenAIClient(api_key, endpoint, deployment, api_version)


async def run_autogen_mcp_task(
    *,
    agent_name: str,
    system_prompt: str,
    task: str,
    user_id: str,
    mcp_config_path: Optional[str] = None,
    mcp_server_name: Optional[str] = None,
    tool_overrides: Optional[Dict[str, Tool]] = None,
    model: Optional[str] = None,
    use_azure: bool = False,
) -> str:
    """Run AutoGen task with Supabase API tools instead of MCP"""
    
    # Create model client (Azure OpenAI only)
    if use_azure and os.getenv("AZURE_OPENAI_API_KEY"):
        try:
            print("Using Azure OpenAI")
            model_client = create_azure_openai_model_client(model=model)
        except Exception as e:
            print(f"Azure OpenAI failed: {str(e)}")
            raise RuntimeError("Azure OpenAI is required but failed to initialize")
    else:
        raise RuntimeError("Azure OpenAI is required. Please set AZURE_OPENAI_API_KEY and use_azure=True")
    
    # Create tools as simple functions (AutoGen will handle them)
    tools = [postgrestRequest, sqlToRest]
    
    # Create agent with tools
    agent = AssistantAgent(
        name=agent_name,
        model_client=model_client,
        tools=tools,
        system_message=system_prompt,
        reflect_on_tool_use=False,
    )
    
    # Create a simple conversation and run it
    try:
        print(f"\n{'*'*80}")
        print(f"STARTING AGENT: {agent_name.upper()}")
        print(f"{'*'*80}")
        print(f"[AutoGen] Running task for {agent_name}")
        print(f"[AutoGen] Task: {task[:200]}...")
        print(f"[AutoGen] Full Task:\n{task}")
        print(f"{'*'*80}")
        
        # Create messages for the model
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": task}
        ]
        
        print(f"[AutoGen] Sending messages to Azure OpenAI...")
        print(f"[AutoGen] System prompt: {system_prompt[:100]}...")
        
        # Call the model client directly
        model_result = await model_client.create(messages)
        
        print(f"[AutoGen] Model result type: {type(model_result)}")
        print(f"[AutoGen] Model result: {str(model_result)[:200]}...")
        
        # Extract the response from the model result
        if hasattr(model_result, 'choices') and model_result.choices:
            choice = model_result.choices[0]
            if hasattr(choice, 'message') and choice.message:
                content = choice.message.content
                print(f"[AutoGen] Extracted content: {content[:200]}...")
                print(f"\n{'='*80}")
                print(f"AGENT {agent_name.upper()} RESPONSE:")
                print(f"{'='*80}")
                print(content)
                print(f"{'='*80}")
                print(f"END OF {agent_name.upper()} RESPONSE\n")
                
                # Write structured output to database if applicable
                if agent_name in ["budget_agent", "recommendation_agent", "pattern_agent", "risk_agent", "tax_agent", "volatility_agent", "financial_agent", "action_agent", "savings_investment_agent", "bill_payment_agent", "goals_agent"]:
                    await write_agent_output_to_db(user_id, agent_name, content)
                
                return content
        
        # Fallback extraction methods
        if hasattr(model_result, 'content'):
            return str(model_result.content)
        elif isinstance(model_result, str):
            return model_result
        else:
            print(f"[AutoGen] Could not extract content from result: {type(model_result)}")
            return "Analysis completed but no content generated"
        
    except Exception as e:
        print(f"[AutoGen] Error in agent execution: {str(e)}")
        import traceback
        traceback.print_exc()
        return f"Error during analysis: {str(e)}"
