"""Supabase Realtime listener for inference and report generation.

This service subscribes to inserts on ``form_responses`` and
``student_reports``. New form responses are scored with the BERT and SVM
models, and new student reports are enriched with Gemini-generated feedback.

Required environment variables:
  - ``SUPABASE_URL``
  - ``SUPABASE_SERVICE_ROLE_KEY``
  - ``GOOGLE_GENAI_API_KEY``
"""

import asyncio
import logging
import os
from pathlib import Path
import time

import tensorflow_text as text
from dotenv import load_dotenv
from google import genai
import supabase as spb

from inference import (bert_infer, download_bert_model, download_svm_models,
                       generate_report_summary, load_bert_model,
                       load_svm_models, svm_infer)

BERT_MODEL_PATH = Path(os.environ.get('BERT_MODEL_PATH', Path(__file__).resolve().parent / 'models' / 'bert'))
SVM_MODELS_PATH = Path(os.environ.get('SVM_MODELS_PATH', Path(__file__).resolve().parent / 'svm-models'))
LOGS_PATH = Path(os.environ.get('INFER_LOGS_PATH', Path(__file__).resolve().parent / 'logs'))

# ── Logging setup ──────────────────────────────────────────────────────────────
LOGS_PATH.mkdir(parents=True, exist_ok=True)


def get_env(*names: str) -> str:
  """Return the first non-empty environment variable from the provided aliases."""
  for name in names:
    value = os.environ.get(name, '')
    if value:
      return value
  return ''

def make_logger(name: str, filename: str) -> logging.Logger:
  """Create a logger that writes to both a file and stdout."""
  logger = logging.getLogger(name)
  logger.setLevel(logging.DEBUG)
  logger.handlers.clear()
  logger.propagate = False
  formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')

  # File handler
  fh = logging.FileHandler(LOGS_PATH / filename)
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
      BERT_MODEL_PATH.exists() and
      (BERT_MODEL_PATH / 'saved_model.pb').exists()
    )
    svm_ready = (
      SVM_MODELS_PATH.exists() and
      any(f.endswith('.pkl') for f in os.listdir(SVM_MODELS_PATH))
    ) if SVM_MODELS_PATH.exists() else False

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
  """Initialize clients, load models, subscribe to realtime events, and run forever."""
  app_log.info('Loading environment variables...')
  load_dotenv()

  supabase_url: str = get_env('SUPABASE_URL')
  if not supabase_url:
    error_log.error('SUPABASE_URL environment variable is not set')
    raise ValueError('SUPABASE_URL environment variable is not set')

  supabase_key: str = get_env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_KEY')
  if not supabase_key:
    error_log.error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY environment variable is not set')
    raise ValueError('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY environment variable is not set')

  gemini_key: str = get_env('GOOGLE_GENAI_API_KEY', 'GEMINI_API_KEY')
  if not gemini_key:
    error_log.error('GOOGLE_GENAI_API_KEY or GEMINI_API_KEY environment variable is not set')
    raise ValueError('GOOGLE_GENAI_API_KEY or GEMINI_API_KEY environment variable is not set')

  app_log.info('Environment variables loaded.')

  gemini = genai.Client(api_key=gemini_key)
  supabase: spb.Client = spb.create_client(supabase_url, supabase_key)
  asupabase: spb.AClient = await spb.acreate_client(supabase_url, supabase_key)

  if not (BERT_MODEL_PATH / 'saved_model.pb').exists():
    app_log.info('BERT model not found locally. Downloading from Supabase Storage...')
    download_bert_model(supabase, str(BERT_MODEL_PATH))

  if not SVM_MODELS_PATH.exists() or not any(f.endswith('.pkl') for f in os.listdir(SVM_MODELS_PATH)):
    app_log.info('SVM models not found locally. Downloading from Supabase Storage...')
    download_svm_models(supabase, str(SVM_MODELS_PATH))

  wait_for_models(timeout_minutes=60)

  app_log.info('Loading SVM models...')
  svm_models = load_svm_models(str(SVM_MODELS_PATH))
  app_log.info('All SVM models loaded successfully.')

  app_log.info('Loading BERT model...')
  bert_model = load_bert_model(str(BERT_MODEL_PATH))
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

  app_log.info('Subscribing to "form_responses_update" channel...')
  await (asupabase.realtime
         .channel('form_responses_update')
         .on_postgres_changes('UPDATE',
                              schema='public', table='form_responses',
                              callback=lambda payload:
                              handle_updated_response(payload, bert_model, svm_models, supabase))
         .subscribe())
  app_log.info('Subscribed to form_responses_update.')

  app_log.info('Subscribing to "student_reports_insert" channel...')
  await (asupabase.realtime
         .channel('student_reports_insert')
         .on_postgres_changes('INSERT',
                              schema='public', table='student_reports',
                              callback=lambda payload:
                              handle_new_report(payload, gemini, supabase))
         .subscribe())
  app_log.info('Subscribed to student_reports_insert.')

  app_log.info('Subscribing to "student_reports_update" channel...')
  await (asupabase.realtime
         .channel('student_reports_update')
         .on_postgres_changes('UPDATE',
                              schema='public', table='student_reports',
                              callback=lambda payload:
                              handle_updated_report(payload, gemini, supabase))
         .subscribe())
  app_log.info('Subscribed to student_reports_update.')

  app_log.info('Listening for events...')
  while True:
    await asyncio.sleep(1)


