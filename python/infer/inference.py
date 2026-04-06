"""Inference helpers for the Clinical Competency Calculator.

This module loads trained BERT and SVM models, performs inference for incoming
assessment data, downloads model artifacts from Supabase Storage, and generates
AI-written report summaries from averaged key-function results.
"""

import os
import pickle
import re

import supabase as spb
import tensorflow as tf
import tensorflow_text as text
from google import genai
from google.genai import types as genai_types
from google.genai.types import GenerateContentResponse
from sklearn import svm


def bert_infer(model: tf.keras.Model, data: dict[str, list[str]]) -> dict[str, int]:
  """
  Predict development levels for free-text responses with a loaded BERT model.

  Args:
    model: Loaded TensorFlow BERT model.
    data: Mapping of key-function IDs to lists of free-text responses.

  Returns:
    A mapping of key-function IDs to predicted development levels.
  """
  print('Running inference on BERT model...')

  def get_class(sentences: list[str]) -> int:
    prediction = model.predict(sentences).tolist()
    summed_prediction = [sum(x) for x in zip(*prediction)]
    return summed_prediction.index(max(summed_prediction))

  return {k: get_class(v) for k, v in data.items()}


# ==================================================================================================


def svm_infer(models: dict[str, svm.SVC], data: dict[str, list[bool]]) -> dict[str, int]:
  """
  Predict development levels for multiple-choice responses with SVM models.

  Args:
    models: Mapping of model names to loaded scikit-learn SVM classifiers.
    data: Mapping of key-function IDs to encoded feature lists.

  Returns:
    A mapping of key-function IDs to predicted development levels.
  """
  print('Running inference on SVM models...')

  def get_class(kf, response: list[bool]) -> int:
    model_key = 'mcq_kf' + re.sub(r'\.', '_', kf)
    return models[model_key].predict([response])[0]

  return {k: get_class(k, v) for k, v in data.items()}


# ==================================================================================================


def generate_report_summary(data: dict[str, float], gemini: genai.Client) -> str:
  """
  Generate a JSON summary of student performance from key-function averages.

  Args:
    data: Mapping of key-function IDs to average scores.
    gemini: Authenticated Gemini client used to generate the summary.

  Returns:
    A JSON-formatted string suitable for storage in PostgreSQL ``jsonb``.
  """

  datastr = '\n'.join(f'{k}: {v}' for k, v in data.items())

  query = f"""
  You are a clinical clerkship evaluator. A student was assessed on AAMC Core EPAs (13 EPAs, each with key functions). Development levels: 0=remedial, 1=early-developing, 2=developing, 3=entrustable.

  Student scores by key function:
  {datastr}

  Write a brief performance summary per key function with one actionable suggestion each. Return a JSON object with KF IDs as keys and Markdown strings as values.
  """

  import json
  import time
  for attempt in range(3):
    try:
      response: GenerateContentResponse = gemini.models.generate_content(
        model='gemini-2.5-flash',
        contents=query,
        config=genai_types.GenerateContentConfig(
          response_mime_type='application/json',
        ),
      )
      if response.text:
        text = response.text.strip()
        # Strip any residual markdown fences
        if text.startswith('```'):
          text = re.sub(r'^```[a-zA-Z]*\n?', '', text)
          text = re.sub(r'\n?```$', '', text.strip()).strip()
        # Extract outermost JSON object even if there is surrounding text
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
          text = match.group(0)
        try:
          parsed = json.loads(text)
          return json.dumps(parsed)
        except json.JSONDecodeError:
          print(f'Gemini returned invalid JSON on attempt {attempt+1}, retrying...', flush=True)
          continue
      else:
        print(f'Gemini returned empty response on attempt {attempt+1}, retrying...', flush=True)
        continue
    except Exception as e:
      err = str(e)
      if '429' in err or 'RESOURCE_EXHAUSTED' in err:
        wait = 60 * (attempt + 1)
        print(f'Gemini rate limited, retrying in {wait}s... (attempt {attempt+1}/3)', flush=True)
        time.sleep(wait)
      else:
        raise
  return 'Error generating feedback: Gemini did not return valid JSON after 3 attempts.'


