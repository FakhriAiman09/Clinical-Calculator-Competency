'''
Utility functions for SVM model training and exporting.
'''

import os
import pickle

from sklearn.svm import SVC
from supabase import Client


def percent_bar(percent: float, width: int) -> str:
  '''
  Generates a progress bar string for a given percentage.

  :param percent: The percentage to represent (0.0 to 1.0).
  :type percent: float
  :param width: The width of the progress bar.
  :type width: int
  :return: A string representing the progress bar.
  :rtype: str
  '''
  filled_length = int(percent * width)
  bar_filled = '⣿' * filled_length
  bar_empty = '⣀' * (width - filled_length)
  # Color selection based on percentage
  if percent < 0.3:
    color_code = '\033[31m'  # Red
  elif percent < 0.6:
    color_code = '\033[33m'  # Yellow
  else:
    color_code = '\033[32m'  # Green
  # Reset color after the bar
  reset_code = '\033[0m'
  # Compose the bar
  set_bold = '\033[1m'  # Bold text
  bar = f"{color_code}{bar_filled}{reset_code}{bar_empty}"
  return f"{bar} {color_code}{set_bold}{percent * 100:6.2f}%{reset_code}"


def log(verbose: bool, string: str, end='\n') -> None:
  """
  Logs a message if verbose mode is enabled.

  :param verbose: If True, the message will be printed to the console.
  :type verbose: bool
  :param string: The message to log.
  :type string: str
  :param end: The string appended after the message (default is '').
  :type end: str
  """
  if verbose:
    print(string, end=end)


def export_upload_model(
    model: SVC, kf: str,
    foldername='models',
    bucketname='svm-models',
    supabase: Client = None
) -> None:
  """
  Exports the trained SVM model to a file and uploads it to a specified bucket.

  :param model: The trained SVM model to export.
  :type model: SVC
  :param kf: The keyframe name (used for naming the model file).
  :type kf: str
  :param foldername: The local folder to save the model file (default is 'models').
  :type foldername: str
  :param bucketname: The name of the bucket to upload the model file (default is 'svm-models').
  :type bucketname: str
  """

  # Ensure the folder exists
  os.makedirs(foldername, exist_ok=True)

  if model is None:
    raise ValueError("The model is None. Cannot export a None model.")

  if supabase is None:
    raise ValueError("Supabase client is not initialized. Cannot upload the model.")

  print(f"Exporting model for {kf} to {foldername}...", end=" ")

  # Save the model to a file
  model_path = os.path.join(foldername, f"{kf}.pkl")
  with open(model_path, 'wb') as f:
    pickle.dump(model, f)

  # Upload to Supabase bucket
  print(f"Uploading model to bucket '{bucketname}'...")

  with open(model_path, 'rb') as f:
    supabase.storage.from_(bucketname).update(f"{kf}.pkl", f)
