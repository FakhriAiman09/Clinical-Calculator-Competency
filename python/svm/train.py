"""
train.py

This script trains a Support Vector Machine (SVM) model on the data in the data directory.
It reads the data from CSV files, preprocesses it, and trains the model.
The trained model is then saved to a file in the models directory.
The script also evaluates the model on a test set and prints the accuracy.
"""

import argparse
import glob
import os

from dotenv import load_dotenv
from imblearn.over_sampling import RandomOverSampler
from sklearn import svm
from sklearn.model_selection import train_test_split
import pandas as pd
from supabase import Client, create_client

from fetch_data import fetch_data
from util import export_upload_model, log, percent_bar


def main(args) -> None:
  """
  Main function to train the SVM model.
  """

  print("Loading environment variables...")

  load_dotenv()

  url: str = os.environ.get("SUPABASE_URL", "")
  key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

  if url == "" or key == "":
    raise ValueError("Supabase URL or key not found in environment variables.")

  print("Environment variables loaded.")

  supabase: Client = create_client(url, key)

  if not args.no_fetch:
    fetch_data()

  data = {}

  for file in glob.glob('data/*.csv'):
    table_name = file.split('/')[-1].removesuffix('.csv')
    df = pd.read_csv(file)  # Read the CSV file into a DataFrame
    # drop metadata columns
    df = df.loc[:, ~df.columns.isin(['id', 'created_at', 'user_id'])]

    data.update({table_name: df})

  if not data:
    print("No data found in the 'data' directory. Exiting.")
    return

  # if the directory doesn't exist, create it
  if not os.path.exists('models'):
    os.makedirs('models')

  accuracies = {}

  for kf, df in data.items():
    if df.empty:
      print(f"Skipping {kf} because it has no data.")
      continue

    accuracy, model = train_svm(kf, df,
                                train_proportion=args.train_proportion,
                                length_threshold=args.length_threshold,
                                oversample=args.oversample,
                                verbose=args.verbose)
    if model is not None:
      accuracies[kf] = accuracy
      # Save the trained model to a file
      export_upload_model(
          model=model,
          kf=kf,
          foldername='models',
          bucketname='svm-models',
          supabase=supabase
      )

  if accuracies:
    print("Average accuracy across all models: "
          f"{percent_bar(sum(accuracies.values()) / len(accuracies), 45)}")


def train_svm(
    kf: str,
    df: pd.DataFrame,
    train_proportion=0.8,
    length_threshold=20,
    oversample: bool = False,
    verbose: bool = False
) -> tuple[float, svm.SVC]:
  '''
  Trains an SVM model on the given DataFrame and evaluates its accuracy.

  :param kf: The keyframe name (used for logging and saving the model).
  :type kf: str
  :param df: The DataFrame containing the training data.
  :type df: pd.DataFrame
  :param train_proportion: The proportion of the data to use for training (default is 0.8).
  :type train_proportion: float
  :param length_threshold: The minimum number of rows required to train the model (default is 20).
  :type length_threshold: int
  :param oversample: If True, oversamples the minority classes using SMOTE.
  :type oversample: bool
  :param verbose: If True, enables verbose logging for debugging.
  :type verbose: bool

  :return: A tuple containing the accuracy of the model and the trained model itself.
  :rtype: tuple[float, svm.SVC]
  '''
  print(f"Training on {kf:10} with {len(df):3} rows", end=" --> ")

  df = df.dropna()  # Drop rows with any NaN values

  x = df.iloc[:, :-1].to_numpy()
  y = df.iloc[:, -1].to_numpy()

  if oversample:
    log(verbose, f"Oversampling minority classes in {kf}...", end=" ")
    class_counts = df.iloc[:, -1].value_counts().to_dict()
    sampling_strategy = {cls: max(count, 4)  # Ensure at least 2 samples per class
                         for cls, count in class_counts.items()}
    ros = RandomOverSampler(sampling_strategy=sampling_strategy, random_state=42)
    x, y = ros.fit_resample(x, y)
    log(verbose, f"Done oversampling: {len(y)} samples after oversampling.")
    log(verbose, f"{'->':>40}", end=" ")

  if len(x) < length_threshold:
    print(f"Skipping {kf} because it has less than {length_threshold} rows")
    return None, None

  try:
    x_train, x_test, y_train, y_test = train_test_split(
        x, y,
        train_size=train_proportion,  # Can be 0.8 for 80% train, 20% test
        stratify=y,                   # Key parameter for equal distribution
        random_state=42               # For reproducibility
    )
  except ValueError as e:
    print(f"Error splitting data for {kf}: {e}")
    return None, None

  # Create and train the SVM model
  model = svm.SVC(kernel='linear', C=1.0)
  model.fit(x_train, y_train)

  # Evaluate the model
  accuracy = model.score(x_test, y_test)

  print(f"Accuracy: {percent_bar(accuracy, 30)}")

  return accuracy, model


if __name__ == "__main__":
  parser = argparse.ArgumentParser(
      description="Train an SVM model on the data in the data directory.")

  parser.add_argument('-v', '--verbose', action='store_true',
                      help="Enable verbose output for debugging.")

  parser.add_argument('--length-threshold', type=int, default=20,
                      help="Minimum number of rows required to train the model (default: 20).")
  parser.add_argument('--no-fetch', action='store_true',
                      help="Skip fetching data from Supabase and use existing data.")
  parser.add_argument('--oversample', action='store_true',
                      help="Enable oversampling of the minority classes.")
  parser.add_argument('--train-proportion', type=float, default=0.8,
                      help="Proportion of data to use for training (default: 0.8). "
                           "Must be between 0.0 and 1.0.")

  main(parser.parse_args())