# ==================================================================================================


def load_bert_model(model_path: str):
  """
  Load a SavedModel-format BERT model from disk.

  Args:
    model_path: Filesystem path to the exported TensorFlow model.

  Returns:
    The loaded TensorFlow model instance.

  Raises:
    FileNotFoundError: If the provided model path does not exist.
  """
  if not os.path.exists(model_path):
    raise FileNotFoundError(f"The model path '{model_path}' does not exist.")

  print(f'Loading BERT model from {model_path}...', end=' ')
  model = tf.keras.models.load_model(model_path, compile=False)
  print('BERT model loaded successfully.')
  return model


# ==================================================================================================


def download_bert_model(supabase: spb.Client, local_path: str = 'models/bert') -> None:
  """
  Download the exported BERT model from Supabase Storage to local disk.

  Args:
    supabase: Authenticated Supabase client.
    local_path: Local directory that will receive the model files.

  Expected bucket structure:
    bert-model/
      saved_model.pb
      variables/
        variables.index
        variables.data-00000-of-00001
  """

  bucket_name = 'bert-model'
  bucket = supabase.storage.from_(bucket_name)

  print(f"Downloading BERT model from Supabase bucket '{bucket_name}'...")

  def download_folder(prefix: str, local_dir: str) -> None:
    """Recursively list and download every file beneath a storage prefix."""
    os.makedirs(local_dir, exist_ok=True)
    items = bucket.list(prefix) if prefix else bucket.list()

    for item in items:
      name = item['name']
      # Supabase Storage returns folders as items with metadata id == None
      if item.get('id') is None:
        # It's a folder — recurse
        sub_prefix = f"{prefix}/{name}" if prefix else name
        sub_local = os.path.join(local_dir, name)
        download_folder(sub_prefix, sub_local)
      else:
        # It's a file — download it
        remote_path = f"{prefix}/{name}" if prefix else name
        local_file = os.path.join(local_dir, name)
        print(f'  Downloading {remote_path}...', end=' ')
        data = bucket.download(remote_path)
        with open(local_file, 'wb') as f:
          f.write(data)
        print('done.')

  download_folder('', local_path)
  print('BERT model downloaded successfully.')


# ==================================================================================================


def download_svm_models(supabase: spb.Client, local_dir: str = 'svm-models') -> None:
  """
  Download all serialized SVM model files from Supabase Storage.

  Args:
    supabase: Authenticated Supabase client.
  """

  if not os.path.exists(local_dir):
    os.makedirs(local_dir)

  print('Downloading SVM models from Supabase...')
  bucket_name = 'svm-models'
  bucket = supabase.storage.from_(bucket_name)
  models = bucket.list()
  for model in models:
    model_name = model['name']
    print(f'  Downloading {model_name}...', end=' ')
    file_path = os.path.join(local_dir, model_name)
    with open(file_path, 'wb') as f:
      response = bucket.download(model_name)
      f.write(response)
    print('done.')
  print('All SVM models downloaded successfully.')


# ==================================================================================================


def load_svm_models(local_dir: str = 'svm-models') -> dict[str, svm.SVC]:
  """
  Load all serialized SVM models from the local ``svm-models`` directory.

  Returns:
    A dictionary keyed by model filename stem.
  """
  svm_models = {}
  print(f"Loading SVM models from '{local_dir}' directory...")

  for filename in os.listdir(local_dir):
    if filename.endswith('.pkl'):
      model_path = os.path.join(local_dir, filename)
      print(f'  Loading {filename}...', end=' ')
      with open(model_path, 'rb') as f:
        svm_models[filename.removesuffix('.pkl')] = pickle.load(f)
      print('loaded.')

  print('All SVM models loaded successfully.')
  return svm_models
