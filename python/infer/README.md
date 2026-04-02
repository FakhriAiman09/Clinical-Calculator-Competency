# Inference Engine

Real-time ML inference engine for the Clinical Competency Calculator. Listens to Supabase Realtime events, runs BERT and SVM classification on new form submissions, and generates AI-written report summaries using Google Gemini.

## Contents

```
python/infer/
├── inference.py        # Core ML functions (bert_infer, svm_infer, generate_report_summary)
├── listener.py         # Async Supabase Realtime event listener (main entry point)
├── conftest.py         # Pytest configuration and mocks
└── test/               # Pytest unit tests
```

## Setup

```bash
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Use the dependency file that matches your environment when needed:

- Default/Windows: `requirements.txt`
- Ubuntu/Linux: `requirements.ubuntu.txt`
- macOS: `requirements.mac.txt`

Create a `.env` file:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<service-role-key>
GEMINI_API_KEY=<google-gemini-api-key>
```

BERT and SVM models are downloaded automatically from Supabase Storage on first run.

## Running

```bash
python listener.py
```

The listener runs indefinitely, processing events as they arrive.

## How It Works

### Form Response Pipeline (`form_responses` INSERT)

1. Supabase Realtime fires on new `form_responses` row
2. `listener.py` extracts open-text and MCQ data from the JSONB `response` column
3. `bert_infer()` classifies each free-text response → development level per Key Function
4. `svm_infer()` classifies each MCQ response set → development level per Key Function
5. Weighted average: **BERT 25% + SVM 75%**
6. Result is written to the `form_results` table

### Report Summary Pipeline (`student_reports` INSERT)

1. Supabase Realtime fires on new `student_reports` row
2. `generate_report_summary()` sends Key Function average scores to Google Gemini 2.5 Flash
3. Gemini returns a markdown-formatted narrative evaluating the student's performance per EPA
4. Summary is stored back on the `student_reports` row (retry logic: 3 attempts with rate-limit backoff)

## Logging

Three log files are written to the working directory:

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

A `Dockerfile` is included for containerized deployment. The inference container is part of the full-stack `docker compose` setup.

## Related

- [python/bert/README.md](../bert/README.md) — Training the BERT model
- [python/svm/README.md](../svm/README.md) — Training the SVM models
