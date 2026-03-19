"""
Inference module for BERT model to classify sentences.
This module loads a pre-trained BERT model and predicts the class for each sentence
"""

import os
import pickle
import re

import supabase as spb
import tensorflow as tf
import tensorflow_text as text
from google import genai
from google.genai.types import GenerateContentResponse
from sklearn import svm


def bert_infer(model: tf.keras.Model, data: dict[str, list[str]]) -> dict[str, int]:
  """
  Loads a pre-trained BERT model and predicts the class for each sentence.
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
  Loads pre-trained SVM models and predicts the class for each response.
  """
  print('Running inference on SVM models...')

  def get_class(kf, response: list[bool]) -> int:
    model_key = 'mcq_kf' + re.sub(r'\.', '_', kf)
    return models[model_key].predict([response])[0]

  return {k: get_class(k, v) for k, v in data.items()}


# ==================================================================================================


def generate_report_summary(data: dict[str, float], gemini: genai.Client) -> str:
  """
  Generates a summary report based on the average scores of key functions.
  """

  datastr = '\n'.join(f'{k}: {v}' for k, v in data.items())

  query = f"""
  You are a clinician evaluating the performance of a student undergoing a clinical clerkship. The student has been observed and graded based on the AAMC's Core Entrustable Professional Activities (EPAs), of which there are 13. The student is graded on each key function, which comprises the EPAs. Here are the key functions:

  1.1: Obtain a complete and accurate history in an organized fashion
  1.2: Demonstrate patient-centered interview skills
  1.3: Demonstrate clinical reasoning in gathering focused information relevant to a patient's care
  1.4: Perform a clinically relevant, appropriately thorough physical exam pertinent to the setting and purpose of the patient visit

  2.1: Synthesize essential information from previous records, history, physical exam, and initial diagnostic evaluations to propose a scientifically supported differential diagnosis
  2.2: Prioritize and continue to integrate information as it emerges to update differential diagnosis, while managing ambiguity
  2.3: Engage and communicate with team members for endorsement and verification of the working diagnosis that will inform management plans

  3.1: Recommend first-line cost-effective screening and diagnostic tests for routine health maintenance and common disorders
  3.2: Provide rationale for decision to order tests, taking into account pre- and posttest probability and patient preference
  3.3: Interpret results of basic studies and understand the implication and urgency of the results

  4.1: Compose orders efficiently and effectively verbally, on paper, and electronically
  4.2: Demonstrate an understanding of the patient's condition that underpins the provided orders
  4.3: Recognize and avoid errors by attending to patient-specific factors, using resources, and appropriately responding to safety alerts
  4.4: Discuss planned orders and prescriptions with team, patients, and families

  5.1: Prioritize and synthesize information into a cogent narrative for a variety of clinical encounters (e.g., admission, progress, pre- and post-op, and procedure notes; informed consent; discharge summary)
  5.2: Follow documentation requirements to meet regulations and professional expectations
  5.3: Document a problem list, differential diagnosis, and plan supported through clinical reasoning that reflects patient's preferences

  6.1: Present personally gathered and verified information, acknowledging areas of uncertainty
  6.2: Provide an accurate, concise, well-organized oral presentation
  6.3: Adjust the oral presentation to meet the needs of the receiver
  6.4: Demonstrate respect for patient's privacy and autonomy

  7.1: Combine curiosity, objectivity, and scientific reasoning to develop a well-formed, focused, pertinent clinical question (ASK)
  7.2: Demonstrate awareness and skill in using information technology to access accurate and reliable medical information (ACQUIRE)
  7.3: Demonstrate skill in appraising sources, content, and applicability of evidence (APPRAISE)
  7.4: Apply findings to individuals and/or patient panels; communicate findings to the patient and team, reflecting on process and outcomes (ADVISE)

  8.1: Document and update an electronic handover tool and apply this to deliver a structured verbal handover
  8.2: Conduct handover using communication strategies known to minimize threats to transition of care
  8.3: Provide succinct verbal communication conveying illness severity, situational awareness, action planning, and contingency planning
  8.4: Give or elicit feedback about handover communication and ensure closed-loop communication
  8.5: Demonstrate respect for patient's privacy and confidentiality

  9.1: Identify team members' roles and responsibilities and seek help from other members of the team to optimize health care delivery
  9.2: Include team members, listen attentively, and adjust communication content and style to align with team-member needs
  9.3: Establish and maintain a climate of mutual respect, dignity, integrity, and trust // Prioritize team needs over personal needs to optimize delivery of care // Help team members in need

  10.1: Recognize normal and abnormal vital signs as they relate to patient- and disease-specific factors as potential etiologies of a patient's decompensation
  10.2: Recognize severity of a patient's illness and indications for escalating care and initiate interventions and management
  10.3: Initiate and participate in a code response and apply basic and advanced life support
  10.4: Upon recognition of a patient's deterioration, communicate situation, clarify patient's goals of care, and update family members

  11.1: Describe the key elements of informed consent: indications, contraindications, risks, benefits, alternatives, and potential complications of the intervention
  11.2: Communicate with the patient and family to ensure that they understand the intervention
  11.3: Display an appropriate balance of confidence and skill to put the patient and family at ease, seeking help when needed

  12.1: Demonstrate technical skills required for the procedure
  12.2: Understand and explain the anatomy, physiology, indications, contraindications, risks, benefits, alternatives, and potential complications of the procedure
  12.3: Communicate with the patient and family to ensure they understand pre- and post- procedural activities
  12.4: Demonstrate confidence that puts patients and families at ease

  13.1: Identify and report actual and potential ("near miss") errors in care using system reporting structure (e.g., event reporting systems, chain of command policies)
  13.2: Participate in system improvement activities in the context of rotations or learning experiences (e.g., rapid-cycle change using plan-do-study-act cycles, root cause analyses, morbidity and mortality conference, failure modes and effects analyses, improvement projects)
  13.3: Engage in daily safety habits (e.g., accurate and complete documentation, including allergies and adverse reactions, medicine reconciliation, patient education, universal precautions, hand washing, isolation protocols, falls and other risk assessments, standard prophylaxis, time-outs)
  13.4: Admit one's own errors, reflect on one's contribution, and develop an individual improvement plan

  And here is the performance of the student with development levels associated with each key function: 0 (remedial), 1 (early developing), 2 (developing), and 3 (entrustable).

  {datastr}

  Based on this, please provide a summary/digest of the student's performance in a manner that is easy to understand. Please also suggest some actionable items for the student in this summary. For example, to increase observation on a specific aspect or activity, or to investigate specific aspects or activities.
  Please format the response as a JSON object with the Key Functions as keys and the corresponding summaries as values. The return value should be a JSON-parsable string, while the individual values should be formatted in Markdown. This string is to be stored directly in a jsonb row on a PostgreSQL database.

  e.g.
  {{
    "1.1": "**markdown stuff**",
    "1.2": "...",
    ...
    "13.1": "...",
    ...
  }}

  DO NOT WRAP YOUR RESPONSE WITH MARKDOWN CODEBLOCK NOTATION. Your response should begin with a single curly brace and end with a single curly brace — the ENTIRE response should be parseable as a single JSON object.
  """

  import time
  for attempt in range(3):
    try:
      response: GenerateContentResponse = gemini.models.generate_content(
        model='gemini-2.5-flash', contents=query
      )
      if response.text:
        import json
        text = response.text.strip()
        if text.startswith('```'):
          lines = text.split('\n')
          lines = [l for l in lines if not l.strip().startswith('```')]
          text = '\n'.join(lines).strip()
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
  return 'Error: Gemini rate limit exceeded after 3 retries. Try again later.'


