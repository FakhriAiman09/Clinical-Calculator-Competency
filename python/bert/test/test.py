# pylint: disable=unused-argument

'''Test cases for the BERT folder.'''

import os
import unittest
from unittest.mock import MagicMock, patch, call

import pandas as pd

import utils              # pylint: disable=import-error
import supabase_to_keras  # pylint: disable=import-error


# ---------------------------------------------------------------------------
# equalizeClasses
# ---------------------------------------------------------------------------

class TestEqualizeClasses(unittest.TestCase):
  '''Test cases for equalizeClasses() in utils.py'''

  def _make_df(self, counts: dict) -> pd.DataFrame:
    '''Helper: build a DataFrame with given class counts.'''
    rows = []
    for level, n in counts.items():
      for i in range(n):
        rows.append({'text': f'sample {level} {i}', 'dev_level': level})
    return pd.DataFrame(rows)

  def test_all_classes_reduced_to_minimum_count(self):
    '''equalizeClasses should downsample every class to the size of the smallest class.'''
    df = self._make_df({'A': 10, 'B': 6, 'C': 8})
    result = utils.equalizeClasses(df, level_col_label='dev_level')
    counts = result['dev_level'].value_counts()
    self.assertEqual(counts.min(), 6)
    self.assertEqual(counts.max(), 6)
    self.assertEqual(len(result), 18)  # 3 classes × 6 samples

  def test_already_balanced_df_is_unchanged_in_size(self):
    '''equalizeClasses on an already balanced DataFrame should not change row count.'''
    df = self._make_df({'A': 5, 'B': 5, 'C': 5})
    result = utils.equalizeClasses(df, level_col_label='dev_level')
    counts = result['dev_level'].value_counts()
    self.assertTrue((counts == 5).all())

  def test_single_class_returns_all_rows(self):
    '''equalizeClasses with a single class should return all rows unchanged.'''
    df = self._make_df({'A': 7})
    result = utils.equalizeClasses(df, level_col_label='dev_level')
    self.assertEqual(len(result), 7)

  def test_empty_dataframe_raises(self):
    '''equalizeClasses on an empty DataFrame should raise because min() has no values.'''
    df = pd.DataFrame(columns=['text', 'dev_level'])
    with self.assertRaises((ValueError, Exception)):
      utils.equalizeClasses(df, level_col_label='dev_level')

  def test_custom_level_column_label(self):
    '''equalizeClasses should work with a custom level column name.'''
    df = pd.DataFrame({
        'text': ['a'] * 4 + ['b'] * 2,
        'my_level': ['X'] * 4 + ['Y'] * 2,
    })
    result = utils.equalizeClasses(df, level_col_label='my_level')
    counts = result['my_level'].value_counts()
    self.assertEqual(counts.min(), 2)
    self.assertEqual(counts.max(), 2)


# ---------------------------------------------------------------------------
# augmentData
# ---------------------------------------------------------------------------

class TestAugmentData(unittest.TestCase):
  '''Test cases for augmentData() in utils.py'''

  def _make_df(self) -> pd.DataFrame:
    return pd.DataFrame({
        'text': ['The patient presented well.', 'Good communication skills.', 'Needs improvement.'],
        'dev_level': [1, 2, 3],
    })

  def test_samples_zero_returns_original_df_unchanged(self):
    '''augmentData with samples=0 must return the exact same DataFrame.'''
    df = self._make_df()
    result = utils.augmentData(df, samples=0)
    pd.testing.assert_frame_equal(result.reset_index(drop=True), df.reset_index(drop=True))

  def test_missing_text_column_raises_value_error(self):
    '''augmentData should raise ValueError when text column is absent.'''
    df = pd.DataFrame({'wrong_col': ['hello'], 'dev_level': [1]})
    with self.assertRaises(ValueError):
      utils.augmentData(df, text_col_label='text', samples=1)

  def test_missing_level_column_raises_value_error(self):
    '''augmentData should raise ValueError when level column is absent.'''
    df = pd.DataFrame({'text': ['hello'], 'wrong_level': [1]})
    with self.assertRaises(ValueError):
      utils.augmentData(df, level_col_label='dev_level', samples=1)

  @patch('utils.naw.SynonymAug')
  def test_samples_nonzero_increases_row_count(self, mock_aug_cls):
    '''augmentData with samples>0 should produce more rows than the original.'''
    # Mock SynonymAug to return a predictable augmented text
    mock_aug = MagicMock()
    mock_aug.augment.return_value = ['augmented text']
    mock_aug_cls.return_value = mock_aug

    df = self._make_df()
    result = utils.augmentData(df, samples=1)
    self.assertGreater(len(result), len(df))

  @patch('utils.naw.SynonymAug')
  def test_original_rows_preserved_after_augmentation(self, mock_aug_cls):
    '''augmentData output must contain all original rows plus augmented ones.'''
    mock_aug = MagicMock()
    mock_aug.augment.return_value = ['augmented text']
    mock_aug_cls.return_value = mock_aug

    df = self._make_df()
    result = utils.augmentData(df, samples=1)
    # All original texts still present
    for text in df['text']:
      self.assertIn(text, result['text'].values)


