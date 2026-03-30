# pylint: disable=unused-argument, disable=attribute-defined-outside-init

'''Unit tests for the inference module.'''

import pickle
# import os
import unittest
from unittest.mock import MagicMock, patch, mock_open

import numpy as np

# import tensorflow as tf

import inference
import listener


class TestInference(unittest.TestCase):
  '''Unit tests for the inference module.'''

  def test_bert_infer_single_class(self):
    '''Test the BERT inference function with a single class prediction.'''
    mock_model = MagicMock()
    mock_model.predict.return_value = np.array([[0.1, 0.9], [0.2, 0.8]])

    input_data = {"item1": ["sentence 1", "sentence 2"]}
    result = inference.bert_infer(mock_model, input_data)

    self.assertEqual(result, {"item1": 1})
    mock_model.predict.assert_called_once()

  def test_svm_infer_correct_class(self):
    '''Test the SVM inference function with a correct class prediction.'''
    mock_model = MagicMock()
    mock_model.predict.return_value = [1]

    models = {"mcq_kfabc": mock_model}
    data = {"abc": [True, False, True]}

    result = inference.svm_infer(models, data)
    self.assertEqual(result, {"abc": 1})
    mock_model.predict.assert_called_once()

  @patch("tensorflow.keras.models.load_model")
  @patch("os.path.exists", return_value=True)
  def test_load_bert_model_success(self, mock_exists, mock_load_model):
    '''Test loading a BERT model successfully.'''
    mock_model = MagicMock()
    mock_load_model.return_value = mock_model

    model = inference.load_bert_model("mock_model_path")
    self.assertEqual(model, mock_model)
    mock_load_model.assert_called_once_with("mock_model_path", compile=False)

  @patch("os.path.exists", return_value=False)
  def test_load_bert_model_file_not_found(self, mock_exists):
    '''Test loading a BERT model when the file does not exist.'''
    with self.assertRaises(FileNotFoundError):
      inference.load_bert_model("nonexistent_path")

  @patch("builtins.open", new_callable=mock_open)
  @patch("os.makedirs")
  @patch("os.path.exists", return_value=False)
  def test_download_svm_models(self, mock_exists, mock_makedirs, mock_file):
    '''Test downloading SVM models from Supabase storage.'''
    mock_bucket = MagicMock()
    mock_bucket.list.return_value = [{'name': 'model1.pkl'}]
    mock_bucket.download.return_value = b"mock_pickle_data"

    mock_supabase = MagicMock()
    mock_supabase.storage.from_.return_value = mock_bucket

    inference.download_svm_models(mock_supabase)

    mock_makedirs.assert_called_once_with("svm-models")
    mock_file.assert_called_once_with("svm-models/model1.pkl", "wb")
    mock_file().write.assert_called_once_with(b"mock_pickle_data")

  @patch("builtins.open", new_callable=mock_open, read_data=pickle.dumps("mock_model"))
  @patch("os.listdir", return_value=["model1.pkl"])
  def test_load_svm_models_success(self, mock_listdir, mock_file):
    '''Test loading SVM models from the local "svm-models" directory.'''
    with patch("pickle.load", return_value="mock_model") as mock_pickle_load:
      models = inference.load_svm_models()

    self.assertIn("model1", models)
    self.assertEqual(models["model1"], "mock_model")
    mock_pickle_load.assert_called_once()


class TestListener(unittest.TestCase):
  '''Unit tests for the listener module.'''

  def setUp(self):
    self.payload = {"data":
                    {"record":
                     {"response_id": "abc123",
                      "response": {"response": {"1": {"1.1": {"text": ["Great product!"],
                                                              "1.1.1": True, "1.1.2": False},
                                                      "1.2": {"text": ["Needs improvement."],
                                                              "1.2.1": False, "1.2.2": True}}}}}}}
    self.mock_bert_model = MagicMock()
    self.mock_bert_model.predict.return_value = np.array([[0.1, 0.9]])

    self.mock_svm_models = {
        "mcq_kf1_1": MagicMock(),
        "mcq_kf1_2": MagicMock()
    }
    self.mock_svm_models["mcq_kf1_1"].predict.return_value = [1]
    self.mock_svm_models["mcq_kf1_2"].predict.return_value = [0]

    self.mock_supabase = MagicMock()
    self.mock_supabase.table.return_value.insert.return_value.execute.return_value = None

  @patch("inference.bert_infer")
  @patch("inference.svm_infer")
  def test_handle_new_response(self, mock_svm_infer, mock_bert_infer):
    '''Test the handle_new_response function in the listener module.'''
    # Mock inference functions
    mock_bert_infer.return_value = {"1.1": 1, "1.2": 1}
    mock_svm_infer.return_value = {"1.1": 1, "1.2": 0}

    listener.handle_new_response(self.payload, self.mock_bert_model,
                                 self.mock_svm_models, self.mock_supabase)

    # Check that data was inserted into Supabase
    self.mock_supabase.table.assert_called_with("form_results")
    self.mock_supabase.table().insert.assert_called_once()

    inserted_data = self.mock_supabase.table().insert.call_args[0][0]
    self.assertEqual(inserted_data["response_id"], "abc123")
    self.assertIn("results", inserted_data)
    self.assertEqual(inserted_data["results"]["1.1"], 1)
    self.assertEqual(inserted_data["results"]["1.2"], 0.25)


