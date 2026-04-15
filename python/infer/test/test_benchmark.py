"""Unit tests for benchmark.py helper functions.

These tests cover the pure-Python utility functions that do not require
model files, TensorFlow, or Supabase connectivity.
"""

import io
import statistics
import sys
import types
import unittest
from unittest.mock import MagicMock, patch


def _stub_heavy_imports():
    """Inject minimal stub modules so benchmark.py can be imported."""
    # tensorflow_text
    if 'tensorflow_text' not in sys.modules:
        sys.modules['tensorflow_text'] = types.ModuleType('tensorflow_text')

    # inference — only the symbols used by benchmark.py
    if 'inference' not in sys.modules:
        inference_stub = types.ModuleType('inference')
        inference_stub.bert_infer = MagicMock(return_value={})
        inference_stub.svm_infer = MagicMock(return_value={})
        inference_stub.load_bert_model = MagicMock(return_value=MagicMock())
        inference_stub.load_svm_models = MagicMock(return_value={})
        sys.modules['inference'] = inference_stub


_stub_heavy_imports()

import benchmark  # noqa: E402  (must come after stubs)


class TestPercentile(unittest.TestCase):
    """Tests for benchmark.percentile()."""

    def test_median_index(self):
        data = [10.0, 20.0, 30.0, 40.0, 50.0]
        self.assertEqual(benchmark.percentile(data, 50), 30.0)

    def test_p0_returns_first_element(self):
        data = [5.0, 10.0, 15.0]
        self.assertEqual(benchmark.percentile(data, 0), 5.0)

    def test_p100_returns_last_element(self):
        data = [5.0, 10.0, 15.0]
        self.assertEqual(benchmark.percentile(data, 100), 15.0)

    def test_p95_on_sorted_data(self):
        data = list(range(1, 101, 1))  # 1..100, already sorted
        data = [float(x) for x in data]
        result = benchmark.percentile(data, 95)
        # idx = int(100 * 95 / 100) = 95 → data[95] = 96.0
        self.assertEqual(result, 96.0)

    def test_single_element_list(self):
        self.assertEqual(benchmark.percentile([42.0], 50), 42.0)

    def test_clamps_to_last_element_for_very_high_percentile(self):
        data = [1.0, 2.0, 3.0]
        # idx = int(3 * 100 / 100) = 3 → clamped to index 2
        self.assertEqual(benchmark.percentile(data, 100), 3.0)


class TestPrintStats(unittest.TestCase):
    """Tests for benchmark.print_stats()."""

    def _captured_output(self, label, times_s):
        buf = io.StringIO()
        with patch('builtins.print', lambda *args, **kwargs: buf.write(' '.join(str(a) for a in args) + '\n')):
            benchmark.print_stats(label, times_s)
        return buf.getvalue()

    def test_output_contains_label(self):
        out = self._captured_output('My label', [0.1, 0.2, 0.3])
        self.assertIn('My label', out)

    def test_output_contains_mean(self):
        times = [0.1, 0.2, 0.3]
        out = self._captured_output('test', times)
        expected_mean_ms = statistics.mean([t * 1000 for t in times])
        # Check the rounded mean appears somewhere in the output
        self.assertIn(f'{expected_mean_ms:.1f}', out)

    def test_output_contains_median(self):
        times = [0.1, 0.2, 0.3]
        out = self._captured_output('test', times)
        expected_median_ms = statistics.median([t * 1000 for t in times])
        self.assertIn(f'{expected_median_ms:.1f}', out)

    def test_output_contains_min_and_max(self):
        times = [0.05, 0.15, 0.25]
        out = self._captured_output('test', times)
        self.assertIn('min=', out)
        self.assertIn('max=', out)

    def test_output_contains_p95(self):
        out = self._captured_output('test', [0.1, 0.2, 0.3])
        self.assertIn('p95=', out)

    def test_converts_seconds_to_milliseconds(self):
        # A single entry of exactly 1 second should produce 1000.0ms
        out = self._captured_output('test', [1.0])
        self.assertIn('1000.0', out)

    def test_single_value_list(self):
        # Should not raise
        out = self._captured_output('single', [0.5])
        self.assertIn('single', out)


if __name__ == '__main__':
    unittest.main()