# ---------------------------------------------------------------------------
# exportDfPickle
# ---------------------------------------------------------------------------

class TestExportDfPickle(unittest.TestCase):
  '''Test cases for exportDfPickle() in utils.py'''

  def _make_df(self) -> pd.DataFrame:
    return pd.DataFrame({'text': ['hello', 'world'], 'dev_level': [1, 2]})

  @patch('utils.os.path.exists', return_value=False)
  def test_dry_run_does_not_write_file(self, mock_exists):
    '''exportDfPickle with dry_run=True should never call df.to_pickle.'''
    df = self._make_df()
    df.to_pickle = MagicMock()
    utils.exportDfPickle(df, destination='output.pkl', dry_run=True)
    df.to_pickle.assert_not_called()

  @patch('utils.os.path.exists', return_value=False)
  def test_normal_run_writes_pickle(self, mock_exists):
    '''exportDfPickle should call df.to_pickle with the destination path.'''
    df = self._make_df()
    df.to_pickle = MagicMock()
    utils.exportDfPickle(df, destination='output.pkl', dry_run=False)
    df.to_pickle.assert_called_once_with('output.pkl')

  @patch('utils.os.path.exists', return_value=True)
  def test_existing_file_without_force_raises_value_error(self, mock_exists):
    '''exportDfPickle should raise ValueError if destination exists and force=False.'''
    df = self._make_df()
    with self.assertRaises(ValueError):
      utils.exportDfPickle(df, destination='output.pkl', force=False)

  @patch('utils.os.remove')
  @patch('utils.os.path.exists', return_value=True)
  def test_force_overwrite_removes_existing_file(self, mock_exists, mock_remove):
    '''exportDfPickle with force=True should remove the old file before writing.'''
    df = self._make_df()
    df.to_pickle = MagicMock()
    utils.exportDfPickle(df, destination='output.pkl', force=True, dry_run=False)
    mock_remove.assert_called_once_with('output.pkl')
    df.to_pickle.assert_called_once_with('output.pkl')

  @patch('utils.os.remove')
  @patch('utils.os.path.exists', return_value=True)
  def test_force_with_dry_run_removes_file_but_skips_write(self, mock_exists, mock_remove):
    '''exportDfPickle with force=True and dry_run=True should remove the old file but not write.'''
    df = self._make_df()
    df.to_pickle = MagicMock()
    utils.exportDfPickle(df, destination='output.pkl', force=True, dry_run=True)
    mock_remove.assert_called_once_with('output.pkl')
    df.to_pickle.assert_not_called()


# ---------------------------------------------------------------------------
# getDatasetName
# ---------------------------------------------------------------------------