class TestGenerateReportSummaryRetry(unittest.TestCase):
  '''Tests for generate_report_summary() retry and failure behaviour.'''

  def _make_gemini(self, responses):
    '''Helper: build a mock Gemini client that returns responses in sequence.'''
    mock_gemini = MagicMock()
    mock_gemini.models.generate_content.side_effect = responses
    return mock_gemini

  def test_returns_valid_json_on_first_attempt(self):
    '''generate_report_summary should return parsed JSON string on first success.'''
    import json
    mock_response = MagicMock()
    mock_response.text = '{"1.1": "Good performance"}'
    mock_gemini = self._make_gemini([mock_response])

    result = inference.generate_report_summary({"1.1": 2.5}, mock_gemini)
    parsed = json.loads(result)
    self.assertEqual(parsed["1.1"], "Good performance")

  def test_all_retries_exhausted_returns_error_string(self):
    '''generate_report_summary should return an error string after 3 failed attempts.
    SERIOUS ISSUE: this error string is misleading — it always says "rate limit exceeded"
    even when the real cause is invalid JSON from Gemini.'''
    mock_response = MagicMock()
    mock_response.text = 'not valid json {{{'
    mock_gemini = self._make_gemini([mock_response, mock_response, mock_response])

    result = inference.generate_report_summary({"1.1": 2.5}, mock_gemini)
    self.assertIn('Error', result)
    self.assertEqual(mock_gemini.models.generate_content.call_count, 3)

  def test_rate_limit_exception_retries_and_exhausts(self):
    '''generate_report_summary should retry on 429 rate limit and return error after 3 attempts.'''
    mock_gemini = MagicMock()
    mock_gemini.models.generate_content.side_effect = Exception('429 RESOURCE_EXHAUSTED')

    with patch('time.sleep'):  # time is imported locally in generate_report_summary
      result = inference.generate_report_summary({"1.1": 1.0}, mock_gemini)

    self.assertIn('Error', result)
    self.assertEqual(mock_gemini.models.generate_content.call_count, 3)

  def test_non_rate_limit_exception_raises_immediately(self):
    '''generate_report_summary should re-raise immediately on non-rate-limit errors.'''
    mock_gemini = MagicMock()
    mock_gemini.models.generate_content.side_effect = ValueError('unexpected error')

    with self.assertRaises(ValueError):
      inference.generate_report_summary({"1.1": 1.0}, mock_gemini)

    self.assertEqual(mock_gemini.models.generate_content.call_count, 1)


class TestSVMInferMissingModel(unittest.TestCase):
  '''Tests for svm_infer() when a model key is missing.'''

  def test_missing_model_key_raises_key_error(self):
    '''svm_infer should raise KeyError when the model for a key function is absent.
    SERIOUS ISSUE: this crashes handle_new_response silently — student gets no score saved.'''
    models = {}  # no models loaded
    data = {"1.1": [True, False, True]}

    with self.assertRaises(KeyError):
      inference.svm_infer(models, data)


class TestHandleNewResponseKeyMismatch(unittest.TestCase):
  '''Tests for handle_new_response() when BERT and SVM return different key sets.'''

  @patch("inference.bert_infer")
  @patch("inference.svm_infer")
  def test_bert_svm_key_mismatch_does_not_write_to_db(self, mock_svm_infer, mock_bert_infer):
    '''handle_new_response should not write to DB when BERT and SVM keys differ.
    SERIOUS ISSUE: svms_res[k] raises KeyError — result is never stored for the student.'''
    mock_bert_infer.return_value = {"1.1": 1, "1.2": 0}
    mock_svm_infer.return_value = {"1.1": 1}  # missing "1.2" — mismatch

    payload = {"data": {"record": {
        "response_id": "mismatch-test",
        "response": {"response": {"1": {
            "1.1": {"text": ["Good"], "1.1.1": True},
            "1.2": {"text": ["Okay"], "1.2.1": False},
        }}}
    }}}

    mock_supabase = MagicMock()
    listener.handle_new_response(payload, MagicMock(), MagicMock(), mock_supabase)

    # DB insert should NOT have been called due to KeyError in weighted average
    mock_supabase.table.return_value.insert.assert_not_called()


class TestHandleNewReportEmptyData(unittest.TestCase):
  '''Tests for handle_new_report() when kf_avg_data is missing or empty.'''

  def test_empty_kf_avg_data_writes_no_data_message(self):
    '''handle_new_report should update llm_feedback with a "no data" message
    when kf_avg_data is None — not call Gemini at all.'''
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value \
        .single.return_value.execute.return_value.data = {'kf_avg_data': None}

    mock_gemini = MagicMock()
    payload = {"data": {"record": {"id": "report-empty"}}}

    listener.handle_new_report(payload, mock_gemini, mock_supabase)

    mock_gemini.models.generate_content.assert_not_called()
    update_calls = mock_supabase.table.return_value.update.call_args_list
    final_message = update_calls[-1][0][0].get('llm_feedback', '')
    self.assertIn('No assessment data', final_message)


class TestWaitForModelsTimeout(unittest.TestCase):
  '''Tests for wait_for_models() timeout behaviour.'''

  @patch('listener.time.sleep')
  @patch('listener.os.path.exists', return_value=False)
  def test_raises_timeout_error_when_deadline_exceeded(self, mock_exists, mock_sleep):
    '''wait_for_models should raise TimeoutError when models never appear.
    SERIOUS ISSUE: main() has no try/except around this — the entire service crashes.
    Note: time.time() is called by both wait_for_models AND Python's logging internals
    so we use itertools.chain to supply enough 0s before the deadline-exceeded value.'''
    import itertools
    # First 10 calls return 0 (deadline not exceeded), then unlimited 999999 (exceeded).
    # This covers all internal logging calls to time.time() without running out.
    time_values = itertools.chain([0] * 10, itertools.repeat(999999))
    with patch('listener.time.time', side_effect=time_values):
      with self.assertRaises(TimeoutError):
        listener.wait_for_models(timeout_minutes=1)


if __name__ == "__main__":
  unittest.main()
