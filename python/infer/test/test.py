# pylint: disable=unused-argument

'''12 unit tests for inference.py and listener.py'''

import json
import os
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

  @patch('inference.AutoModelForSequenceClassification.from_pretrained')
  @patch('inference.AutoTokenizer.from_pretrained')
  @patch('inference.os.path.exists', return_value=True)
  def test_returns_tokenizer_and_eval_model_when_path_exists(self, mock_exists,
                                                             mock_tokenizer_from_pretrained,
                                                             mock_model_from_pretrained):
    '''load_deberta_model should load tokenizer plus float().eval() model when the path exists.'''
    tokenizer = MagicMock()
    model = MagicMock()
    model.float.return_value.eval.return_value = 'eval-model'
    mock_tokenizer_from_pretrained.return_value = tokenizer
    mock_model_from_pretrained.return_value = model

    result = inference.load_deberta_model('models/deberta')

    self.assertEqual(result, (tokenizer, 'eval-model'))
    mock_tokenizer_from_pretrained.assert_called_once_with('models/deberta')
    mock_model_from_pretrained.assert_called_once_with('models/deberta')


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


class TestDownloadModelHelpers(unittest.TestCase):
  '''Unit tests for inference download helper functions.'''

  @patch('inference.shutil.copy2')
  @patch('inference.os.listdir', return_value=['config.json', 'weights.bin'])
  @patch('inference.os.makedirs')
  @patch('inference.subprocess.run')
  @patch('inference.shutil.which', return_value=None)
  @patch('inference.tempfile.TemporaryDirectory')
  def test_download_deberta_model_runs_kaggle_and_copies_files(self, mock_tempdir, mock_which,
                                                               mock_run, mock_makedirs,
                                                               mock_listdir, mock_copy2):
    '''download_deberta_model should invoke Kaggle output download and copy artifacts locally.'''
    tmp_context = MagicMock()
    tmp_context.__enter__.return_value = 'tmpdir'
    tmp_context.__exit__.return_value = False
    mock_tempdir.return_value = tmp_context

    inference.download_deberta_model('local-model-dir')

    mock_run.assert_called_once()
    self.assertEqual(mock_run.call_args[0][0][:2], ['kaggle', 'kernels'])
    mock_makedirs.assert_called_once_with('local-model-dir', exist_ok=True)
    copied_sources = [call.args[0] for call in mock_copy2.call_args_list]
    self.assertIn(os.path.join('tmpdir', 'model', 'config.json'), copied_sources)
    self.assertIn(os.path.join('tmpdir', 'model', 'weights.bin'), copied_sources)

  @patch('builtins.open', new_callable=mock_open)
  @patch('inference.os.makedirs')
  @patch('inference.os.path.exists', return_value=False)
  def test_download_svm_models_creates_dir_and_writes_downloaded_files(self, mock_exists,
                                                                       mock_makedirs,
                                                                       mock_file):
    '''download_svm_models should create the target dir and write each downloaded model blob.'''
    bucket = MagicMock()
    bucket.list.return_value = [{'name': 'kf1.pkl'}, {'name': 'kf2.pkl'}]
    bucket.download.side_effect = [b'model-one', b'model-two']

    supabase = MagicMock()
    supabase.storage.from_.return_value = bucket

    inference.download_svm_models(supabase, local_dir='local-svm-dir')

    supabase.storage.from_.assert_called_once_with('svm-models')
    mock_makedirs.assert_called_once_with('local-svm-dir')
    bucket.download.assert_any_call('kf1.pkl')
    bucket.download.assert_any_call('kf2.pkl')
    handle = mock_file()
    handle.write.assert_any_call(b'model-one')
    handle.write.assert_any_call(b'model-two')


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

  @patch('inference._try_gemini_model', side_effect=[None, '{"1.1": "fallback ok"}'])
  def test_falls_back_to_next_model_when_first_model_fails(self, mock_try_model):
    '''generate_report_summary should try the next Gemini model after a failed model.'''
    result = inference.generate_report_summary({'1.1': 1.0}, MagicMock())
    self.assertEqual(json.loads(result), {'1.1': 'fallback ok'})
    self.assertEqual(mock_try_model.call_count, 2)


