"""Pytest configuration for the inference package.

This module patches Docker-specific filesystem and logging behavior so the
listener module can be imported safely during local test runs.
"""

import logging
import os
from unittest.mock import MagicMock, patch

# listener.py runs these at module level on import:
#   os.makedirs('/app/logs')          — fails without /app directory
#   logging.FileHandler('/app/logs/app.log') — fails without /app/logs directory
# We patch both before collection via pytest_configure.

def pytest_configure(config):
    """Apply test-safe patches before pytest collects inference modules."""
    # Patch os.makedirs to skip /app paths
    original_makedirs = os.makedirs
    def safe_makedirs(path, *args, **kwargs):
        """Ignore Docker-only ``/app`` directories while preserving local calls."""
        if str(path).startswith('/app'):
            return
        original_makedirs(path, *args, **kwargs)
    patch('os.makedirs', side_effect=safe_makedirs).start()

    # Patch logging.FileHandler to return a mock for /app/logs paths.
    # The mock must have `level` set as an integer so logging's callHandlers
    # can compare record.levelno >= hdlr.level without AttributeError.
    original_file_handler = logging.FileHandler
    def safe_file_handler(filename, *args, **kwargs):
        """Return a mock file handler for container-only log file paths."""
        if str(filename).startswith('/app'):
            mock_handler = MagicMock()
            mock_handler.level = 0  # logging.NOTSET — accept all records
            return mock_handler
        return original_file_handler(filename, *args, **kwargs)
    patch('logging.FileHandler', side_effect=safe_file_handler).start()
