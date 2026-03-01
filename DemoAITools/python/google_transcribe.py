import os
from google import genai
from google.genai import types

# Initialize the client with your API key
client = genai.Client(api_key="YOUR_GEMINI_API_KEY")

def transcribe_audio(file_path):
    # Supported: mp3, wav, ogg, aac, flac
    mime_type = "audio/mpeg" if file_path.endswith(".mp3") else "audio/wav"
    
    with open(file_path, "rb") as f:
        audio_data = f.read()

    response = client.models.generate_content(
        model="gemini-2.0-flash", # Use 'flash' for speed/cost efficiency
        contents=[
            "Please provide a high-fidelity transcription of this audio. "
            "Identify speakers if possible and use timestamps.",
            types.Part.from_bytes(
                data=audio_data,
                mime_type=mime_type,
            ),
        ],
    )
    
    return response.text

if __name__ == "__main__":
    # Example usage: Replace with the path to your Node.js output
    audio_file = "recording.wav"
    if os.path.exists(audio_file):
        print(transcribe_audio(audio_file))
    else:
        print(f"Error: {audio_file} not found.")