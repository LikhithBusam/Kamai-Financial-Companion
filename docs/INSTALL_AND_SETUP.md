# Installation and Setup Guide

## Step 1: Install Python Dependencies

Open your terminal/command prompt and run:

```bash
pip install -r transaction_parser_requirements.txt
```

**Or if you're using a virtual environment:**

```bash
# Activate your virtual environment first (if you have one)
# Windows:
venv\Scripts\activate

# Linux/Mac:
source venv/bin/activate

# Then install:
pip install -r transaction_parser_requirements.txt
```

**Note:** First installation may take 5-10 minutes as it downloads large model files (~2-5 GB).

## Step 2: Test the Parser

Test that everything works:

```bash
python test_transaction_parser.py
```

This will test text parsing (no files needed). You should see parsed transaction data.

## Step 3: Start the API Server

Start the API server that the frontend will connect to:

```bash
python simple_api_server.py
```

The server will start at: **http://localhost:8001** (not 8000 — `backend/main.py`, the live agent-analysis backend, owns port 8000)

You should see:
```
Starting Transaction Parser API Server
============================================================

Endpoints:
  POST /api/parse-image - Parse receipt/bill images
  POST /api/parse-voice - Parse voice recordings

Server will be available at: http://localhost:8001
API docs at: http://localhost:8001/docs
```

## Step 4: Update Frontend API URL (if needed)

The frontend is configured to use `http://localhost:8001/api` by default.

If your API server runs on a different port, set `VITE_PARSER_API_URL` in
`frontend/.env.local` (see `frontend/src/components/TransactionInputCard.tsx`).

## Step 5: Start Your Frontend

In a separate terminal, start your frontend:

```bash
cd frontend
npm run dev
```

## Step 6: Test in Browser

1. Go to your Dashboard page
2. Click on the "Image" tab
3. Upload a receipt/bill image
4. Wait for processing (2-5 seconds)
5. Review the extracted data in the manual form
6. Confirm and submit

Or test voice:
1. Click on the "Voice" tab
2. Click "Start Recording"
3. Say something like: "I spent 500 rupees on food at McDonald's"
4. Click "Stop Recording"
5. Wait for processing (3-7 seconds)
6. Review and confirm

## Troubleshooting

### "Failed to process image/voice"
- Make sure the API server is running (`python simple_api_server.py`)
- Check that the server is on port 8001
- Check browser console for detailed errors

### "Could not access microphone"
- Allow microphone permissions in your browser
- Make sure you're using HTTPS or localhost (required for microphone access)

### Models downloading slowly
- First run downloads ~2-5 GB of models
- This only happens once, models are cached after
- Be patient, it may take 5-10 minutes

### Out of memory errors
- Close other applications
- Use smaller models (edit `transaction_parser.py` to use `whisper-tiny` instead of `whisper-small`)
- Enable model quantization (advanced)

### CORS errors
- Make sure CORS is enabled in `simple_api_server.py`
- Check that your frontend URL is in the `allow_origins` list

## Quick Commands Summary

```bash
# Install dependencies
pip install -r transaction_parser_requirements.txt

# Test parser
python test_transaction_parser.py

# Start API server
python simple_api_server.py

# In another terminal - Start frontend
cd frontend
npm run dev
```

## What's Integrated?

✅ **Frontend Integration Complete:**
- Image upload handler calls API and fills form
- Voice recording handler calls API and fills form
- Both switch to manual tab for user review
- Error handling and loading states
- Confidence scores displayed

✅ **Backend Ready:**
- Python parser with OCR + STT + LLM
- FastAPI server with CORS enabled
- Error handling and validation

You're all set! 🎉

