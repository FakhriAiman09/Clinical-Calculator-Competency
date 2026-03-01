rm -rf .venv
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.mac.txt
kaggle kernels output cccalc/bert-training -p bert-model