# ── Event handlers ─────────────────────────────────────────────────────────────

def handle_new_response(payload, bert_model, svm_models, supabase) -> None:
  """Process a new form response and persist weighted model predictions."""
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
      """Combine BERT and SVM outputs using the project weighting rule."""
      return bert * 0.25 + svm * 0.75

    res = {k: weighted_average(bert=v, svm=svms_res[k]) for k, v in bert_res.items()}
    infer_log.info(f'[{response_id}] Final weighted results: {res}')

    (supabase.table('form_results')
     .insert({'response_id': response_id, 'results': res})
     .execute())
    infer_log.info(f'[{response_id}] Results written to form_results successfully.')

  except Exception as e:
    error_log.exception(f'Error in handle_new_response: {e}')


def handle_updated_response(payload, bert_model, svm_models, supabase) -> None:
  """Re-score an edited form response and upsert the result into form_results."""
  try:
    record = payload['data']['record']
    response_id = record['response_id']
    infer_log.info(f'Form response updated: {response_id}')

    response = record['response']['response']

    ds = [kf for kf in response.values()]
    bert_inputs = {k: v['text'] for d in ds for k, v in d.items()}
    svm_inputs = {k: [vv for kk, vv in v.items() if kk != 'text'] for d in ds for k, v in d.items()}

    infer_log.info(f'[{response_id}] Running BERT inference (update)...')
    bert_res = bert_infer(bert_model, bert_inputs)
    infer_log.info(f'[{response_id}] BERT results: {bert_res}')

    infer_log.info(f'[{response_id}] Running SVM inference (update)...')
    svms_res = svm_infer(svm_models, svm_inputs)
    infer_log.info(f'[{response_id}] SVM results: {svms_res}')

    def weighted_average(bert: float, svm: float) -> float:
      return bert * 0.25 + svm * 0.75

    res = {k: weighted_average(bert=v, svm=svms_res[k]) for k, v in bert_res.items()}
    infer_log.info(f'[{response_id}] Updated weighted results: {res}')

    # UPSERT so the existing form_results row is replaced, not duplicated
    (supabase.table('form_results')
     .upsert({'response_id': response_id, 'results': res}, on_conflict='response_id')
     .execute())
    infer_log.info(f'[{response_id}] form_results upserted successfully.')

  except Exception as e:
    error_log.exception(f'Error in handle_updated_response: {e}')


def handle_updated_report(payload, gemini, supabase) -> None:
  """Regenerate AI feedback when a report's llm_feedback is reset to 'Generating...'."""
  record = payload['data']['record']
  old_record = payload['data'].get('old_record', {})

  # Only act when llm_feedback transitions TO 'Generating...' to avoid loops
  if record.get('llm_feedback') != 'Generating...':
    return
  if old_record.get('llm_feedback') == 'Generating...':
    return

  report_id = record['id']
  app_log.info(f'Report updated with Generating... — regenerating feedback: {report_id}')
  handle_new_report(payload, gemini, supabase)


def handle_new_report(payload, gemini, supabase) -> None:
  """Generate and persist AI feedback for a newly created student report."""
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
    if summary.startswith('Error generating feedback:'):
      error_log.error(f'[{report_id}] {summary}')
    else:
      app_log.info(f'[{report_id}] Gemini response received.')

    (supabase.table('student_reports')
     .update({'llm_feedback': summary})
     .eq('id', report_id)
     .execute())
    if summary.startswith('Error generating feedback:'):
      error_log.error(f'[{report_id}] Error feedback written to student_reports.')
    else:
      app_log.info(f'[{report_id}] AI feedback written successfully.')

  except Exception as e:
    error_log.exception(f'[{report_id}] Error in handle_new_report: {e}')
    (supabase.table('student_reports')
     .update({'llm_feedback': f'Error generating feedback: {str(e)}'})
     .eq('id', report_id)
     .execute())


if __name__ == '__main__':
  asyncio.run(main())
