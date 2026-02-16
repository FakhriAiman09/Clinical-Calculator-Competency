"""
Faster Whisper Speech-to-Text API
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import tempfile
import os
from typing import Optional
import time
import aiofiles

app = FastAPI(title="Faster Whisper API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model configuration
MODEL_SIZE = "small"
DEVICE = "cpu"
COMPUTE_TYPE = "int8"

print(f"Loading Faster Whisper model: {MODEL_SIZE}...")
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("Model loaded!")

@app.get("/")
def root():
    return {
        "status": "running",
        "model": MODEL_SIZE,
        "device": DEVICE
    }

@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        start_time = time.time()
        lang = None if language == "auto" or not language else language
        
        segments, info = model.transcribe(
            temp_path,
            language=lang,
            initial_prompt=prompt,
            beam_size=5,
            vad_filter=True,
        )
        
        transcription = ""
        for segment in segments:
            transcription += segment.text + " "
        
        transcription = transcription.strip()
        processing_time = time.time() - start_time
        
        os.unlink(temp_path)
        
        return {
            "text": transcription,
            "language": info.language,
            "duration": info.duration,
            "processing_time": processing_time,
            "model": MODEL_SIZE
        }
        
    except Exception as e:
        if 'temp_path' in locals():
            try:
                os.unlink(temp_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("🚀 Faster Whisper API")
    print("="*50)
    print(f"Model: {MODEL_SIZE}")
    print(f"Device: {DEVICE}")
    print(f"URL: http://localhost:8000")
    print("="*50 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)