class TestGeminiHelpers(unittest.TestCase):
  '''Unit tests for private Gemini helper functions in inference.py.'''

  def test_parse_gemini_text_extracts_outer_json_from_wrapped_text(self):
    raw = 'intro text\n```json\n{"1.1": "good"}\n```\noutro'
    self.assertEqual(inference._parse_gemini_text(raw), '{"1.1": "good"}')  # pylint: disable=protected-access

  @patch('inference.time.sleep')
  def test_handle_gemini_error_sleeps_for_rate_limit(self, mock_sleep):
    inference._handle_gemini_error(RuntimeError('429 RESOURCE_EXHAUSTED'), 'gemini-2.5-flash', 1)  # pylint: disable=protected-access
    mock_sleep.assert_called_once_with(30)

  @patch('inference.time.sleep')
  def test_handle_gemini_error_sleeps_for_unavailable_signal(self, mock_sleep):
    inference._handle_gemini_error(RuntimeError('503 high demand'), 'gemini-2.5-flash', 1)  # pylint: disable=protected-access
    mock_sleep.assert_called_once_with(6)

  def test_handle_gemini_error_reraises_unknown_errors(self):
    with self.assertRaises(RuntimeError):
      inference._handle_gemini_error(RuntimeError('unexpected boom'), 'gemini-2.5-flash', 0)  # pylint: disable=protected-access

  def test_try_gemini_model_retries_empty_and_invalid_before_success(self):
    gemini = MagicMock()
    gemini.models.generate_content.side_effect = [
      MagicMock(text=''),
      MagicMock(text='not-json'),
      MagicMock(text='{"1.1": "ok"}'),
    ]

    result = inference._try_gemini_model(gemini, 'gemini-2.5-flash', 'query', MagicMock())  # pylint: disable=protected-access

    self.assertEqual(json.loads(result), {'1.1': 'ok'})
    self.assertEqual(gemini.models.generate_content.call_count, 3)

  def test_try_gemini_model_returns_none_after_three_empty_responses(self):
    gemini = MagicMock()
    gemini.models.generate_content.side_effect = [
      MagicMock(text=''),
      MagicMock(text=''),
      MagicMock(text=''),
    ]

    result = inference._try_gemini_model(gemini, 'gemini-2.5-flash', 'query', MagicMock())  # pylint: disable=protected-access

    self.assertIsNone(result)
    self.assertEqual(gemini.models.generate_content.call_count, 3)

  @patch('inference._handle_gemini_error')
  def test_try_gemini_model_routes_exceptions_to_error_handler(self, mock_handle_error):
    gemini = MagicMock()
    gemini.models.generate_content.side_effect = RuntimeError('temporary failure')

    result = inference._try_gemini_model(gemini, 'gemini-2.5-flash', 'query', MagicMock())  # pylint: disable=protected-access

    self.assertIsNone(result)
    self.assertEqual(mock_handle_error.call_count, 3)


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
# listener small helpers / guards  (5 tests)
# ---------------------------------------------------------------------------

