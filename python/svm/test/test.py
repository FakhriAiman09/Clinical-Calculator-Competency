# pylint: disable=unused-argument

'''Test cases for the SVM folder.'''

import unittest
from unittest.mock import call, patch, MagicMock

import numpy as np
import pandas as pd
from postgrest.base_request_builder import SingleAPIResponse
from sklearn.svm import SVC

import fetch_data  # pylint: disable=import-error
import train  # pylint: disable=import-error
import util  # pylint: disable=import-error


class TestFetchData(unittest.TestCase):
  '''Test cases for fetch_data module.'''

  @patch("fetch_data.create_client")
  @patch("fetch_data.os.makedirs")
  @patch("fetch_data.os.environ.get")
  def test_fetch_data_env_vars_missing(
      self, mock_get, mock_makedirs, mock_create_client
  ):
    """Test fetch_data raises ValueError when environment variables are missing."""
    mock_get.side_effect = lambda key, default: ""  # Simulate missing env vars
    with self.assertRaises(ValueError):
      fetch_data.fetch_data()

  @patch("fetch_data.create_client")
  @patch("fetch_data.os.makedirs")
  @patch("fetch_data.os.environ.get")
  @patch("fetch_data.load_dotenv")
  def test_fetch_data_raises_on_response_error(
      self, mock_dotenv, mock_get, mock_makedirs, mock_create_client
  ):
    """Test fetch_data raises ValueError when response contains an error."""
    mock_get.side_effect = lambda key, default="": "dummy"  # Env vars present

    # Mock response with an error
    mock_response = MagicMock()
    mock_response.error = MagicMock()
    mock_response.error.message = "Simulated error"
    mock_response.data = {"kf_descriptions": {}}

    mock_supabase = MagicMock()
    mock_supabase.schema().table().select().single().execute.return_value = mock_response

    mock_create_client.return_value = mock_supabase

    with self.assertRaises(ValueError) as context:
      fetch_data.fetch_data()

    self.assertIn("Error fetching kf_descriptions: Simulated error", str(context.exception))

  @patch("fetch_data.create_client")
  @patch("fetch_data.os.makedirs")
  @patch("fetch_data.os.environ.get")
  @patch("fetch_data.load_dotenv")
  def test_fetch_data_raises_on_missing_kf_descriptions(
      self, mock_dotenv, mock_get, mock_makedirs, mock_create_client
  ):
    """Test fetch_data raises ValueError when 'kf_descriptions' is missing in response data."""
    mock_get.side_effect = lambda key, default="": "dummy"  # Env vars present

    # Mock response with no error but missing 'kf_descriptions'
    mock_response = MagicMock()
    mock_response.error = None
    mock_response.data = {"something_else": {}}

    mock_supabase = MagicMock()
    (mock_supabase.schema.return_value
                  .table.return_value
                  .select.return_value
                  .single.return_value
                  .execute.return_value) = mock_response

    mock_create_client.return_value = mock_supabase

    with self.assertRaises(ValueError) as context:
      fetch_data.fetch_data()

    self.assertIn("kf_descriptions not found in the response data", str(context.exception))

  @patch("fetch_data.create_client")
  @patch("fetch_data.os.makedirs")
  @patch("fetch_data.os.environ.get")
  @patch("fetch_data.query_supabase", return_value=[{"id": 1, "value": "test"}])
  @patch("fetch_data.pd.DataFrame.to_csv")
  def test_fetch_data_success(
          self, mock_to_csv, mock_query_supabase, mock_get, mock_makedirs, mock_create_client
  ):
    """Test fetch_data successfully fetches and saves data."""

    mock_get.side_effect = lambda key, default: "mock_url" if key == "SUPABASE_URL" else "mock_key"
    mock_supabase = MagicMock()
    mock_create_client.return_value = mock_supabase

    mock_response = MagicMock(spec=SingleAPIResponse)
    mock_response.data = {"kf_descriptions": {"1.1": "desc1", "2.1": "desc2"}}
    mock_response.error = None
    mock_supabase.schema().table().select().single().execute.return_value = mock_response

    fetch_data.fetch_data()

    mock_create_client.assert_called_once_with("mock_url", "mock_key")
    mock_to_csv.assert_called()

  @patch("fetch_data.create_client")
  def test_query_supabase(self, mock_create_client):
    """Test query_supabase fetches data correctly."""

    mock_supabase = MagicMock()
    mock_create_client.return_value = mock_supabase

    mock_response = MagicMock(spec=SingleAPIResponse)
    mock_response.data = [{"id": 1, "value": "test"}]
    mock_supabase.schema().table().select().execute.return_value = mock_response

    result = fetch_data.query_supabase(mock_supabase, "mock_table")
    self.assertEqual(result, [{"id": 1, "value": "test"}])


