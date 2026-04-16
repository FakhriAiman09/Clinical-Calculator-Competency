# pylint: disable=unused-argument

'''12 unit tests for inference.py and listener.py'''

import json
import sys
import types
import unittest
from unittest.mock import MagicMock, patch, mock_open

# Lightweight dependency stubs so tests can import inference/listener in CI
# without installing full ML runtime packages.
if 'supabase' not in sys.modules:
  supabase_module = types.ModuleType('supabase')

  class _SupabaseClient:  # pragma: no cover - marker type only
    pass

  supabase_module.Client = _SupabaseClient
  sys.modules['supabase'] = supabase_module

if 'torch' not in sys.modules:
  torch_stub = types.ModuleType('torch')

  class _NoGrad:
    def __enter__(self):
      return None

    def __exit__(self, exc_type, exc, tb):
      return False

  torch_stub.no_grad = lambda: _NoGrad()
  sys.modules['torch'] = torch_stub

if 'transformers' not in sys.modules:
  transformers_stub = types.ModuleType('transformers')

  class _AutoTokenizer:
    @staticmethod
    def from_pretrained(*args, **kwargs):
      return MagicMock()

  class _AutoModelForSequenceClassification:
    @staticmethod
    def from_pretrained(*args, **kwargs):
      return MagicMock()

  transformers_stub.AutoTokenizer = _AutoTokenizer
  transformers_stub.AutoModelForSequenceClassification = _AutoModelForSequenceClassification
  sys.modules['transformers'] = transformers_stub

if 'google' not in sys.modules:
  google_module = types.ModuleType('google')
  genai_module = types.ModuleType('google.genai')
  genai_types_module = types.ModuleType('google.genai.types')

  class _GenerateContentResponse:  # pragma: no cover - marker type only
    pass

  class _GenerateContentConfig:  # pragma: no cover - marker type only
    def __init__(self, *args, **kwargs):
      self.args = args
      self.kwargs = kwargs

  class _Client:  # pragma: no cover - marker type only
    pass

  genai_types_module.GenerateContentResponse = _GenerateContentResponse
  genai_types_module.GenerateContentConfig = _GenerateContentConfig
  genai_module.types = genai_types_module
  genai_module.Client = _Client
  google_module.genai = genai_module

  sys.modules['google'] = google_module
  sys.modules['google.genai'] = genai_module
  sys.modules['google.genai.types'] = genai_types_module

if 'sklearn' not in sys.modules:
  sklearn_module = types.ModuleType('sklearn')
  svm_module = types.ModuleType('sklearn.svm')

  class _SVC:  # pragma: no cover - marker type only
    pass

  svm_module.SVC = _SVC
  sklearn_module.svm = svm_module
  sys.modules['sklearn'] = sklearn_module
  sys.modules['sklearn.svm'] = svm_module

if 'dotenv' not in sys.modules:
  dotenv_module = types.ModuleType('dotenv')
  dotenv_module.load_dotenv = lambda *args, **kwargs: None
  sys.modules['dotenv'] = dotenv_module

# test_benchmark.py injects a lightweight 'inference' stub into sys.modules.
# When running this file in the same pytest invocation, drop that stub so we
# import the real inference.py module for listener/inference tests.
existing_inference = sys.modules.get('inference')
if existing_inference is not None and not getattr(existing_inference, '__file__', None):
  sys.modules.pop('inference', None)

import inference  # pylint: disable=import-error
import listener   # pylint: disable=import-error


# ---------------------------------------------------------------------------
# inference.deberta_infer  (2 tests)
# ---------------------------------------------------------------------------

class _FakeLogits:
  def __init__(self, rows):
    self.rows = rows

  def sum(self, dim=0):
    if dim != 0:
      raise ValueError('Only dim=0 is supported in this fake tensor')
    cols = [sum(row[i] for row in self.rows) for i in range(len(self.rows[0]))]
    return _FakeVector(cols)


class _FakeVector:
  def __init__(self, values):
    self.values = values

  def argmax(self):
    return max(range(len(self.values)), key=lambda i: self.values[i])


