'''
Converts a Supabase table to a pandas DataFrame
'''

import os

import argparse
import pandas as pd

from utils import exportDfPickle, querySupabase


def main(args: argparse.Namespace) -> None:
  '''
  Convert Supabase training data to pickled DataFrame.
  '''

  folder_path = os.path.join(os.getcwd(), 'data', 'pickles')

  if not os.path.exists(folder_path) and not args.dry_run:
    os.makedirs(folder_path)

  # Get arguments
  force = args.force
  verbose = args.verbose

  dataset_name = args.ds_name
  if dataset_name is None:
    yymmdd = pd.Timestamp.now().strftime('%y%m%d')
    dataset_name = f'{yymmdd}-full'

  # Handle if dataset already exists
  if os.path.exists(os.path.join(folder_path, dataset_name)) and not force:
    suffix = 1
    new_dataset_name = f"{dataset_name}_{suffix}"
    while os.path.exists(os.path.join(folder_path, new_dataset_name)):
      suffix += 1
      new_dataset_name = f"{dataset_name}_{suffix}"
    dataset_name = new_dataset_name

  if verbose:
    print(f'Creating dataset {dataset_name}...')

  # Get samples
  df = querySupabase(verbose=verbose)
  if verbose:
    print(f'Retrieved {len(df)} samples.')

  pickle_path = os.path.join(folder_path, f'{dataset_name}.pkl')
  exportDfPickle(df, pickle_path, verbose=verbose, dry_run=args.dry_run, force=force)


if __name__ == '__main__':
  parser = argparse.ArgumentParser(description='''
      Convert Supabase training data to pickled DataFrame.
      The DataFrame will be saved in "./data/pickles/<dataset_name>.pkl".
      ''')

  parser.add_argument('-f', '--force', action='store_true',
                      help='force overwrite if destination folder exists')
  parser.add_argument('-v', '--verbose', action='store_true',
                      help='verbose output')

  parser.add_argument('--ds_name', type=str, default=None,
                      help='custom dataset name; default is <yymmdd>-<split>[-aug][-eq]')
  parser.add_argument('--dry-run', action='store_true',
                      help='run through the program without writing any files')

  main(parser.parse_args())
