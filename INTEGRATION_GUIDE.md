# Frontend-Backend Integration Guide

## Architecture Overview

This project has **two separate backend servers** that serve different purposes:

### 1. AI Agent Analysis Backend (`backend/main.py`)
**Port: 8000**

Purpose: Orchestrates 9 AI agents for financial analysis

Endpoints:
- `POST /api/analyze` - Trigger analysis for a user
- `GET /api/status/{user_id}` - Get analysis status
- `GET /api/health` - Health check
- `GET /` - Root endpoint

### 2. Transaction Parser API (`simple_api_server.py`)
**Port: 8001** ⚠️ **Changed from 8000 to avoid conflict**

Purpose: Parses receipt images and voice recordings to extract transaction data

Endpoints:
- `POST /api/parse-image` - Parse receipt/bill images
- `POST /api/parse-voice` - Parse voice recordings
- `GET /` - Root endpoint

## Frontend Configuration

### Environment Variables

Create a `.env` file in the `frontend` directory:

```env
# Optional: Override default API URLs
VITE_API_BASE_URL=http://localhost:8000/api
VITE_SPARE_API_URL=http://localhost:8000/api
VITE_PARSER_API_URL=http://localhost:8001/api
```

### Current Configuration

- **Spare Backend (AI Agents)**: `http://localhost:8000/api` (configurable via `VITE_SPARE_API_URL`)
- **Transaction Parser**: `http://localhost:8001/api` (configurable via `VITE_PARSER_API_URL`) ✅ **Updated**
- **Main API Service**: `http://localhost:8000/api` (in `api.ts`, configurable via `VITE_API_BASE_URL`, mostly unused - auth uses Supabase directly)

## Data Flow

### Authentication Flow
1. User signs up/logs in via `frontend/src/services/database.ts`
2. Authentication happens directly with Supabase (not through backend)
3. User ID stored in `localStorage`
4. After login, triggers AI analysis via spare backend

### AI Analysis Flow
1. Frontend calls `spareBackendService.triggerAnalysis(user_id)`
2. Backend (`main.py`) receives request at `POST /api/analyze`
3. Backend runs 9 agents in background
4. Agents write results to Supabase database
5. Frontend polls `GET /api/status/{user_id}` for progress
6. Frontend reads results directly from Supabase via `database.ts`

### Transaction Parsing Flow
1. User uploads image/voice via `TransactionInputCard.tsx`
2. Frontend sends to `POST /api/parse-image` or `/api/parse-voice`
3. Parser API processes and extracts transaction data
4. Frontend receives structured transaction data
5. Frontend saves to Supabase via `database.ts`

## Running the Servers

### Terminal 1: AI Agent Backend
```bash
cd backend
python main.py
# Or: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2: Transaction Parser API
```bash
python simple_api_server.py
# Runs on port 8001
```

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
# Runs on port 5173
```

## CORS Configuration

Both backend servers have CORS configured to allow:
- `http://localhost:5173` (Vite default)
- `http://localhost:3000` (React default)
- `http://127.0.0.1:5173`
- `http://127.0.0.1:3000`

## Known Issues Fixed

1. ✅ **JSON Parsing Error**: Fixed error handling in `api.ts` to check content-type before parsing
2. ✅ **Port Conflict**: Changed parser API port from 8000 to 8001
3. ✅ **CORS Consistency**: Updated CORS origins to match between servers

## Completed Tasks

1. ✅ **Update Parser URL**: Changed `TransactionInputCard.tsx` to use port 8001
2. ✅ **Environment Variables**: Made all API URLs configurable via env vars
3. ✅ **Error Handling**: Improved JSON parsing with content-type checking
4. ✅ **CORS Configuration**: Standardized CORS across all servers

