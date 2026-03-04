"""
Pattern Recognition Engine Agent
Analyzes transaction history to identify income patterns using LSTM-style analysis
Writes to: income_patterns table
"""

import asyncio
import json
from datetime import datetime
from typing import Optional
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from autogen_runtime import run_autogen_mcp_task


class PatternRecognitionAgent:
    """Pattern Recognition Agent for analyzing income patterns"""
    
    def __init__(self, mcp_servers=None):
        """Initialize the pattern recognition agent"""
        self.agent_name = "pattern_recognition"
        self.mcp_servers = mcp_servers
        self.system_prompt = self._create_system_prompt()
    
    def _create_system_prompt(self) -> str:
        """Create the system prompt for the pattern recognition agent"""
        return """You are a Pattern Recognition Agent specializing in income pattern analysis.

Your task is to analyze transaction data and identify income patterns including:
- Weekly income cycles
- Seasonal variations  
- Income stability metrics
- Trend analysis

You must output your analysis in JSON format with:
- user_id
- average_weekly_income
- income_volatility
- seasonal_factors
- confidence_score
- last_updated

Use the postgrestRequest tool to query the transactions table for income transactions."""

    async def analyze_user(self, user_id: str) -> dict:
        """
        Analyze transaction patterns for a specific user

        Args:
            user_id: UUID of the user to analyze

        Returns:
            dict with analysis results and success status
        """
        print(f"[Pattern Agent] Starting analysis for user {user_id}")

        try:
            # Create the analysis prompt
            prompt = f"""Analyze income patterns for user {user_id}.

Steps:
1. Query transactions table for this user (last 60 days)
2. Calculate income statistics  
3. Identify weekday patterns
4. Detect trends
5. Write results to income_patterns table
6. Log to agent_logs table

User ID: {user_id}

Please execute this analysis and report what you found."""

            result = await run_autogen_mcp_task(
                agent_name="pattern_agent",
                system_prompt=self.system_prompt,
                task=prompt,
                user_id=user_id,
                use_azure=True
            )

            print(f"[Pattern Agent] Analysis complete for user {user_id}")

            return {
                "success": True,
                "user_id": user_id,
                "agent": "pattern_recognition",
                "result": result,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            print(f"[Pattern Agent] Error analyzing user {user_id}: {str(e)}")
            return {
                "success": False,
                "user_id": user_id,
                "agent": "pattern_recognition",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


async def main():
    """Test the pattern recognition agent"""
    agent = PatternRecognitionAgent()

    # Test with the example user
    test_user_id = "153735c8-b1e3-4fc6-aa4e-7deb6454990b"

    print(f"Testing Pattern Recognition Agent with user {test_user_id}")
    result = await agent.analyze_user(test_user_id)

    print("\nResult:")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
