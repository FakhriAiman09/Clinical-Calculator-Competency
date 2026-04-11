"""Inference helpers for the Clinical Competency Calculator.

This module loads a trained DeBERTa-v3-small model, performs inference for incoming
assessment data, downloads model artifacts from Supabase Storage, and generates
AI-written report summaries from averaged key-function results.
"""

import json
import os
import pickle
import re
import shutil
import subprocess
import sys
import tempfile
import time

import supabase as spb
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from google import genai
from google.genai import types as genai_types
from google.genai.types import GenerateContentResponse
from sklearn import svm


def deberta_infer(
    model_bundle: tuple,
    data: dict[str, list[str]],
) -> dict[str, int]:
  """
  Predict development levels for free-text responses with a loaded DeBERTa model.

  Args:
    model_bundle: Tuple of (tokenizer, model) loaded from disk.
    data: Mapping of key-function IDs to lists of free-text responses.

  Returns:
    A mapping of key-function IDs to predicted development levels.
  """
  print('Running inference on DeBERTa model...')
  _t0 = time.time()
  tokenizer, model = model_bundle

  def get_class(sentences: list[str]) -> int:
    enc = tokenizer(
        sentences,
        return_tensors='pt',
        truncation=True,
        max_length=160,
        padding=True,
    )
    with torch.no_grad():
      logits = model(**enc).logits  # (n_texts, 4)
    summed_logits = logits.sum(dim=0)  # aggregate across texts
    return int(summed_logits.argmax())

  result = {k: get_class(v) for k, v in data.items()}
  _elapsed = time.time() - _t0
  _total_texts = sum(len(v) for v in data.values())
  print(f'[TIMING] DeBERTa inference: {_elapsed:.3f}s ({_total_texts} texts across {len(data)} key functions)', flush=True)
  return result


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
  _t0 = time.time()

  def get_class(kf, response: list[bool]) -> int:
    model_key = 'mcq_kf' + re.sub(r'\.', '_', kf)
    return models[model_key].predict([response])[0]

  result = {k: get_class(k, v) for k, v in data.items()}
  _elapsed = time.time() - _t0
  print(f'[TIMING] SVM inference: {_elapsed:.3f}s ({len(data)} key functions)', flush=True)
  return result


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

  Student scores by key function (averages across rotation):
  {datastr}

  For each key function, write a structured response with exactly two sections:
  1. **Performance:** 1-2 sentences explaining the student's performance level and how they have progressed throughout the rotation based on the score.
  2. **Actionable Items:** 1-2 specific, practical steps the student can take to improve in this area, grounded in the score data.

  Return a JSON object where keys are the KF IDs (e.g. "1.1", "1.2") and values are Markdown strings using this exact format:
  **Performance:** <text>

  **Actionable Items:** <text>
  """

  _gemini_start = time.time()
  # Try models in order; move to the next if the current one is consistently unavailable (503).
  models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
  last_error = 'unknown error'

  for model in models_to_try:
    print(f'Trying Gemini model: {model}', flush=True)
    try_next_model = False
    for attempt in range(3):
      try:
        _attempt_start = time.time()
        response: GenerateContentResponse = gemini.models.generate_content(
          model=model,
          contents=query,
          config=genai_types.GenerateContentConfig(
            response_mime_type='application/json',
          ),
        )
        print(f'[TIMING] Gemini API call ({model}, attempt {attempt+1}): {time.time()-_attempt_start:.3f}s', flush=True)
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
            print(f'[TIMING] Gemini total ({model}, attempt {attempt+1} success): {time.time()-_gemini_start:.3f}s', flush=True)
            return json.dumps(parsed)
          except json.JSONDecodeError:
            last_error = f'invalid JSON from {model} attempt {attempt+1}'
            print(f'Gemini returned invalid JSON on {model} attempt {attempt+1}, retrying...', flush=True)
            continue
        else:
          last_error = f'empty response from {model} attempt {attempt+1}'
          print(f'Gemini returned empty response on {model} attempt {attempt+1}, retrying...', flush=True)
          continue
      except Exception as e:
        err = str(e)
        if '429' in err or 'RESOURCE_EXHAUSTED' in err:
          wait = 15 * (attempt + 1)
          last_error = f'rate limited on {model}'
          print(f'Gemini rate limited ({model}), retrying in {wait}s... (attempt {attempt+1}/3)', flush=True)
          time.sleep(wait)
          if attempt == 2:
            try_next_model = True
        elif '503' in err or 'UNAVAILABLE' in err or 'high demand' in err.lower():
          wait = 3 * (attempt + 1)
          last_error = f'503 unavailable on {model}'
          print(f'Gemini unavailable (503) on {model}, retrying in {wait}s... (attempt {attempt+1}/3)', flush=True)
          time.sleep(wait)
          if attempt == 2:
            try_next_model = True
        else:
          raise
    if try_next_model:
      print(f'{model} failed after 3 attempts, falling back to next model...', flush=True)
      continue
    break

  print(f'[TIMING] Gemini total (all attempts failed): {time.time()-_gemini_start:.3f}s', flush=True)
  return f'Error generating feedback: {last_error}.'


# ==================================================================================================


def load_deberta_model(model_path: str) -> tuple:
  """
  Load a DeBERTa-v3-small model and tokenizer from disk.

  Args:
    model_path: Filesystem path to the saved HuggingFace model directory.

  Returns:
    A tuple of (tokenizer, model) ready for inference.

  Raises:
    FileNotFoundError: If the provided model path does not exist.
  """
  if not os.path.exists(model_path):
    raise FileNotFoundError(f"The model path '{model_path}' does not exist.")

  print(f'Loading DeBERTa model from {model_path}...', end=' ')
  tokenizer = AutoTokenizer.from_pretrained(model_path)
  model = AutoModelForSequenceClassification.from_pretrained(model_path).float().eval()
  print('DeBERTa model loaded successfully.')
  return tokenizer, model


# ==================================================================================================


def download_deberta_model(local_path: str = 'models/deberta') -> None:
  """
  Download the DeBERTa model from the Kaggle kernel output to local disk.

  Requires the KAGGLE_API_TOKEN environment variable to be set.

  Args:
    local_path: Local directory that will receive the model files.
  """
  print('Downloading DeBERTa model from Kaggle...')

  with tempfile.TemporaryDirectory() as tmp:
    kaggle_cmd = shutil.which('kaggle') or 'kaggle'
    subprocess.run(
      [kaggle_cmd, 'kernels', 'output',
       'cccalc/deberta-v3-small-refined', '-p', tmp],
      check=True,
      env=os.environ.copy(),
    )
    model_src = os.path.join(tmp, 'model')
    os.makedirs(local_path, exist_ok=True)
    for fname in os.listdir(model_src):
      shutil.copy2(os.path.join(model_src, fname), local_path)

  print('DeBERTa model downloaded successfully.')


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
