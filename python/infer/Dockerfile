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

RUN python -m pip install --upgrade pip

COPY requirements.txt .
RUN python -m pip install -r requirements.txt

COPY --chown=appuser:appuser . .

RUN chown -R appuser:appuser /home/appuser && chmod -R 755 /home/appuser
RUN chown -R appuser:appuser /app && chmod -R 755 /app

# Install openssh-client for Railway SSH file transfers
USER root
RUN apt-get update && apt-get install -y openssh-client && rm -rf /var/lib/apt/lists/*

USER appuser

CMD ["python3.11", "listener.py"]