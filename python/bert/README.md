# BERT Training Module

Trains the BERT-based text classification model used to evaluate open-ended responses in clinical feedback forms.

## Overview

The BERT model classifies free-text rater responses into development levels (0–3) for each Key Function. It is trained on labeled data exported from Supabase and contributes 25% of the final weighted inference score.

## Contents

```
python/bert/
├── supabase_to_csv.py      # Export labeled assessment data from Supabase to CSV
├── supabase_to_df.py       # Load Supabase data into pandas DataFrames
├── supabase_to_keras.py    # Prepare data and train BERT model with TensorFlow/Keras
├── utils.py                # Shared helper utilities
└── test/                   # Pytest unit tests
```

## Setup

```bash
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<service-role-key>
```

## Training

```bash
# 1. Export training data
python supabase_to_csv.py

# 2. Train the model
python supabase_to_keras.py
```

The trained model is saved locally and can be uploaded to Supabase Storage for use by the inference engine.

## Testing

```bash
pytest
```

## Model Details

- **Base model:** BERT (via TensorFlow Hub)
- **Output:** Development level class (0 = remedial, 1 = early developing, 2 = developing, 3 = entrustable)
- **Input:** Free-text open-ended rater responses, keyed by Key Function ID
- **Inference weight:** 25% of the final composite score

## Related

- [python/infer/README.md](../infer/README.md) — Uses the trained model for real-time scoring
