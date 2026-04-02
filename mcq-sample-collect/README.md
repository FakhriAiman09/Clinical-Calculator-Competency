# MCQ Sample Collector

A Next.js utility application for collecting multiple-choice question (MCQ) sample responses used to build training datasets for the SVM classification models.

## Purpose

The SVM models need labeled examples of MCQ responses per Key Function. This tool provides a lightweight UI for collecting and exporting those samples.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Select a Key Function from the list
2. Submit MCQ response combinations
3. Export collected samples as CSV for use in `python/svm/train.py`

## Related

- [python/svm/README.md](../python/svm/README.md) — SVM training pipeline that consumes this data
