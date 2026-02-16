"""
Optimized Faster Whisper Real-Time Transcription Microservice
Lightweight, fast, and production-ready
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import tempfile
import os
from typing import Optional
import time
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Faster Whisper Real-Time API")

# CORS - Allow your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# MODEL CONFIGURATION - OPTIMIZED FOR SPEED
# ============================================
MODEL_SIZE = "base"  # Options: tiny, base, small
DEVICE = "cpu"       # Change to "cuda" if you have GPU
COMPUTE_TYPE = "int8"  # int8 quantization for speed

logger.info(f"Loading Faster Whisper model: {MODEL_SIZE} ({COMPUTE_TYPE})...")
model = WhisperModel(
    MODEL_SIZE,
    device=DEVICE,
    compute_type=COMPUTE_TYPE,
    num_workers=2,  # Parallel processing
    download_root=None,  # Use default cache
)
logger.info("Model loaded successfully!")


@app.get("/")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": MODEL_SIZE,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
        "message": "Faster Whisper Real-Time API is running"
    }


@app.post("/transcribe/realtime")
async def transcribe_realtime(
    file: UploadFile = File(...),
    language: Optional[str] = Form("auto"),
):
    """
    Real-time transcription endpoint
    Optimized for low latency with aggressive VAD
    """
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        # Save uploaded audio chunk
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        start_time = time.time()
        
        # Determine language
        lang = None if language == "auto" else language
        
        # OPTIMIZED TRANSCRIPTION SETTINGS
        segments, info = model.transcribe(
            temp_path,
            language=lang,
            beam_size=1,  # Fastest (1 is fastest, 5 is default)
            best_of=1,    # No additional candidates
            temperature=0.0,  # Deterministic
            vad_filter=True,  # Voice Activity Detection
            vad_parameters=dict(
                min_silence_duration_ms=300,  # Aggressive silence detection
                threshold=0.5,  # Sensitivity
            ),
            condition_on_previous_text=False,  # Faster for short chunks
            compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0,
            no_speech_threshold=0.6,
        )
        
        # Collect transcription
        transcription = " ".join(segment.text.strip() for segment in segments).strip()
        
        processing_time = time.time() - start_time
        
        # Cleanup
        os.unlink(temp_path)
        
        # Log performance
        logger.info(f"Transcribed in {processing_time:.2f}s | Text: {transcription[:50]}...")
        
        return {
            "text": transcription,
            "language": info.language,
            "language_probability": info.language_probability,
            "processing_time": processing_time,
        }
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        if 'temp_path' in locals():
            try:
                os.unlink(temp_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/transcribe/batch")
async def transcribe_batch(
    file: UploadFile = File(...),
    language: Optional[str] = Form("auto"),
):
    """
    Batch transcription for longer audio
    Higher quality settings
    """
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        start_time = time.time()
        lang = None if language == "auto" else language
        
        # HIGHER QUALITY SETTINGS
        segments, info = model.transcribe(
            temp_path,
            language=lang,
            beam_size=5,  # Better accuracy
            best_of=5,
            temperature=[0.0, 0.2, 0.4, 0.6, 0.8, 1.0],  # Multiple attempts
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=500,
            ),
        )
        
        transcription = " ".join(segment.text.strip() for segment in segments).strip()
        processing_time = time.time() - start_time
        
        os.unlink(temp_path)
        
        return {
            "text": transcription,
            "language": info.language,
            "language_probability": info.language_probability,
            "processing_time": processing_time,
        }
        
    except Exception as e:
        logger.error(f"Batch transcription error: {str(e)}")
        if 'temp_path' in locals():
            try:
                os.unlink(temp_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.get("/status")
def get_status():
    """Get current service status"""
    return {
        "model": MODEL_SIZE,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
        "available": True,
    }


if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "="*60)
    print(" Faster Whisper Real-Time Transcription Service")
    print("="*60)
    print(f"Model: {MODEL_SIZE}")
    print(f"Device: {DEVICE}")
    print(f"Compute: {COMPUTE_TYPE}")
    print(f"URL: http://localhost:8000")
    print(f"Docs: http://localhost:8000/docs")
    print("="*60 + "\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True,
    )