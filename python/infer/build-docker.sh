#!/bin/bash

DOCKER_BUILDKIT=1 docker build \
  --platform linux/amd64 \
  --secret id=kaggle,src=kaggle.json \
  --secret id=env,src=.env \
  -t cccalculator/infer-server .