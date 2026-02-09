import sys
from faster_whisper import WhisperModel

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 transcribe_whisper.py <audio_path>")
        sys.exit(1)

    audio_path = sys.argv[1]
    model = WhisperModel("small", device="cpu")  # change to device="cuda" if you have GPU

    segments, _ = model.transcribe(audio_path)
    text = " ".join(s.text.strip() for s in segments if s.text.strip())
    print(text)

if __name__ == "__main__":
    main()
