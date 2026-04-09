"""Standalone performance benchmark for BERT and SVM inference.

Usage:
    python benchmark.py [--n 20] [--bert-path models/bert] [--svm-path svm-models]

Requires only the downloaded model files — no Supabase or internet connection needed.
Model files can be downloaded once using the download functions in inference.py.
"""

import argparse
import statistics
import time

import tensorflow_text as text  # noqa: F401  required to register TF ops

from inference import bert_infer, load_bert_model, load_svm_models, svm_infer

# ── Synthetic test data ────────────────────────────────────────────────────────

SYNTHETIC_TEXTS = [
  'Student took a focused history and identified key symptoms efficiently.',
  'Physical exam was well-organized and findings were clearly communicated.',
  'Student demonstrated appropriate clinical reasoning when ordering investigations.',
  'The management plan was evidence-based and patient-centered.',
  'Student showed good communication skills with both patient and team.',
  'Documentation was thorough and completed in a timely manner.',
  'Student recognized deterioration early and escalated appropriately.',
  'Handover was structured and included all critical information.',
  'Student sought senior review when uncertain — good self-awareness.',
  'Prescription was accurate and dose was appropriate for patient weight.',
]

# One text per key function (realistic single-submission scenario)
BERT_INPUT_SINGLE = {f'kf{epa}_{kf}': [SYNTHETIC_TEXTS[i % len(SYNTHETIC_TEXTS)]]
                     for i, (epa, kf) in enumerate(
                       [(epa, kf) for epa in range(1, 6) for kf in range(1, 4)]
                     )}

# Multiple texts per key function (richer submission)
BERT_INPUT_MULTI = {k: SYNTHETIC_TEXTS[:3] for k in BERT_INPUT_SINGLE}

# Boolean feature vectors for SVM (one per key function)
SVM_INPUT = {f'kf{epa}.{kf}': [True, False, True, False, True]
             for epa in range(1, 6) for kf in range(1, 4)}


# ── Helpers ────────────────────────────────────────────────────────────────────

def percentile(sorted_data: list[float], p: float) -> float:
  idx = int(len(sorted_data) * p / 100)
  return sorted_data[min(idx, len(sorted_data) - 1)]


def print_stats(label: str, times_s: list[float]) -> None:
  times_ms = [t * 1000 for t in times_s]
  times_ms.sort()
  print(f'  {label:<35} '
        f'mean={statistics.mean(times_ms):7.1f}ms  '
        f'median={statistics.median(times_ms):7.1f}ms  '
        f'p95={percentile(times_ms, 95):7.1f}ms  '
        f'min={min(times_ms):7.1f}ms  '
        f'max={max(times_ms):7.1f}ms')


# ── Main ────────────────────────────────────────────────────────────────────────

def run(n: int, bert_path: str, svm_path: str) -> None:
  print(f'Loading models (bert={bert_path}, svm={svm_path})...')
  t_load = time.time()
  bert = load_bert_model(bert_path)
  svms = load_svm_models(svm_path)
  print(f'Models loaded in {time.time()-t_load:.2f}s\n')

  bert_single_times: list[float] = []
  bert_multi_times: list[float] = []
  svm_times: list[float] = []
  pipeline_times: list[float] = []

  print(f'Running {n} iterations...')
  for i in range(n):
    # BERT — single text per KF
    t = time.time(); bert_infer(bert, BERT_INPUT_SINGLE); bert_single_times.append(time.time() - t)

    # BERT — multiple texts per KF
    t = time.time(); bert_infer(bert, BERT_INPUT_MULTI); bert_multi_times.append(time.time() - t)

    # SVM only
    t = time.time(); svm_infer(svms, SVM_INPUT); svm_times.append(time.time() - t)

    # Combined pipeline (BERT single + SVM)
    t = time.time()
    bert_infer(bert, BERT_INPUT_SINGLE)
    svm_infer(svms, SVM_INPUT)
    pipeline_times.append(time.time() - t)

    print(f'  iteration {i+1}/{n} done', end='\r')

  print(f'\n\n{"="*75}')
  print(f'  BENCHMARK RESULTS  (N={n}, KFs={len(BERT_INPUT_SINGLE)})')
  print(f'{"="*75}')
  print_stats('BERT inference (1 text/KF)', bert_single_times)
  print_stats('BERT inference (3 texts/KF)', bert_multi_times)
  print_stats('SVM inference', svm_times)
  print_stats('Full pipeline (BERT + SVM)', pipeline_times)
  print(f'{"="*75}')
  print(f'  Model load time: {time.time()-t_load:.2f}s (one-time startup cost)')
  print(f'{"="*75}\n')


if __name__ == '__main__':
  parser = argparse.ArgumentParser(description='Benchmark BERT and SVM inference')
  parser.add_argument('--n', type=int, default=20, help='Number of iterations (default: 20)')
  parser.add_argument('--bert-path', default='models/bert', help='Path to BERT model directory')
  parser.add_argument('--svm-path', default='svm-models', help='Path to SVM models directory')
  args = parser.parse_args()
  run(args.n, args.bert_path, args.svm_path)
