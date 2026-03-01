'''
Utility functions for the BERT model.
'''

import os

import nlpaug.augmenter.word as naw
import pandas as pd

from dotenv import load_dotenv
from postgrest.types import CountMethod
from supabase import Client, create_client


def querySupabase(verbose: bool = False) -> pd.DataFrame:
  '''
  Queries the Supabase database for text responses and returns the data as a pandas DataFrame.

  :param verbose: If True, print verbose output. Defaults to False.
  :type verbose: bool

  :return: A pandas DataFrame containing the text responses.
  :rtype: pd.DataFrame

  :raises ValueError: If the Supabase URL or key is not found in the environment variables.
  '''

  # Load environment variables from .env file
  load_dotenv()
  url: str = os.environ.get("SUPABASE_URL", "")
  key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

  if url == "" or key == "":
    raise ValueError("Supabase URL or key not found in environment variables.")

  supabase: Client = create_client(url, key)

  if verbose:
    print("Querying Supabase database...")

  # queries are limited to 1000 rows
  response = (
      supabase.schema("trainingdata")
      .table("text_responses")
      .select("*", count=CountMethod.exact)
      .execute()
  )

  df = pd.DataFrame(response.data)
  count = response.count

  if count is None:
    raise ValueError("Supabase response count is None.")

  # loop until all rows are loaded
  while len(df) < count:
    response = (
        supabase.schema("trainingdata")
        .table("text_responses")
        .select("*")
        .range(len(df), len(df) + 1000)
        .execute()
    )
    df = pd.concat([df, pd.DataFrame(response.data)])

  if verbose:
    print(f'Loaded {len(df)} rows out of {count}')

  return df


def augmentData(
    df: pd.DataFrame,
    text_col_label: str = 'text',
    level_col_label: str = 'dev_level',
    samples: int = 0,
    verbose: bool = False
) -> pd.DataFrame:
  '''
  Augments the data to create more samples.

  :param df: The DataFrame to augment.
  :type df: DataFrame

  :param verbose: If True, print verbose output. Defaults to False.
  :type verbose: bool

  :param text_col_label: The label of the text column. Defaults to ``'text'``.
  :type text_col_label: str

  :param level_col_label: The label of the level column. Defaults to ``'dev_level'``.
  :type level_col_label: str

  :param synonym: The number of augmented samples to generate. Defaults to 0.
  :type synonym: int

  :return: The augmented DataFrame.
  :rtype: DataFrame
  '''

  if verbose:
    print("Augmenting data...")

  # Ensure the specified columns exist in the DataFrame
  if text_col_label not in df.columns:
    raise ValueError(f"The DataFrame must have a column labeled '{text_col_label}'.")
  if level_col_label not in df.columns:
    raise ValueError(f"The DataFrame must have a column labeled '{level_col_label}'.")

  if samples == 0:
    return df

  # Augmentation setups
  synonym_aug = naw.SynonymAug(aug_src='wordnet')

  # Create a DataFrame to hold augmented rows
  augmented_rows = []

  if verbose:
    print(f"Generating {samples} augmented samples per sample...")

  # Iterate through each row in the DataFrame
  for _, row in df.iterrows():
    original_text = row[text_col_label]
    level = row[level_col_label]

    # Apply synonym replacement if enabled
    if samples and synonym_aug:
      augmented_texts = synonym_aug.augment(original_text, n=samples)
      for aug_text in augmented_texts:
        augmented_rows.append({text_col_label: aug_text, level_col_label: level})

  # Convert the augmented rows into a DataFrame
  augmented_df = pd.DataFrame(augmented_rows)

  if verbose:
    print(f"Generated {len(augmented_df)} augmented samples.")

  # Concatenate the original DataFrame with the augmented DataFrame
  result_df = pd.concat([df, augmented_df], ignore_index=True)

  return result_df


def equalizeClasses(
    df: pd.DataFrame,
    level_col_label: str = 'dev_level',
    verbose: bool = False,
) -> pd.DataFrame:
  '''
  Equalizes the number of samples in each class .

  : param df: The DataFrame to equalize.
  : type df: DataFrame

  : param level_col_label: The label of the level column. Defaults to ``'dev_level'``.
  : type level_col_label: str

  : param verbose: If True, print verbose output. Defaults to False.
  : type verbose: bool

  : return: The equalized DataFrame.
  : rtype: DataFrame
  '''

  # get the number of samples in each class
  min_rows = min(df[level_col_label].value_counts())

  if verbose:
    print(f'Equalizing {len(df)} samples to {min_rows} samples per class...')

  # equalize the number of samples in each class
  return df.groupby(level_col_label).apply(lambda x: x.sample(min_rows, random_state=42))


