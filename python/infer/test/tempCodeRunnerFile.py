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


if __name__ == "__main__":
  unittest.main()
