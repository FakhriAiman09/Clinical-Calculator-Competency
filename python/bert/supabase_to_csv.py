'''
Converts a Supabase table to a pandas DataFrame
'''

import os

import argparse
import pandas as pd

from utils import querySupabase


def _resolve_dataset_name(dataset_name: str | None, folder_path: str, force: bool, verbose: bool) -> str:
  if dataset_name is None:
    yymmdd = pd.Timestamp.now().strftime('%y%m%d')
    dataset_name = f'{yymmdd}-full'

  csv_path = os.path.join(folder_path, dataset_name) + '.csv'
  if not os.path.exists(csv_path):
    return dataset_name

  if not force:
    suffix = 1
    new_name = f"{dataset_name}_{suffix}"
    while os.path.exists(os.path.join(folder_path, new_name) + '.csv'):
      suffix += 1
      new_name = f"{dataset_name}_{suffix}"
    return new_name

  if verbose:
    print(f'Removing existing file {csv_path}...')
  os.remove(csv_path)
  return dataset_name


def main(args: argparse.Namespace) -> None:
  '''
  Convert Supabase training data to a CSV.
  '''

  folder_path = os.path.join(os.getcwd(), 'data', 'raw')

  if not os.path.exists(folder_path) and not args.dry_run:
    os.makedirs(folder_path)

  force = args.force
  verbose = args.verbose

  dataset_name = _resolve_dataset_name(args.ds_name, folder_path, force, verbose)

  if verbose:
    print(f'Creating dataset {dataset_name}...')

  # Get samples
  df = querySupabase(verbose=verbose)
  if verbose:
    print(f'Retrieved {len(df)} samples.')

  df = df[['text', 'dev_level']]
  df.rename(columns={'text': 'text', 'dev_level': 'label'}, inplace=True)

  csv_path = os.path.join(folder_path, f'{dataset_name}.csv')

  if not args.dry_run:
    if verbose:
      print(f'Exporting {len(df)} samples to {csv_path}...')
    df.to_csv(csv_path, index=False)
  else:
    if verbose:
      print(f'Would export {len(df)} samples to {csv_path}')


if __name__ == '__main__':
  parser = argparse.ArgumentParser(description='''
      Convert Supabase training data to a CSV.
      The CSV will be saved in "./data/pickles/<dataset_name>.csv".
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