class TestListenerHelpers(unittest.TestCase):
  '''Unit tests for listener helper functions and update guards.'''

  def test_get_env_returns_first_non_empty_alias(self):
    with patch.dict('listener.os.environ', {'SECOND': 'value'}, clear=True):
      self.assertEqual(listener.get_env('FIRST', 'SECOND'), 'value')

  def test_get_env_returns_empty_string_when_missing(self):
    with patch.dict('listener.os.environ', {}, clear=True):
      self.assertEqual(listener.get_env('A', 'B'), '')

  def test_handle_updated_report_ignores_non_generating_feedback(self):
    payload = {'data': {'record': {'llm_feedback': 'done'}, 'old_record': {'llm_feedback': 'old'}}}
    with patch('listener.handle_new_report') as mock_handle:
      listener.handle_updated_report(payload, MagicMock(), MagicMock())
    mock_handle.assert_not_called()

  def test_handle_updated_report_ignores_null_or_existing_generating_old_feedback(self):
    payloads = [
      {'data': {'record': {'llm_feedback': listener.GENERATING_PLACEHOLDER}, 'old_record': {'llm_feedback': None}}},
      {'data': {'record': {'llm_feedback': listener.GENERATING_PLACEHOLDER}, 'old_record': {'llm_feedback': listener.GENERATING_PLACEHOLDER}}},
    ]
    for payload in payloads:
      with patch('listener.handle_new_report') as mock_handle:
        listener.handle_updated_report(payload, MagicMock(), MagicMock())
      mock_handle.assert_not_called()

  def test_handle_updated_report_calls_handle_new_report_on_manual_regeneration(self):
    payload = {'data': {'record': {'llm_feedback': listener.GENERATING_PLACEHOLDER, 'id': 'r1'}, 'old_record': {'llm_feedback': 'old text'}}}
    with patch('listener.handle_new_report') as mock_handle:
      listener.handle_updated_report(payload, MagicMock(), MagicMock())
    mock_handle.assert_called_once()


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

  @patch('listener.svm_infer', return_value={'1.1': 2})
  @patch('listener.deberta_infer', return_value={'1.1': 2})
  def test_handle_updated_response_uses_upsert(self, mock_deberta, mock_svm):
    '''handle_updated_response should upsert into form_results instead of insert.'''
    mock_supabase = MagicMock()
    listener.handle_updated_response(self._make_payload(), MagicMock(), {}, mock_supabase)

    mock_supabase.table.assert_called_with('form_results')
    upserted = mock_supabase.table().upsert.call_args[0][0]
    self.assertEqual(upserted['response_id'], 'test-id-123')

  @patch('listener.deberta_infer', side_effect=RuntimeError('boom'))
  def test_handle_new_response_logs_exception(self, mock_deberta):
    '''handle_new_response should swallow exceptions and log them.'''
    with patch.object(listener.error_log, 'exception') as mock_error:
      listener.handle_new_response(self._make_payload(), MagicMock(), {}, MagicMock())
    mock_error.assert_called_once()

  @patch('listener.deberta_infer', side_effect=RuntimeError('boom'))
  def test_handle_updated_response_logs_exception(self, mock_deberta):
    '''handle_updated_response should swallow exceptions and log them.'''
    with patch.object(listener.error_log, 'exception') as mock_error:
      listener.handle_updated_response(self._make_payload(), MagicMock(), {}, MagicMock())
    mock_error.assert_called_once()


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

  @patch('listener.generate_report_summary', return_value='{"1.1": "good"}')
  def test_successful_summary_written_to_llm_feedback(self, mock_summary):
    '''handle_new_report should persist successful Gemini feedback as-is.'''
    mock_supabase = self._make_supabase_with_data(kf_avg_data={'1.1': 2.0})
    listener.handle_new_report({'data': {'record': {'id': 'rpt-ok'}}}, MagicMock(), mock_supabase)

    update_calls = mock_supabase.table().update.call_args_list
    self.assertTrue(any('{"1.1": "good"}' in str(call) for call in update_calls))

  @patch('listener.generate_report_summary', return_value='Error generating feedback: timeout')
  def test_summary_error_string_is_mapped_to_error_json(self, mock_summary):
    '''handle_new_report should wrap generator error strings in stored _error JSON.'''
    mock_supabase = self._make_supabase_with_data(kf_avg_data={'1.1': 2.0})
    listener.handle_new_report({'data': {'record': {'id': 'rpt-err'}}}, MagicMock(), mock_supabase)

    update_calls = mock_supabase.table().update.call_args_list
    self.assertTrue(any('_error' in str(call) for call in update_calls))

  def test_exception_maps_503_to_friendly_message(self):
    '''503-like exceptions should be converted to the temporary-unavailable message.'''
    mock_supabase = self._make_supabase_with_data(kf_avg_data={'1.1': 2.0})
    with patch('listener.generate_report_summary', side_effect=RuntimeError('503 high demand')):
      listener.handle_new_report({'data': {'record': {'id': 'rpt-503'}}}, MagicMock(), mock_supabase)

    update_calls = mock_supabase.table().update.call_args_list
    self.assertTrue(any('temporarily unavailable' in str(call) for call in update_calls))

  def test_exception_maps_429_to_friendly_message(self):
    mock_supabase = self._make_supabase_with_data(kf_avg_data={'1.1': 2.0})
    with patch('listener.generate_report_summary', side_effect=RuntimeError('429 RESOURCE_EXHAUSTED')):
      listener.handle_new_report({'data': {'record': {'id': 'rpt-429'}}}, MagicMock(), mock_supabase)
    self.assertTrue(any('usage limit was reached' in str(call) for call in mock_supabase.table().update.call_args_list))

  def test_exception_maps_401_to_friendly_message(self):
    mock_supabase = self._make_supabase_with_data(kf_avg_data={'1.1': 2.0})
    with patch('listener.generate_report_summary', side_effect=RuntimeError('401 API_KEY invalid')):
      listener.handle_new_report({'data': {'record': {'id': 'rpt-401'}}}, MagicMock(), mock_supabase)
    self.assertTrue(any('authentication error' in str(call) for call in mock_supabase.table().update.call_args_list))


if __name__ == '__main__':
  unittest.main()
