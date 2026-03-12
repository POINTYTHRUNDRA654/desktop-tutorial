from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

app = Flask(__name__)

# Load model and tokenizer on startup
print("Loading Nemotron-3-Super model...")
try:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")
    
    tokenizer = AutoTokenizer.from_pretrained('nvidia/Nemotron-3-Super')
    model = AutoModelForCausalLM.from_pretrained(
        'nvidia/Nemotron-3-Super',
        device_map='auto' if torch.cuda.is_available() else None,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
    )
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    tokenizer = None

@app.route('/nemotron', methods=['POST'])
def nemotron_api():
    if model is None or tokenizer is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.json
        if not data or 'prompt' not in data:
            return jsonify({'error': 'Missing prompt in request'}), 400
        
        prompt = data['prompt']
        max_tokens = data.get('max_tokens', 100)
        
        # Tokenize input
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        
        # Generate response
        outputs = model.generate(
            **inputs,
            max_length=max_tokens,
            temperature=data.get('temperature', 0.7),
            top_p=data.get('top_p', 0.9),
            do_sample=True
        )
        
        # Decode output
        response_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        return jsonify({
            'prompt': prompt,
            'response': response_text,
            'tokens': max_tokens
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'device': 'cuda' if torch.cuda.is_available() else 'cpu'
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
