// Flowchart Data for KAMAI Financial Companion
// These diagrams describe the system as actually built (see CLAUDE.md) --
// not an aspirational roadmap. No offline mode, no emergency fast-track, no
// continuous-learning loop, no 24/7 monitoring: none of that exists. What's
// here is real and verified live against the running app.
export interface FlowchartData {
  title: string;
  description: string;
  icon: string;
  color: string;
  code: string;
}

export const flowchartData: Record<string, FlowchartData> = {
  main: {
    title: "Main System Architecture",
    description: "How a transaction becomes a financial analysis",
    icon: "Layout",
    color: "from-slate-600 to-slate-800",
    code: `graph TB
    User["👤 User"]
    Frontend["💻 Frontend<br/>React + Supabase client"]
    DB[("🗄️ Supabase<br/>Postgres + Auth + RLS")]
    Backend["⚙️ Backend<br/>FastAPI, rate-limited 1/min"]
    Orchestrator["🧠 Agent Orchestrator<br/>9 agents"]
    LLM["✨ Gemini 2.5 Flash<br/>+ Groq fallback<br/>narrative text only"]

    User --> Frontend
    Frontend -->|reads/writes directly| DB
    Frontend -->|POST /api/analyze| Backend
    Backend --> Orchestrator
    Orchestrator -->|fetch real transactions/profile| DB
    Orchestrator -->|compute real numbers| Orchestrator
    Orchestrator -.->|phrase already-computed numbers| LLM
    Orchestrator -->|write results| DB
    DB -->|poll /api/status, then read directly| Frontend

    style User fill:#f1f5f9,stroke:#334155,stroke-width:3px
    style Frontend fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff
    style DB fill:#059669,stroke:#047857,stroke-width:3px,color:#fff
    style Backend fill:#64748b,stroke:#475569,stroke-width:2px,color:#fff
    style Orchestrator fill:#475569,stroke:#334155,stroke-width:3px,color:#fff
    style LLM fill:#7c3aed,stroke:#6b21a8,stroke-width:2px,color:#fff`
  },

  phase0: {
    title: "Data Input Methods",
    description: "Three real ways to log a transaction",
    icon: "Database",
    color: "from-slate-600 to-slate-700",
    code: `graph TB
    User["👤 Gig Worker"]

    User --> Manual["📝 Manual Entry<br/>Amount, type, category, date/time"]
    User --> Photo["📸 Receipt Photo<br/>TrOCR + Phi-3-mini extraction"]
    User --> Voice["🎤 Voice Input<br/>Whisper speech-to-text + Phi-3-mini"]

    Manual --> Table[("transactions table<br/>Supabase Postgres")]
    Photo --> Parser["Parser service<br/>separate FastAPI, :8001"]
    Voice --> Parser
    Parser --> Review["User reviews &<br/>confirms extracted fields"]
    Review --> Table

    Table --> Agents["Feeds the 9-agent<br/>analysis pipeline"]

    style User fill:#e0f2fe,stroke:#0369a1,stroke-width:3px
    style Table fill:#059669,stroke:#047857,stroke-width:3px,color:#fff
    style Parser fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff`
  },

  features: {
    title: "Core Features Overview",
    description: "What each agent actually computes",
    icon: "Zap",
    color: "from-emerald-600 to-emerald-700",
    code: `graph LR
    User["👤 Gig Worker"]

    User --> Income["💰 Income Tracking<br/>• Daily earnings by category<br/>• Weekday income pattern<br/>• Volatility (statistics)"]

    User --> Budget["📊 Smart Budgeting<br/>• Feast/famine/monthly splits<br/>• Sized from real income spread<br/>• Fixed + variable cost tracking"]

    User --> Tax["📄 Tax Planning<br/>• Presumptive tax (44AD/44ADA)<br/>• New Regime slabs + 87A rebate<br/>• Liability calculation, not e-filing"]

    User --> Risk["🛡️ Risk & Savings<br/>• DTI, emergency fund coverage<br/>• Composite risk score<br/>• Investment recommendations"]

    Income --> Compute["🔢 Deterministic Python<br/>finance_helpers.py"]
    Budget --> Compute
    Tax --> Compute
    Risk --> Compute

    Compute --> Narrative["💡 LLM Narrative<br/>Gemini/Groq phrase the<br/>already-computed numbers"]

    style User fill:#f3f4f6,stroke:#374151,stroke-width:3px
    style Income fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
    style Budget fill:#0891b2,stroke:#0e7490,stroke-width:2px,color:#fff
    style Tax fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#fff
    style Risk fill:#7c3aed,stroke:#6b21a8,stroke-width:2px,color:#fff
    style Compute fill:#374151,stroke:#1f2937,stroke-width:3px,color:#fff
    style Narrative fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff`
  }
};

export type FlowchartKey = keyof typeof flowchartData;
