# SVM Training Module

Trains Support Vector Machine (SVM) classifiers for scoring multiple-choice question (MCQ) responses across each Key Function.

## Overview

One SVM model is trained per Key Function. Each model takes a vector of boolean MCQ responses and predicts a development level (0–3). SVM predictions contribute 75% of the final weighted inference score.

## Contents

```
python/svm/
├── fetch_data.py       # Retrieve labeled MCQ training data from Supabase
├── train.py            # Train and serialize one SVM model per Key Function
├── util.py             # Helper utilities
└── test/               # Pytest unit tests
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
# 1. Fetch training data from Supabase
python fetch_data.py

# 2. Train all SVM models
python train.py
```

Trained models are saved as pickle files (e.g., `mcq_kf1_0.pkl`) and can be uploaded to Supabase Storage.

## Model Naming Convention

Models are named `mcq_kf<key_function_id>` where dots in the key function ID are replaced with underscores (e.g., Key Function `1.2` → `mcq_kf1_2`).

## Testing

```bash
pytest
```

## Model Details

- **Algorithm:** scikit-learn `SVC`
- **Input:** Boolean vector of MCQ option selections per Key Function
- **Output:** Development level class (0–3)
- **Inference weight:** 75% of the final composite score

## Related

- [mcq-sample-collect/README.md](../../mcq-sample-collect/README.md) — Tool for collecting MCQ training samples
- [python/infer/README.md](../infer/README.md) — Uses trained models for real-time scoring
