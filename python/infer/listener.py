'''
This script connects to the Supabase Realtime server and listens for new form responses.

Required environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- GOOGLE_GENAI_API_KEY
'''

import asyncio
import os
import time

import tensorflow_text as text
from dotenv import load_dotenv
from google import genai
import supabase as spb

from inference import (bert_infer, download_bert_model, download_svm_models,
                       generate_report_summary, load_bert_model,
                       load_svm_models, svm_infer)

BERT_MODEL_PATH = '/app/models/bert'
SVM_MODELS_PATH = 'svm-models'


def wait_for_models(timeout_minutes: int = 60) -> None:
  """
  Waits until model files are present on disk.
  This allows time to manually copy models into a Railway volume after deploy.
  Checks every 30 seconds, times out after timeout_minutes.
  """
  deadline = time.time() + timeout_minutes * 60
  bert_ready = False
  svm_ready = False

  print(f"Waiting for model files (timeout: {timeout_minutes} min)...", flush=True)

  while time.time() < deadline:
    bert_ready = (
      os.path.exists(BERT_MODEL_PATH) and
      os.path.exists(os.path.join(BERT_MODEL_PATH, 'saved_model.pb'))
    )
    svm_ready = (
      os.path.exists(SVM_MODELS_PATH) and
      any(f.endswith('.pkl') for f in os.listdir(SVM_MODELS_PATH))
    ) if os.path.exists(SVM_MODELS_PATH) else False

    if bert_ready and svm_ready:
      print("Model files found!", flush=True)
      return

    status = []
    if not bert_ready:
      status.append("BERT model missing")
    if not svm_ready:
      status.append("SVM models missing")
    print(f"  Still waiting: {', '.join(status)} — retrying in 30s...", flush=True)
    time.sleep(30)

  raise TimeoutError(
    f"Model files not found after {timeout_minutes} minutes. "
    f"Please copy models into the volume at {BERT_MODEL_PATH} and {SVM_MODELS_PATH}."
  )


async def main() -> None:
  print("Loading environment variables...")
  load_dotenv()

  supabase_url: str = os.environ.get("SUPABASE_URL", "")
  if not supabase_url:
    raise ValueError("SUPABASE_URL environment variable is not set")

  supabase_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
  if not supabase_key:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is not set")

  gemini_key: str = os.environ.get("GOOGLE_GENAI_API_KEY", "")
  if not gemini_key:
    raise ValueError("GOOGLE_GENAI_API_KEY environment variable is not set")

  print("Environment variables loaded.")

  gemini = genai.Client(api_key=gemini_key)
  supabase: spb.Client = spb.create_client(supabase_url, supabase_key)
  asupabase: spb.AClient = await spb.acreate_client(supabase_url, supabase_key)

  # ── Wait for models to be available ───────────────────────────────────────
  # On Railway with a volume: models are copied in via SSH after first deploy.
  # On local dev: models are mounted via Docker volume — already present.
  # Either way, wait up to 60 minutes before giving up.
  wait_for_models(timeout_minutes=60)

  # ── Load models into memory ────────────────────────────────────────────────
  print("Loading SVM models...")
  svm_models = load_svm_models()

  print("Loading BERT model...")
  bert_model = load_bert_model(BERT_MODEL_PATH)

  # ── Connect to Supabase Realtime ───────────────────────────────────────────
  print("Connecting to Supabase Realtime server...", end=' ')
  await asupabase.realtime.connect()
  print("Connected.")

  print('Subscribing to the "form_responses_insert" channel...', end=' ')
  await (asupabase.realtime
         .channel("form_responses_insert")
         .on_postgres_changes("INSERT",
                              schema="public", table="form_responses",
                              callback=lambda payload:
                              handle_new_response(payload, bert_model, svm_models, supabase))
         .subscribe())
  print('Subscribed.')

  print('Subscribing to the "student_reports_insert" channel...', end=' ')
  await (asupabase.realtime
         .channel("student_reports_insert")
         .on_postgres_changes("INSERT",
                              schema="public", table="student_reports",
                              callback=lambda payload:
                              handle_new_report(payload, gemini, supabase))
         .subscribe())
  print('Subscribed.')

  print('Listening for events...', flush=True)
  while True:
    await asyncio.sleep(1)


def handle_new_response(payload, bert_model, svm_models, supabase) -> None:
  record = payload['data']['record']
  print('New response received:', record['response_id'])

  response = record['response']['response']
  print("Processing response", response)

  ds = [kf for kf in response.values()]
  bert_inputs = {k: v['text'] for d in ds for k, v in d.items()}
  svm_inputs = {k: [vv for kk, vv in v.items() if kk != 'text'] for d in ds for k, v in d.items()}
  bert_res = bert_infer(bert_model, bert_inputs)
  svms_res = svm_infer(svm_models, svm_inputs)

  def weighted_average(bert: float, svm: float) -> float:
    return bert * 0.25 + svm * 0.75

  res = {k: weighted_average(bert=v, svm=svms_res[k]) for k, v in bert_res.items()}

  (supabase.table("form_results")
   .insert({"response_id": record['response_id'], "results": res})
   .execute())
  print('Results written to form_results successfully.', flush=True)


def handle_new_report(payload, gemini, supabase) -> None:
  record = payload['data']['record']
  report_id = record['id']
  print('New report received:', report_id, flush=True)

  try:
    (supabase.table("student_reports")
     .update({"llm_feedback": "Generating..."})
     .eq("id", report_id)
     .execute())

    time.sleep(2)
    full_row = (supabase.table("student_reports")
     .select("kf_avg_data")
     .eq("id", report_id)
     .single()
     .execute())

    data = full_row.data.get('kf_avg_data') if full_row.data else None
    print('kf_avg_data:', data, flush=True)

    if not data:
      print('ERROR: kf_avg_data is empty', flush=True)
      (supabase.table("student_reports")
       .update({"llm_feedback": "No assessment data found for this time range."})
       .eq("id", report_id)
       .execute())
      return

    print('Calling Gemini...', flush=True)
    summary = generate_report_summary(data, gemini)
    print('Gemini response received.', flush=True)

    (supabase.table("student_reports")
     .update({"llm_feedback": summary})
     .eq("id", report_id)
     .execute())
    print('AI feedback written successfully.', flush=True)

  except Exception as e:
    print(f'ERROR in handle_new_report: {e}', flush=True)
    (supabase.table("student_reports")
     .update({"llm_feedback": f"Error generating feedback: {str(e)}"})
     .eq("id", report_id)
     .execute())


if __name__ == "__main__":
  asyncio.run(main())