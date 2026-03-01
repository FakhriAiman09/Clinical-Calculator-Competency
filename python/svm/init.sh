rm -rf .venv
python3.12 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt