'''
This script connects to the Supabase Realtime server and listens for new form responses.

Required environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- GOOGLE_GENAI_API_KEY
'''

import asyncio
import logging
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

# ── Logging setup ──────────────────────────────────────────────────────────────
os.makedirs('/app/logs', exist_ok=True)

def make_logger(name: str, filename: str) -> logging.Logger:
  logger = logging.getLogger(name)
  logger.setLevel(logging.DEBUG)
  formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')

  # File handler
  fh = logging.FileHandler(f'/app/logs/{filename}')
  fh.setFormatter(formatter)
  logger.addHandler(fh)

  # Console handler (shows in docker logs)
  ch = logging.StreamHandler()
  ch.setFormatter(formatter)
  logger.addHandler(ch)

  return logger

app_log = make_logger('app', 'app.log')           # general startup & connection events
infer_log = make_logger('inference', 'inference.log')  # every inference run & scores
error_log = make_logger('error', 'error.log')     # errors and crashes only
error_log.setLevel(logging.ERROR)

# ── Model wait ─────────────────────────────────────────────────────────────────

def wait_for_models(timeout_minutes: int = 60) -> None:
  """
  Waits until model files are present on disk.
  This allows time to manually copy models into a Railway volume after deploy.
  Checks every 30 seconds, times out after timeout_minutes.
  """
  deadline = time.time() + timeout_minutes * 60
  bert_ready = False
  svm_ready = False

  app_log.info(f'Waiting for model files (timeout: {timeout_minutes} min)...')

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
      app_log.info('Model files found!')
      return

    status = []
    if not bert_ready:
      status.append('BERT model missing')
    if not svm_ready:
      status.append('SVM models missing')
    app_log.warning(f'Still waiting: {", ".join(status)} — retrying in 30s...')
    time.sleep(30)

  msg = (
    f'Model files not found after {timeout_minutes} minutes. '
    f'Please copy models into the volume at {BERT_MODEL_PATH} and {SVM_MODELS_PATH}.'
  )
  error_log.error(msg)
  raise TimeoutError(msg)


# ── Main ───────────────────────────────────────────────────────────────────────

async def main() -> None:
  app_log.info('Loading environment variables...')
  load_dotenv()

  supabase_url: str = os.environ.get('SUPABASE_URL', '')
  if not supabase_url:
    error_log.error('SUPABASE_URL environment variable is not set')
    raise ValueError('SUPABASE_URL environment variable is not set')

  supabase_key: str = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
  if not supabase_key:
    error_log.error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
    raise ValueError('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')

  gemini_key: str = os.environ.get('GOOGLE_GENAI_API_KEY', '')
  if not gemini_key:
    error_log.error('GOOGLE_GENAI_API_KEY environment variable is not set')
    raise ValueError('GOOGLE_GENAI_API_KEY environment variable is not set')

  app_log.info('Environment variables loaded.')

  gemini = genai.Client(api_key=gemini_key)
  supabase: spb.Client = spb.create_client(supabase_url, supabase_key)
  asupabase: spb.AClient = await spb.acreate_client(supabase_url, supabase_key)

  wait_for_models(timeout_minutes=60)

  app_log.info('Loading SVM models...')
  svm_models = load_svm_models()
  app_log.info('All SVM models loaded successfully.')

  app_log.info('Loading BERT model...')
  bert_model = load_bert_model(BERT_MODEL_PATH)
  app_log.info('BERT model loaded successfully.')

  app_log.info('Connecting to Supabase Realtime server...')
  await asupabase.realtime.connect()
  app_log.info('Connected to Supabase Realtime.')

  app_log.info('Subscribing to "form_responses_insert" channel...')
  await (asupabase.realtime
         .channel('form_responses_insert')
         .on_postgres_changes('INSERT',
                              schema='public', table='form_responses',
                              callback=lambda payload:
                              handle_new_response(payload, bert_model, svm_models, supabase))
         .subscribe())
  app_log.info('Subscribed to form_responses_insert.')

  app_log.info('Subscribing to "student_reports_insert" channel...')
  await (asupabase.realtime
         .channel('student_reports_insert')
         .on_postgres_changes('INSERT',
                              schema='public', table='student_reports',
                              callback=lambda payload:
                              handle_new_report(payload, gemini, supabase))
         .subscribe())
  app_log.info('Subscribed to student_reports_insert.')

  app_log.info('Listening for events...')
  while True:
    await asyncio.sleep(1)


# ── Event handlers ─────────────────────────────────────────────────────────────

def handle_new_response(payload, bert_model, svm_models, supabase) -> None:
  try:
    record = payload['data']['record']
    response_id = record['response_id']
    infer_log.info(f'New form response received: {response_id}')

    response = record['response']['response']

    ds = [kf for kf in response.values()]
    bert_inputs = {k: v['text'] for d in ds for k, v in d.items()}
    svm_inputs = {k: [vv for kk, vv in v.items() if kk != 'text'] for d in ds for k, v in d.items()}

    infer_log.info(f'[{response_id}] Running BERT inference...')
    bert_res = bert_infer(bert_model, bert_inputs)
    infer_log.info(f'[{response_id}] BERT results: {bert_res}')

    infer_log.info(f'[{response_id}] Running SVM inference...')
    svms_res = svm_infer(svm_models, svm_inputs)
    infer_log.info(f'[{response_id}] SVM results: {svms_res}')

    def weighted_average(bert: float, svm: float) -> float:
      return bert * 0.25 + svm * 0.75

    res = {k: weighted_average(bert=v, svm=svms_res[k]) for k, v in bert_res.items()}
    infer_log.info(f'[{response_id}] Final weighted results: {res}')

    (supabase.table('form_results')
     .insert({'response_id': response_id, 'results': res})
     .execute())
    infer_log.info(f'[{response_id}] Results written to form_results successfully.')

  except Exception as e:
    error_log.exception(f'Error in handle_new_response: {e}')


def handle_new_report(payload, gemini, supabase) -> None:
  record = payload['data']['record']
  report_id = record['id']
  app_log.info(f'New report received: {report_id}')

  try:
    (supabase.table('student_reports')
     .update({'llm_feedback': 'Generating...'})
     .eq('id', report_id)
     .execute())

    time.sleep(2)
    full_row = (supabase.table('student_reports')
     .select('kf_avg_data')
     .eq('id', report_id)
     .single()
     .execute())

    data = full_row.data.get('kf_avg_data') if full_row.data else None
    app_log.info(f'[{report_id}] kf_avg_data: {data}')

    if not data:
      error_log.error(f'[{report_id}] kf_avg_data is empty — no assessment data found.')
      (supabase.table('student_reports')
       .update({'llm_feedback': 'No assessment data found for this time range.'})
       .eq('id', report_id)
       .execute())
      return

    app_log.info(f'[{report_id}] Calling Gemini...')
    summary = generate_report_summary(data, gemini)
    app_log.info(f'[{report_id}] Gemini response received.')

    (supabase.table('student_reports')
     .update({'llm_feedback': summary})
     .eq('id', report_id)
     .execute())
    app_log.info(f'[{report_id}] AI feedback written successfully.')

  except Exception as e:
    error_log.exception(f'[{report_id}] Error in handle_new_report: {e}')
    (supabase.table('student_reports')
     .update({'llm_feedback': f'Error generating feedback: {str(e)}'})
     .eq('id', report_id)
     .execute())


if __name__ == '__main__':
  asyncio.run(main())