class TestDebertaInfer(unittest.TestCase):
  '''Unit tests for deberta_infer() in inference.py'''

  def test_output_keys_match_input_keys(self):
    '''deberta_infer should return a dict whose keys are identical to the input keys.'''
    mock_tokenizer = MagicMock(return_value={})
    mock_model = MagicMock()
    mock_model.return_value = types.SimpleNamespace(logits=_FakeLogits([[0.1, 0.9]]))
    data = {'1.1': ['sentence a'], '1.2': ['sentence b']}
    result = inference.deberta_infer((mock_tokenizer, mock_model), data)
    self.assertEqual(set(result.keys()), set(data.keys()))

  def test_picks_class_with_highest_summed_score(self):
    '''deberta_infer should return the index of the column with the highest summed prediction.'''
    mock_tokenizer = MagicMock(return_value={})
    mock_model = MagicMock()
    # Two rows summed → [0.3, 1.7] → class 1
    mock_model.return_value = types.SimpleNamespace(logits=_FakeLogits([[0.1, 0.9], [0.2, 0.8]]))
    result = inference.deberta_infer((mock_tokenizer, mock_model), {'kf': ['s1', 's2']})
    self.assertEqual(result['kf'], 1)


# ---------------------------------------------------------------------------
# inference.svm_infer  (1 test)
# ---------------------------------------------------------------------------

class TestSvmInfer(unittest.TestCase):
  '''Unit tests for svm_infer() in inference.py'''

  def test_dot_in_key_replaced_with_underscore_in_model_lookup(self):
    '''svm_infer should convert "1.1" → "mcq_kf1_1" when looking up the model dict.'''
    mock_model = MagicMock()
    mock_model.predict.return_value = [2]
    models = {'mcq_kf1_1': mock_model}
    result = inference.svm_infer(models, {'1.1': [True, False]})
    self.assertEqual(result['1.1'], 2)
    mock_model.predict.assert_called_once_with([[True, False]])


# ---------------------------------------------------------------------------
# inference.load_deberta_model  (1 test)
# ---------------------------------------------------------------------------

class TestLoadDebertaModel(unittest.TestCase):
  '''Unit tests for load_deberta_model() in inference.py'''

  @patch('inference.os.path.exists', return_value=False)
  def test_raises_file_not_found_when_path_missing(self, mock_exists):
    '''load_deberta_model should raise FileNotFoundError when the path does not exist.'''
    with self.assertRaises(FileNotFoundError):
      inference.load_deberta_model('nonexistent/path')


# ---------------------------------------------------------------------------
# inference.load_svm_models  (1 test)
# ---------------------------------------------------------------------------

class TestLoadSvmModels(unittest.TestCase):
  '''Unit tests for load_svm_models() in inference.py'''

  @patch('builtins.open', new_callable=mock_open)
  @patch('inference.os.listdir', return_value=['model_a.pkl', 'README.txt', 'model_b.pkl'])
  def test_skips_non_pkl_files(self, mock_listdir, mock_file):
    '''load_svm_models should load only .pkl files and ignore all other files.'''
    with patch('inference.pickle.load', return_value='mock_svc'):
      result = inference.load_svm_models()
    self.assertIn('model_a', result)
    self.assertIn('model_b', result)
    self.assertNotIn('README', result)


# ---------------------------------------------------------------------------
# inference.generate_report_summary  (2 tests)
# ---------------------------------------------------------------------------

class TestGenerateReportSummary(unittest.TestCase):
  '''Unit tests for generate_report_summary() in inference.py'''

  def test_strips_markdown_codeblock_before_parsing(self):
    '''generate_report_summary should strip ```json...``` fences and return valid JSON.'''
    mock_gemini = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '```json\n{"1.1": "good performance"}\n```'
    mock_gemini.models.generate_content.return_value = mock_response

    result = inference.generate_report_summary({'1.1': 2.0}, mock_gemini)
    parsed = json.loads(result)
    self.assertIn('1.1', parsed)

  def test_retries_three_times_on_invalid_json_then_returns_error(self):
    '''generate_report_summary should retry 3 times on bad JSON and return an error string.'''
    mock_gemini = MagicMock()
    mock_response = MagicMock()
    mock_response.text = 'not valid json {{{'
    mock_gemini.models.generate_content.return_value = mock_response

    result = inference.generate_report_summary({'1.1': 1.0}, mock_gemini)
    self.assertIn('Error', result)
    self.assertEqual(
      mock_gemini.models.generate_content.call_count,
      3 * len(inference._GEMINI_MODELS),  # pylint: disable=protected-access
    )


# ---------------------------------------------------------------------------
# listener.wait_for_models  (2 tests)
# ---------------------------------------------------------------------------