class TestUtil(unittest.TestCase):
  '''Test cases for util module.'''

  @patch("builtins.print")
  def test_log(self, mock_print):
    """Test log only prints when verbose is True."""

    util.log(True, "Test Message")
    mock_print.assert_called_once_with("Test Message", end='\n')

    mock_print.reset_mock()
    util.log(False, "Test Message")
    mock_print.assert_not_called()

  @patch("util.pickle.dump")
  @patch("builtins.open", new_callable=unittest.mock.mock_open)
  @patch("util.os.makedirs")
  @patch("fetch_data.create_client")
  def test_export_upload_model(
      self, mock_create_client, mock_makedirs, mock_open, mock_pickle_dump
  ):
    """Test export_upload_model exports and uploads a model correctly."""

    mock_supabase = MagicMock()
    mock_create_client.return_value = mock_supabase

    model = SVC()

    util.export_upload_model(model, "test_kf", supabase=mock_supabase)

    mock_makedirs.assert_called_once_with("models", exist_ok=True)
    mock_open.assert_has_calls([
        call("models/test_kf.pkl", 'wb'),
        call("models/test_kf.pkl", 'rb')
    ], any_order=True)
    mock_pickle_dump.assert_called_once()
    mock_supabase.storage.from_.assert_called_once_with("svm-models")
    mock_supabase.storage.from_().update.assert_called_once()


class TestTrainSVM(unittest.TestCase):
  '''Test cases for train_svm function in train module.'''

  def setUp(self):
    # Minimal valid DataFrame
    self.df = pd.DataFrame({  # pylint: disable=attribute-defined-outside-init
        'feature1': np.random.rand(25),
        'feature2': np.random.rand(25),
        'label': [0, 1] * 12 + [0]
    })

  def test_train_svm_success(self):
    """Test SVM training returns accuracy and model."""
    accuracy, model = train.train_svm("test_kf", self.df)
    self.assertIsInstance(accuracy, float)
    self.assertIsInstance(model, SVC)

  def test_train_svm_insufficient_data(self):
    """Test SVM training fails if not enough data after filtering."""
    small_df = self.df.head(5)
    accuracy, model = train.train_svm("short_kf", small_df)
    self.assertIsNone(accuracy)
    self.assertIsNone(model)

  def test_train_svm_oversampling(self):
    """Test SVM training with oversampling enabled."""
    # Force class imbalance
    imbalanced_df = self.df.copy()
    imbalanced_df['label'] = [0] * 23 + [1, 1]
    accuracy, model = train.train_svm("oversample_kf", imbalanced_df, oversample=True)
    self.assertIsInstance(accuracy, float)
    self.assertIsInstance(model, SVC)


class TestMainTrain(unittest.TestCase):
  '''Test cases for the main function in train module.'''

  @patch("train.load_dotenv")
  @patch("train.create_client")
  @patch("train.fetch_data")
  @patch("train.glob.glob", return_value=["data/mock.csv"])
  @patch("train.pd.read_csv")
  @patch("train.export_upload_model")
  @patch("train.os.environ.get")
  @patch("train.os.path.exists", return_value=False)
  @patch("train.os.makedirs")
  def test_main_success(
      self, mock_makedirs, mock_exists, mock_environ_get, mock_export,
      mock_read_csv, mock_glob, mock_fetch, mock_create_client, mock_dotenv
  ):
    """Test the main function in train module runs successfully."""
    mock_environ_get.side_effect = lambda key, default=None: "mock"  # Mock env vars
    mock_read_csv.return_value = pd.DataFrame({
        'feature1': np.random.rand(25),
        'feature2': np.random.rand(25),
        'label': [0, 1] * 12 + [0]
    })

    class Args:
      '''Mock command-line arguments for the main function.'''
      no_fetch = False
      train_proportion = 0.8
      length_threshold = 20
      oversample = False
      verbose = False

    train.main(Args())

    mock_fetch.assert_called_once()
    mock_export.assert_called_once()


if __name__ == "__main__":
  unittest.main()
