# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

import sys
from pathlib import Path

# Get the root directory of your Sphinx project
docs_root = Path(__file__).resolve().parents[2]

# List of directories to exclude
exclude_dirs = {".venv"}

# Recursively find all directories containing Python files, excluding unwanted folders
for path in docs_root.rglob("*.py"):
    if not any(excluded in path.parts for excluded in exclude_dirs):
        sys.path.insert(0, str(path.parent.parent))

# Remove duplicates
sys.path = list(dict.fromkeys(sys.path))

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'CCC'
copyright = '2025, Dylan Colburn, Jacq Lee, Tyler Muessig, Tyler Price'
author = 'Dylan Colburn, Jacq Lee, Tyler Muessig, Tyler Price'
release = '0.41'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    'sphinx.ext.duration',
    'sphinx.ext.doctest',
    'sphinx.ext.autodoc',
    'sphinx.ext.autosummary',
]

templates_path = ['_templates']
exclude_patterns = []



# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

# html_theme = 'alabaster'
html_theme = 'furo'
html_static_path = ['_static']
html_css_files = ['custom.css']