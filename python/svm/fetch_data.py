"""
fetch_data.py

This script fetches data from a Supabase database and exports it to CSV files.
It uses the Supabase client to connect to the database and retrieve data from specified tables.
The script requires the following environment variables to be set:
- SUPABASE_URL: The URL of the Supabase database.
- SUPABASE_SERVICE_ROLE_KEY: The service role key for accessing the Supabase database.

Dependencies:
- dotenv
- os
- pandas
- re
- supabase
"""

import os
import re

import pandas as pd
from dotenv import load_dotenv
from supabase import Client, create_client


def fetch_data() -> None:
  """
  Main function to fetch data from Supabase and export it to CSV files.

  :raises ValueError: If the required environment variables are not set.
  """

  folder = 'data'
  # Create the folder if it doesn't exist
  os.makedirs(folder, exist_ok=True)

  # Load environment variables from .env file
  load_dotenv()

  url: str = os.environ.get("SUPABASE_URL", "")
  key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

  if url == "" or key == "":
    raise ValueError("Supabase URL or key not found in environment variables.")

  supabase: Client = create_client(url, key)

  response = supabase.schema("public")              \
                     .table("epa_kf_descriptions")  \
                     .select("kf_descriptions")     \
                     .single().execute()

  if response.error:
    raise ValueError(f"Error fetching kf_descriptions: {response.error.message}")
  if not response.data or "kf_descriptions" not in response.data:
    raise ValueError("kf_descriptions not found in the response data.")

  kf_descriptions = response.data["kf_descriptions"]
  table_names = ['mcq_kf' + re.sub(r'\.', '_', kf) for kf in [*kf_descriptions.keys()]]

  for table in table_names:
    data = query_supabase(supabase, table)
    print(f"Fetched {len(data)} rows from table {table}")
    df = pd.DataFrame(data)
    df.to_csv(f"{folder}/{table}.csv", index=False)


def query_supabase(supabase: Client, table: str) -> list:
  """
  Fetches all data from a specified table in the Supabase database.

  :param supabase: The Supabase client object.
  :type supabase: Client

  :param table:
    The name of the table to fetch data from. This table should be in the \"trainingdata\"
    schema.
  :type table: str

  :returns: A list of dictionaries containing the data from the specified table.
  :rtype: list
  """
  response = supabase.schema("trainingdata").table(table).select("*").execute()
  return response.data