class TestWaitForModels(unittest.TestCase):
  '''Unit tests for wait_for_models() in listener.py'''

  @patch('listener.time.sleep')
  @patch('listener.Path.exists', return_value=False)
  def test_raises_timeout_error_when_models_never_appear(self, mock_exists, mock_sleep):
    '''wait_for_models should raise TimeoutError once the deadline passes with no models found.'''
    import itertools
    # Supply enough values for logging internals, then deadline-exceeded
    time_values = itertools.chain([0] * 10, itertools.repeat(999999))
    with patch('listener.time.time', side_effect=time_values):
      with self.assertRaises(TimeoutError):
        listener.wait_for_models(timeout_minutes=1)

  @patch('listener.time.sleep')
  @patch('listener.time.time', return_value=0)
  @patch('listener.os.listdir', return_value=['model.pkl'])
  @patch('listener.Path.exists', return_value=True)
  def test_returns_without_sleeping_when_both_models_present(self, mock_exists, mock_listdir,
                                                              mock_time, mock_sleep):
    '''wait_for_models should return immediately without sleeping when models are already on disk.'''
    listener.wait_for_models(timeout_minutes=1)
    mock_sleep.assert_not_called()


# ---------------------------------------------------------------------------
# listener.handle_new_response  (2 tests)
# ---------------------------------------------------------------------------

class TestHandleNewResponse(unittest.TestCase):
  '''Unit tests for handle_new_response() in listener.py'''

  def _make_payload(self):
    return {'data': {'record': {
      'response_id': 'test-id-123',
      'response': {'response': {'kf1': {'1.1': {'text': ['good'], '1.1.1': True}}}},
    }}}

  @patch('listener.svm_infer', return_value={'1.1': 2})
  @patch('listener.deberta_infer', return_value={'1.1': 0})
  def test_weighted_average_is_deberta_025_plus_svm_075(self, mock_deberta, mock_svm):
    '''handle_new_response result should equal deberta*0.25 + svm*0.75 for each key.'''
    mock_supabase = MagicMock()
    listener.handle_new_response(self._make_payload(), MagicMock(), {}, mock_supabase)

    inserted = mock_supabase.table().insert.call_args[0][0]
    # deberta=0, svm=2 → 0*0.25 + 2*0.75 = 1.5
    self.assertAlmostEqual(inserted['results']['1.1'], 1.5)

  @patch('listener.svm_infer', return_value={'1.1': 1})
  @patch('listener.deberta_infer', return_value={'1.1': 1})
  def test_inserts_row_with_correct_response_id(self, mock_deberta, mock_svm):
    '''handle_new_response should insert into form_results with the payload response_id.'''
    mock_supabase = MagicMock()
    listener.handle_new_response(self._make_payload(), MagicMock(), {}, mock_supabase)

    mock_supabase.table.assert_called_with('form_results')
    inserted = mock_supabase.table().insert.call_args[0][0]
    self.assertEqual(inserted['response_id'], 'test-id-123')


# ---------------------------------------------------------------------------
# listener.handle_new_report  (2 tests)
# ---------------------------------------------------------------------------

class TestHandleNewReport(unittest.TestCase):
  '''Unit tests for handle_new_report() in listener.py'''

  def _make_supabase_with_data(self, kf_avg_data):
    mock_supabase = MagicMock()
    mock_row = MagicMock()
    mock_row.data = {'kf_avg_data': kf_avg_data}
    (mock_supabase.table.return_value
     .select.return_value
     .eq.return_value
     .single.return_value
     .execute.return_value) = mock_row
    return mock_supabase

  def test_empty_kf_avg_data_writes_no_assessment_message(self):
    '''handle_new_report should update llm_feedback with a "no data" message when kf_avg_data is None.'''
    mock_supabase = self._make_supabase_with_data(kf_avg_data=None)
    listener.handle_new_report({'data': {'record': {'id': 'rpt-1'}}}, MagicMock(), mock_supabase)

    update_calls = [str(c) for c in mock_supabase.table().update.call_args_list]
    self.assertTrue(any('No assessment' in c for c in update_calls))

  @patch('listener.generate_report_summary', side_effect=RuntimeError('API down'))
  def test_exception_writes_error_message_to_llm_feedback(self, mock_summary):
    '''handle_new_report should catch exceptions and write an error string to llm_feedback.'''
    mock_supabase = self._make_supabase_with_data(kf_avg_data={'1.1': 2.0})
    listener.handle_new_report({'data': {'record': {'id': 'rpt-2'}}}, MagicMock(), mock_supabase)

    update_calls = [str(c) for c in mock_supabase.table().update.call_args_list]
    self.assertTrue(any('_error' in c for c in update_calls))


if __name__ == '__main__':
  unittest.main()
