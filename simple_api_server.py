"""
Simple API Server for Transaction Parser
=========================================

A minimal FastAPI server to expose the transaction parser as HTTP endpoints.
This allows the frontend to call the parser via API.

Usage:
    uvicorn simple_api_server:app --reload --port 8000
"""

import os
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transaction_parser import TransactionParser
import uvicorn

app = FastAPI()

# Enable CORS for frontend. Defaults to the frontend's actual dev port
# (8080, see frontend/vite.config.ts); production deployments must set
# CORS_ALLOWED_ORIGINS to the real deployed frontend origin(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:8080").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize parser (models loaded on first use)
parser = TransactionParser()

@app.get("/")
def root():
    return {
        "message": "Transaction Parser API",
        "endpoints": {
            "parse_image": "/api/parse-image",
            "parse_voice": "/api/parse-voice"
        }
    }

@app.post("/api/parse-image")
async def parse_image(file: UploadFile = File(...)):
    """
    Parse an image (receipt/bill) to extract transaction details.
    
    Accepts: JPEG, PNG, BMP, TIFF
    Returns: JSON with transaction fields
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as tmp_file:
        tmp_path = tmp_file.name
        
        try:
            # Save uploaded file
            content = await file.read()
            tmp_file.write(content)
            tmp_file.flush()
            
            # Parse image
            result = parser.parse_image(tmp_path)
            
            return result
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
        
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

@app.post("/api/parse-voice")
async def parse_voice(file: UploadFile = File(...)):
    """
    Parse a voice recording to extract transaction details.
    
    Accepts: WAV, MP3, FLAC
    Returns: JSON with transaction fields
    """
    # Validate file type
    valid_audio_types = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/flac", "audio/x-wav"]
    if not file.content_type or file.content_type not in valid_audio_types:
        raise HTTPException(status_code=400, detail="File must be an audio file (WAV, MP3, FLAC)")
    
    # Create temporary file
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'wav'
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as tmp_file:
        tmp_path = tmp_file.name
        
        try:
            # Save uploaded file
            content = await file.read()
            tmp_file.write(content)
            tmp_file.flush()
            
            # Parse audio
            result = parser.parse_voice(tmp_path)
            
            return result
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
        
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

if __name__ == "__main__":
    print("\n" + "="*60)
    print("Starting Transaction Parser API Server")
    print("="*60)
    print("\nEndpoints:")
    print("  POST /api/parse-image - Parse receipt/bill images")
    print("  POST /api/parse-voice - Parse voice recordings")
    print("\nServer will be available at: http://localhost:8001")
    print("API docs at: http://localhost:8001/docs")
    print("\n" + "-"*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)

