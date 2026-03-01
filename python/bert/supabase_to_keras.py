'''
Converts the supabase dataset to a keras dataset.
'''

import os

import argparse
import pandas as pd

from utils import augmentData, equalizeClasses, exportKerasFolder, querySupabase

def getDatasetName(name: str, training_split: float, augment_count: int, equalize: bool) -> str:
  dataset_name = name
  if dataset_name is None:
    yymmdd = pd.Timestamp.now().strftime('%y%m%d')
    dataset_name = f'{yymmdd}-{training_split * 100:.0f}'
    if args.augment_count > 0:
      dataset_name += f'-aug-{augment_count}'
    if args.equalize:
      dataset_name += '-eq'
  return dataset_name

if __name__ == "__main__":
  parser = argparse.ArgumentParser(description='''
      Convert Supabase training data to Keras dataset.
      The dataset will be saved in "./data/keras/<dataset_name>".
      ''')

  parser.add_argument('-f', '--force', action='store_true',
                      help='force overwrite if destination folder exists')
  parser.add_argument('-s', '--split', type=float, default=0.8,
                      help='specify a training split; default is 0.8')
  parser.add_argument('-v', '--verbose', action='store_true',
                      help='verbose output')

  parser.add_argument('--augment-count', type=int, default=0,
                      help='number of augmented samples to generate using synonyms')
  parser.add_argument('--ds_name', type=str, default=None,
                      help='custom dataset name; default is <yymmdd>-<split>[-aug][-eq]')
  parser.add_argument('--dry-run', action='store_true',
                      help='run through the program without writing any files')
  parser.add_argument('--equalize', action='store_true',
                      help='equalize the number of samples in each class')

  args = parser.parse_args()

  folder_path = os.path.join(os.getcwd(), 'data', 'keras')

  # Get arguments
  force = args.force
  training_split = args.split
  verbose = args.verbose
  augment_count = args.augment_count
  equalize = args.equalize

  if not 0 < training_split < 1:
    raise ValueError("Training split must be between 0 and 1.")

  # Construct dataset name
  dataset_name = getDatasetName(args.ds_name, training_split, augment_count, equalize)

  # Handle if dataset already exists
  if os.path.exists(os.path.join(folder_path, dataset_name)) and not force:
    suffix = 1
    new_dataset_name = f"{dataset_name}_{suffix}"
    while os.path.exists(os.path.join(folder_path, new_dataset_name)):
      suffix += 1
      new_dataset_name = f"{dataset_name}_{suffix}"
    dataset_name = new_dataset_name

  # Adjust training split if augmenting to account for augmented samples
  # n = augment_count, s = training_split, x = adjusted training split
  # (1+n)x/(1-x) = s/(1-s)  =>  x = s/(1+n-sn)
  if augment_count > 0:
    training_split = training_split / (1 + augment_count - training_split * augment_count)

  if verbose:
    print(f'Creating dataset {dataset_name}...')

  # Get samples
  df = querySupabase(verbose=verbose)
  if verbose:
    print(f'Retrieved {len(df)} samples.')

  if equalize:
    df = equalizeClasses(df, verbose=verbose)
    if verbose:
      print(f'Equalized to {len(df)} samples.')

  df = df.sample(frac=1, random_state=42)  # shuffle
  train_size = int(len(df) * training_split)
  rest_size = int(len(df) * (1 - training_split) / 2)
  train_df = df.iloc[:train_size]
  val_df = df.iloc[train_size:train_size + rest_size]
  test_df = df.iloc[train_size + rest_size:]

  if augment_count > 0:
    train_df = augmentData(train_df, samples=augment_count, verbose=verbose)

  keras_directory = os.path.join(folder_path, dataset_name)
  exportKerasFolder(train_df, val_df, test_df, keras_directory,
                    verbose=verbose, dry_run=args.dry_run, force=force)

  if verbose:
    if args.dry_run:
      print(f'Dataset {dataset_name} would be created at {keras_directory}')
    else:
      print(f'Dataset {dataset_name} created at {keras_directory}')
