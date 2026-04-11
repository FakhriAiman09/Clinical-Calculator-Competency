# Inference Engine

Real-time ML inference engine for the Clinical Competency Calculator. Listens to Supabase Realtime events, runs DeBERTa-v3-small and SVM classification on new form submissions, and generates AI-written report summaries using Google Gemini.

## Contents

```
python/infer/
├── inference.py        # Core ML functions (deberta_infer, svm_infer, generate_report_summary)
├── listener.py         # Async Supabase Realtime event listener (main entry point)
├── conftest.py         # Pytest configuration and mocks
└── test/               # Pytest unit tests
```

## Setup

```bash
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.ubuntu.txt
```

Create a `.env` file:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
GOOGLE_GENAI_API_KEY=<google-gemini-api-key>
KAGGLE_API_TOKEN=<kaggle-api-token>
LOGTAIL_SOURCE_TOKEN=<better-stack-source-token>   # optional — enables Live Tail
```

`listener.py` also accepts the legacy aliases `SUPABASE_KEY` and `GEMINI_API_KEY`.

The DeBERTa model is downloaded automatically from Kaggle (`cccalc/deberta-v3-small-refined`) on first run when not already present locally. Set `DEBERTA_MODEL_PATH` to override the default location (`models/deberta`).

## Running

```bash
python listener.py
```

The listener runs indefinitely, processing events as they arrive.

## How It Works

### Form Response Pipeline (`form_responses` INSERT)

1. Supabase Realtime fires on new `form_responses` row
2. `listener.py` extracts open-text and MCQ data from the JSONB `response` column
3. `deberta_infer()` classifies each free-text response → development level per Key Function
4. `svm_infer()` classifies each MCQ response set → development level per Key Function
5. Weighted average: **DeBERTa 25% + SVM 75%**
6. Result is written to the `form_results` table

### Report Summary Pipeline (`student_reports` INSERT)

1. Supabase Realtime fires on new `student_reports` row
2. `generate_report_summary()` sends Key Function average scores to Google Gemini 2.5 Flash
3. Gemini is called with `response_mime_type='application/json'` — output is constrained to valid JSON at the token level, eliminating formatting retries
4. A regex fallback extracts the outermost `{…}` block in case of any residual wrapping
5. Summary is stored back on the `student_reports` row (retry logic: 3 attempts with rate-limit backoff)
6. On failure, a structured `{"_error": "…"}` JSON object is stored so the frontend can display a clean per-EPA warning without leaking raw error text across all EPA boxes

## Logging

Three log files are written to `python/infer/logs` by default. Override with `INFER_LOGS_PATH`.

| File | Contents |
|------|----------|
| `app.log` | General application events |
| `inference.log` | Per-submission inference details and scores |
| `error.log` | Errors and exceptions |

## Testing

```bash
pytest
```

Mocks for Supabase and model paths are configured in `conftest.py`.

## Docker

```bash
docker compose up --build
```

A `Dockerfile` is included for containerized deployment. The inference container is part of the full-stack `docker compose` setup.

## Railway Deployment

Set the following environment variables in your Railway service:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `GOOGLE_GENAI_API_KEY` | Google Gemini API key |
| `KAGGLE_API_TOKEN` | Kaggle API token (used to download the DeBERTa model on first boot) |
| `LOGTAIL_SOURCE_TOKEN` | Better Stack source token (optional) |
| `DEBERTA_MODEL_PATH` | Override model path (optional, default: `models/deberta`) |

On first boot Railway will download the DeBERTa model from Kaggle (~550 MB) and cache it locally. Subsequent restarts skip the download if the model files are already present.

## Related

- [python/bert/README.md](../bert/README.md) — Original BERT model training
- [python/svm/README.md](../svm/README.md) — SVM model training
