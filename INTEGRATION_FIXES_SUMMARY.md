# Frontend-Backend Integration Fixes Summary

## Issues Fixed

### 1. ✅ Port Conflict Resolution
**Problem**: Both backend servers were trying to use port 8000, causing conflicts.

**Solution**: 
- AI Agent Backend (`backend/main.py`) → Port **8000**
- Transaction Parser API (`simple_api_server.py`) → Port **8001**

**Files Changed**:
- `simple_api_server.py`: Changed port from 8000 to 8001
- `frontend/src/components/TransactionInputCard.tsx`: Updated to use port 8001 with env var support

### 2. ✅ JSON Parsing Error Handling
**Problem**: API client attempted to parse JSON from all responses, causing errors when responses weren't JSON.

**Solution**: Added content-type checking before parsing JSON responses.

**Files Changed**:
- `frontend/src/services/api.ts`: Enhanced `makeRequest` method with proper content-type checking

### 3. ✅ CORS Configuration Consistency
**Problem**: CORS origins were inconsistent between backend servers.

**Solution**: Standardized CORS origins to match across all servers.

**Files Changed**:
- `simple_api_server.py`: Updated CORS origins to match `backend/main.py`

### 4. ✅ Environment Variable Support
**Problem**: Hardcoded API URLs made configuration difficult.

**Solution**: Added environment variable support for all API URLs.

**Files Changed**:
- `frontend/src/services/spareBackend.ts`: Added `VITE_SPARE_API_URL` support
- `frontend/src/components/TransactionInputCard.tsx`: Added `VITE_PARSER_API_URL` support
- `frontend/src/services/api.ts`: Already had `VITE_API_BASE_URL` support

## Current Configuration

### Backend Servers

1. **AI Agent Analysis Backend** (`backend/main.py`)
   - **Port**: 8000
   - **Base URL**: `http://localhost:8000`
   - **Endpoints**:
     - `POST /api/analyze` - Trigger analysis
     - `GET /api/status/{user_id}` - Get analysis status
     - `GET /api/health` - Health check

2. **Transaction Parser API** (`simple_api_server.py`)
   - **Port**: 8001
   - **Base URL**: `http://localhost:8001`
   - **Endpoints**:
     - `POST /api/parse-image` - Parse receipt images
     - `POST /api/parse-voice` - Parse voice recordings

### Frontend Configuration

**Environment Variables** (Optional - defaults work for local development):

Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_SPARE_API_URL=http://localhost:8000/api
VITE_PARSER_API_URL=http://localhost:8001/api
```

**Current Defaults**:
- Spare Backend: `http://localhost:8000/api`
- Parser API: `http://localhost:8001/api`
- Main API: `http://localhost:8000/api` (mostly unused - auth uses Supabase directly)

## Integration Flow

### Authentication Flow
```
Frontend → database.ts → Supabase (Direct)
```

### AI Analysis Flow
```
Frontend → spareBackendService.triggerAnalysis()
  → POST http://localhost:8000/api/analyze
    → Backend runs 9 agents in background
      → Agents write to Supabase database
Frontend → GET http://localhost:8000/api/status/{user_id} (polling)
Frontend → database.ts → Supabase (read results)
```

### Transaction Parsing Flow
```
Frontend → TransactionInputCard.tsx
  → POST http://localhost:8001/api/parse-image (or /parse-voice)
    → Parser API processes file
      → Returns structured transaction data
Frontend → database.ts → Supabase (save transaction)
```

## How to Run

### Terminal 1: AI Agent Backend
```bash
cd backend
python main.py
# Runs on http://localhost:8000
```

### Terminal 2: Transaction Parser API
```bash
python simple_api_server.py
# Runs on http://localhost:8001
```

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

## Testing the Integration

### Test AI Agent Backend
```bash
# Health check
curl http://localhost:8000/api/health

# Trigger analysis (replace USER_ID)
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"user_id": "your-user-id-here"}'

# Check status
curl http://localhost:8000/api/status/your-user-id-here
```

### Test Transaction Parser API
```bash
# Health check
curl http://localhost:8001/

# Parse image (replace with actual image file)
curl -X POST http://localhost:8001/api/parse-image \
  -F "file=@receipt.jpg"
```

## Verification Checklist

- [x] Port conflicts resolved (8000 vs 8001)
- [x] CORS properly configured on both servers
- [x] Frontend URLs match backend endpoints
- [x] Error handling improved (JSON parsing)
- [x] Environment variable support added
- [x] All endpoint paths verified matching

## Notes

- The `api.ts` service has many endpoints defined, but most are not used since authentication and data operations go directly through Supabase via `database.ts`
- The spare backend service is the main integration point between frontend and the AI agent backend
- Both backend servers need to be running for full functionality

