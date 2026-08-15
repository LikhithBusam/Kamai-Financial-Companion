# Quick Start - Transaction Parser

## What Was Created

1. **`transaction_parser.py`** - Main parser implementation
2. **`transaction_parser_requirements.txt`** - Required Python packages
3. **`test_transaction_parser.py`** - Test script
4. **`simple_api_server.py`** - Optional API server for frontend integration
5. **`TRANSACTION_PARSER_README.md`** - Full documentation

## Quick Setup (3 Steps)

### Step 1: Install Dependencies
```bash
pip install -r transaction_parser_requirements.txt
```

### Step 2: Test It Works
```bash
python test_transaction_parser.py
```

This will test text parsing (no files needed). You should see parsed transaction data.

### Step 3: Start API Server (Optional)
```bash
python simple_api_server.py
```

Then access:
- API: http://localhost:8001
- Docs: http://localhost:8001/docs

(Runs on 8001, not 8000 — `backend/main.py`, the live agent-analysis backend, owns port 8000.)

## How It Works

### Image Parsing Flow:
1. User uploads receipt/bill image
2. TrOCR extracts text from image
3. Phi-3-mini LLM parses text to structured data
4. Returns JSON with transaction fields
5. Frontend fills manual form
6. User confirms and submits

### Voice Parsing Flow:
1. User records voice (e.g., "I spent 500 rupees on food")
2. Whisper converts speech to text
3. Phi-3-mini LLM parses text to structured data
4. Returns JSON with transaction fields
5. Frontend fills manual form
6. User confirms and submits

## Example Output

```json
{
  "amount": 500.00,
  "transaction_type": "expense",
  "category": "Food",
  "merchant_name": "McDonald's",
  "description": "Lunch at McDonald's",
  "payment_method": "UPI",
  "location": "",
  "transaction_date": "2024-01-15",
  "transaction_time": "14:30",
  "confidence": 0.85
}
```

## Next Steps

1. **Test with real images/audio**: Uncomment test functions in `test_transaction_parser.py`
2. **Integrate with frontend**: See `TRANSACTION_PARSER_README.md` for integration guide
3. **Customize parsing**: Modify the LLM prompt in `transaction_parser.py` if needed

## Troubleshooting

- **First run is slow**: Models are downloading (~2-5 GB)
- **Out of memory**: Use smaller models or enable quantization
- **Poor accuracy**: Ensure clear images/audio, or adjust prompts

## Models Used (All Free)

- OCR: `microsoft/trocr-base-printed`
- Speech-to-Text: `openai/whisper-small`
- Text Parsing: `microsoft/Phi-3-mini-4k-instruct`

All models run locally using your Hugging Face token.

