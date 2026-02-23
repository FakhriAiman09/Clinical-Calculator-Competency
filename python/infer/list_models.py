import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.environ.get("GOOGLE_GENAI_API_KEY", "")
if not api_key:
    print("ERROR: GOOGLE_GENAI_API_KEY not set in .env")
    exit(1)

client = genai.Client(api_key=api_key)
print("Models available for your API key:\n")
for m in client.models.list():
    if hasattr(m, 'name'):
        print(m.name)