def exportKerasFolder(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    destination: str,
    text_col_label: str = 'text',
    level_col_label: str = 'dev_level',
    class_names: list[str] | None = None,
    verbose: bool = False,
    dry_run: bool = False,
    force: bool = False,
) -> None:
  '''
  Export the DataFrame to a folder in Keras format.
  The folder will be compatible with ``keras.utils.text_dataset_from_directory``.
  The directory structure will be as follows: :

    train/
    ├── remedial/
    │   ├── 0.txt
    │   ├── 1.txt
    │   └── ...
    ├── early_dev/
    │   ├── 2.txt
    │   ├── 3.txt
    │   └── ...
    └── ...
    test/
    ├── remedial/
    │   ├── 4.txt
    │   ├── 5.txt
    │   └── ...
    └── ...

  where each class is a folder, and each file is a text file containing the description.

  :param train_df: The training DataFrame.
  :type train_df: DataFrame

  :param val_df: The validation DataFrame.
  :type val_df: DataFrame

  :param test_df: The testing DataFrame.
  :type test_df: DataFrame

  :param destination: The destination folder.
  :type destination: str

  :param text_col_label: The label of the text column. Defaults to ``'text'``.
  :type text_col_label: str

  :param level_col_label: The label of the level column. Defaults to ``'dev_level'``.
  :type level_col_label: str

  :param class_names: The names of the classes.
  Defaults to ``['remedial', 'early_dev', 'developing', 'entrustable']``.
  :type class_names: list[str]

  :param verbose: If True, print verbose output. Defaults to False.
  :type verbose: bool

  :param dry_run: If True, do not write any files. Defaults to False.
  :type dry_run: bool

  :param force: If True, force overwrite the destination folder. Defaults to False.
  :type force: bool
  '''
  if class_names is None:
    class_names = ['remedial', 'early_dev', 'developing', 'entrustable']
  classes = train_df[level_col_label].unique()

  # if os.path.exists(destination):
  #   if force:
  #     if verbose:
  #       print(f'Removing existing folder {destination}...')
  #     shutil.rmtree(destination)
  #   else:
  #     raise ValueError(
  #         f'Destination folder {destination} already exists. Use --force to overwrite.')

  if not dry_run:
    if verbose:
      print(f'Creating folder {destination}...')
    os.makedirs(destination)
    for c in classes:
      os.makedirs(os.path.join(destination, 'train', class_names[c]), exist_ok=force)
      os.makedirs(os.path.join(destination, 'validate', class_names[c]), exist_ok=force)
      os.makedirs(os.path.join(destination, 'test', class_names[c]), exist_ok=force)
  else:
    if verbose:
      print(f'Would create folder {destination}...')

  if verbose:
    print(f'Exporting {len(train_df)} training, {len(val_df)} validation, and {len(test_df)} '
          f'testing samples ({len(train_df) + len(val_df) + len(test_df)} total)...')

  for df, split in [(train_df, 'train'), (val_df, 'validate'), (test_df, 'test')]:
    for c in classes:
      class_df = df[df[level_col_label] == c]
      if dry_run:
        if verbose:
          print(f'Would write {len(class_df)} {split} samples for class {class_names[c]}')
      else:
        if verbose:
          print(f'Writing {len(class_df)} {split} samples for class {class_names[c]}')
        for i, row in class_df.iterrows():
          with open(os.path.join(destination, split, class_names[c], f'{i}.txt'), 'w') as f:
            f.write(str(row[text_col_label]))


def exportDfPickle(
    df: pd.DataFrame,
    destination: str,
    verbose: bool = False,
    dry_run: bool = False,
    force: bool = False,
) -> None:
  '''
  Export the DataFrame to a pickle file.

  :param df: The DataFrame to export.
  :type df: DataFrame

  :param destination: The destination file.
  :type destination: str

  :param verbose: If True, print verbose output. Defaults to False.
  :type verbose: bool

  :param dry_run: If True, do not write any files. Defaults to False.
  :type dry_run: bool

  :param force: If True, force overwrite the destination file. Defaults to False.
  :type force: bool
  '''

  if os.path.exists(destination):
    if force:
      if verbose:
        print(f'Removing existing file {destination}...')
      os.remove(destination)
    else:
      raise ValueError(
          f'Destination file {destination} already exists. Use --force to overwrite.')

  if not dry_run:
    if verbose:
      print(f'Exporting DataFrame to {destination}...')
    df.to_pickle(destination)
  else:
    if verbose:
      print(f'Would export DataFrame to {destination}')
