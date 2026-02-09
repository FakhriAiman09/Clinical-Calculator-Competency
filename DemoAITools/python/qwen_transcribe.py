import sys
import torch
import librosa
from transformers import Qwen2AudioForConditionalGeneration, AutoProcessor

MODEL_ID = "Qwen/Qwen2-Audio-7B-Instruct"

# Load processor + model
processor = AutoProcessor.from_pretrained(MODEL_ID)
model = Qwen2AudioForConditionalGeneration.from_pretrained(
    MODEL_ID,
    device_map="auto",
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
)

#  Load local audio file (from Node.js) 
audio_path = sys.argv[1]

audio, sr = librosa.load(
    audio_path,
    sr=processor.feature_extractor.sampling_rate
)

# Build conversation with audio input
conversation = [
    {
        "role": "user",
        "content": [
            {"type": "audio"},
            {"type": "text", "text": "Please transcribe the audio clearly."}
        ]
    }
]

# Convert conversation to model input text
text = processor.apply_chat_template(
    conversation,
    add_generation_prompt=True,
    tokenize=False
)

# Prepare inputs
inputs = processor(
    text=text,
    audios=[audio],
    return_tensors="pt",
    padding=True
)

# Move tensors to correct device
inputs = {k: v.to(model.device) for k, v in inputs.items()}

#  Generate transcription
with torch.no_grad():
    generate_ids = model.generate(
        **inputs,
        max_length=256
    )

# Remove prompt tokens
generate_ids = generate_ids[:, inputs["input_ids"].size(1):]

# Decode output
response = processor.batch_decode(
    generate_ids,
    skip_special_tokens=True,
    clean_up_tokenization_spaces=False
)[0]

print(response)

#citation
#this was taken from hugging face Qwen2-Audio model card. For more details, see https://huggingface.co/Qwen/Qwen2-Audio-7B-Instruct
#   title={Qwen2-Audio Technical Report},
#   author={Chu, Yunfei and Xu, Jin and Yang, Qian and Wei, Haojie and Wei, Xipin and Guo,  Zhifang and Leng, Yichong and Lv, Yuanjun and He, Jinzheng and Lin, Junyang and Zhou, Chang and Zhou, Jingren},
#   journal={arXiv preprint arXiv:2407.10759},
#   year={2024}
# }
