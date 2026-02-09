import sys
from faster_whisper import WhisperModel

# Options: "tiny", "base", "small", "medium", "large-v3"
# Device: "cuda" for GPU (requires NVIDIA drivers) or "cpu"
model = WhisperModel("small")

# Transcribe the audio file provided as a command-line argument
segments, _ = model.transcribe(sys.argv[1])

#print the entire transcription
print(" ".join(s.text for s in segments))


#