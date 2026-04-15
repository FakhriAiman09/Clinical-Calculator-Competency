# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.11.11
FROM python:${PYTHON_VERSION}-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/home/appuser" \
    --shell "/sbin/nologin" \
    --uid "${UID}" \
    appuser

ENV HOME=/home/appuser
ENV DEBERTA_MODEL_PATH=/home/appuser/models/deberta
ENV SVM_MODELS_PATH=/home/appuser/svm-models
ENV INFER_LOGS_PATH=/home/appuser/logs

RUN python -m pip install --upgrade pip

COPY --chmod=444 requirements.ubuntu.txt .
RUN python -m pip install -r requirements.ubuntu.txt

COPY --chown=root:root --chmod=444 inference.py listener.py list_models.py ./

RUN mkdir -p /home/appuser/models /home/appuser/svm-models /home/appuser/logs \
    && chown -R appuser:appuser /home/appuser \
    && chmod -R 755 /home/appuser

# Install openssh-client for Railway SSH file transfers
USER root
RUN apt-get update && apt-get install -y openssh-client && rm -rf /var/lib/apt/lists/*

USER appuser

CMD ["python3.11", "listener.py"]