class TestGetDatasetName(unittest.TestCase):
  '''Test cases for getDatasetName() in supabase_to_keras.py'''

  def test_provided_name_returned_unchanged(self):
    '''getDatasetName should return the provided name as-is when name is not None.'''
    result = supabase_to_keras.getDatasetName(
        name='my-dataset',
        training_split=0.8,
        augment_count=0,
        equalize=False,
    )
    self.assertEqual(result, 'my-dataset')

  def test_provided_name_ignores_other_params(self):
    '''getDatasetName should ignore split/augment/equalize params when name is given.'''
    result_a = supabase_to_keras.getDatasetName('fixed', 0.8, 0, False)
    result_b = supabase_to_keras.getDatasetName('fixed', 0.6, 5, True)
    self.assertEqual(result_a, result_b)

  def test_none_name_raises_because_of_args_reference(self):
    '''getDatasetName with name=None references module-level `args` which is not defined
    outside __main__, causing a NameError. This documents a known bug in the function.'''
    with self.assertRaises(NameError):
      supabase_to_keras.getDatasetName(
          name=None,
          training_split=0.8,
          augment_count=0,
          equalize=False,
      )


# ---------------------------------------------------------------------------
# querySupabase — pagination
# ---------------------------------------------------------------------------

class TestQuerySupabase(unittest.TestCase):
  '''Test cases for querySupabase() in utils.py'''

  def _make_rows(self, n: int, offset: int = 0) -> list:
    return [{'text': f'row {i}', 'dev_level': i % 4} for i in range(offset, offset + n)]

  @patch('utils.create_client')
  @patch('utils.os.environ.get')
  def test_missing_env_vars_raise_value_error(self, mock_get, mock_create_client):
    '''querySupabase should raise ValueError when env vars are missing.'''
    mock_get.side_effect = lambda key, default='': ''
    with self.assertRaises(ValueError):
      utils.querySupabase()

  @patch('utils.create_client')
  @patch('utils.os.environ.get')
  def test_single_page_under_1000_rows(self, mock_get, mock_create_client):
    '''querySupabase should return all rows when total is under 1000 (no pagination needed).'''
    mock_get.side_effect = lambda key, default='': 'mock-value'

    rows = self._make_rows(500)
    first_response = MagicMock()
    first_response.data = rows
    first_response.count = 500

    mock_table = MagicMock()
    mock_table.select.return_value.execute.return_value = first_response
    mock_schema = MagicMock()
    mock_schema.table.return_value = mock_table
    mock_create_client.return_value.schema.return_value = mock_schema

    result = utils.querySupabase()
    self.assertEqual(len(result), 500)

  @patch('utils.create_client')
  @patch('utils.os.environ.get')
  def test_pagination_fetches_all_rows_over_1000(self, mock_get, mock_create_client):
    '''querySupabase must loop and fetch remaining rows when count > 1000.'''
    mock_get.side_effect = lambda key, default='': 'mock-value'

    first_rows = self._make_rows(1000, offset=0)
    second_rows = self._make_rows(500, offset=1000)

    first_response = MagicMock()
    first_response.data = first_rows
    first_response.count = 1500

    second_response = MagicMock()
    second_response.data = second_rows

    # First call: .select("*", count=...).execute() → first_response
    # Second call (pagination): .select("*").range(...).execute() → second_response
    mock_select_count = MagicMock()
    mock_select_count.execute.return_value = first_response

    mock_select_range = MagicMock()
    mock_select_range.execute.return_value = second_response

    mock_range = MagicMock()
    mock_range.return_value = mock_select_range

    mock_select_plain = MagicMock()
    mock_select_plain.range = mock_range

    mock_table = MagicMock()
    mock_table.select.side_effect = lambda *args, **kwargs: (
        mock_select_count if 'count' in kwargs else mock_select_plain
    )

    mock_schema = MagicMock()
    mock_schema.table.return_value = mock_table
    mock_create_client.return_value.schema.return_value = mock_schema

    result = utils.querySupabase()
    self.assertEqual(len(result), 1500)

  @patch('utils.create_client')
  @patch('utils.os.environ.get')
  def test_none_count_raises_value_error(self, mock_get, mock_create_client):
    '''querySupabase should raise ValueError when response.count is None.'''
    mock_get.side_effect = lambda key, default='': 'mock-value'

    bad_response = MagicMock()
    bad_response.data = []
    bad_response.count = None

    mock_table = MagicMock()
    mock_table.select.return_value.execute.return_value = bad_response
    mock_schema = MagicMock()
    mock_schema.table.return_value = mock_table
    mock_create_client.return_value.schema.return_value = mock_schema

    with self.assertRaises(ValueError):
      utils.querySupabase()


if __name__ == '__main__':
  unittest.main()