# ==================================================================================================


def load_bert_model(model_path: str):
  """
  Loads a pre-trained BERT model from the specified path.
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
  Downloads the pre-trained BERT model files from Supabase Storage bucket 'bert-model'.
  The bucket should contain the SavedModel files uploaded from your local models/bert/ folder.

  Expected bucket structure:
    bert-model/
      saved_model.pb
      variables/
        variables.index
        variables.data-00000-of-00001

  :param supabase: Authenticated Supabase client.
  :param local_path: Local directory to download the model into.
  """

  bucket_name = 'bert-model'
  bucket = supabase.storage.from_(bucket_name)

  print(f"Downloading BERT model from Supabase bucket '{bucket_name}'...")

  def download_folder(prefix: str, local_dir: str) -> None:
    """Recursively list and download all files under a prefix."""
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


def download_svm_models(supabase: spb.Client) -> None:
  """
  Downloads the pre-trained SVM models from Supabase Storage bucket 'svm-models'.
  """

  if not os.path.exists('svm-models'):
    os.makedirs('svm-models')

  print('Downloading SVM models from Supabase...')
  bucket_name = 'svm-models'
  bucket = supabase.storage.from_(bucket_name)
  models = bucket.list()
  for model in models:
    model_name = model['name']
    print(f'  Downloading {model_name}...', end=' ')
    file_path = f'svm-models/{model_name}'
    with open(file_path, 'wb') as f:
      response = bucket.download(model_name)
      f.write(response)
    print('done.')
  print('All SVM models downloaded successfully.')


# ==================================================================================================


def load_svm_models() -> dict[str, svm.SVC]:
  """
  Loads the pre-trained SVM models from the local 'svm-models' directory.
  """
  svm_models = {}
  print("Loading SVM models from 'svm-models' directory...")

  for filename in os.listdir('svm-models'):
    if filename.endswith('.pkl'):
      model_path = os.path.join('svm-models', filename)
      print(f'  Loading {filename}...', end=' ')
      with open(model_path, 'rb') as f:
        svm_models[filename.removesuffix('.pkl')] = pickle.load(f)
      print('loaded.')

  print('All SVM models loaded successfully.')
  return svm_models