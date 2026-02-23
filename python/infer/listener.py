'''
This script connects to the Supabase Realtime server and listens for new form responses.
When a new response is inserted into the "form_responses" table, it processes the response using
BERT and SVM models, and then stores the results in the "form_results" table.

It requires the following environment variables to be set:
- SUPABASE_URL: The URL of the Supabase project.
- SUPABASE_SERVICE_ROLE_KEY: The service role key for the Supabase project.
'''

import asyncio
import os

import tensorflow_text as text
from dotenv import load_dotenv
from google import genai
import supabase as spb

from inference import (bert_infer, generate_report_summary, load_bert_model,
                       load_svm_models, svm_infer)


async def main() -> None:
  """
  Connects to the Supabase Realtime server and subscribes to a channel.

  :return: None
  """

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

  # Kaggle not required - BERT and SVM models already downloaded manually
  print("Environment variables loaded.")

  gemini = genai.Client(api_key=gemini_key)
  supabase: spb.Client = spb.create_client(supabase_url, supabase_key)
  asupabase: spb.AClient = await spb.acreate_client(supabase_url, supabase_key)

  print("Loading SVM models...")
  svm_models = load_svm_models()

  print("Loading BERT model...")
  bert_path = "models/bert"
  bert_model = load_bert_model(bert_path)
  print("Path to model files:", bert_path)
  
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

  await asupabase.realtime.listen()

  print('Subscribing to the "student_reports_insert" channel...', end=' ')

  await (asupabase.realtime
         .channel("student_reports_insert")
         .on_postgres_changes("INSERT",
                              schema="public", table="student_reports",
                              callback=lambda payload:
                              handle_new_report(payload, gemini, supabase))
         .subscribe())

  print('Subscribed.')

  while True:
    await asyncio.sleep(1)


def handle_new_response(payload, bert_model, svm_models, supabase) -> None:
  '''
  Handles the insert event from the Supabase Realtime server.

  :param payload: The payload received from the Supabase Realtime server.
  :type payload: dict

  :return: None
  '''

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
  '''
  Handles the insert event from the Supabase Realtime server for student reports.

  :param payload: The payload received from the Supabase Realtime server.
  :type payload: dict

  :return: None
  '''

  record = payload['data']['record']

  print('New report received:', record['id'])

  (supabase.table("student_reports")
   .update({"llm_feedback": "Generating..."})
   .eq("id", record['id'])
   .execute())

  data = record['kf_avg_data']

  summary = generate_report_summary(data, gemini)

  print('Uploading summary to table...')

  (supabase.table("student_reports")
   .update({"llm_feedback": summary})
   .eq("id", record['id'])
   .execute())


if __name__ == "__main__":
  asyncio.run(main())