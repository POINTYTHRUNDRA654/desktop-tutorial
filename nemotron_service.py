#!/usr/bin/env python3
"""
Standalone Nemotron Service
Bundles with Mossy installer - no Docker required
Auto-starts and manages model lifecycle
"""

import os
import sys
import json
import logging
import argparse
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import time
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(Path.home() / '.mossy' / 'nemotron-service.log')
    ]
)
logger = logging.getLogger(__name__)

try:
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("Transformers not available - using mock mode")


class NemotronRequestHandler(BaseHTTPRequestHandler):
    """HTTP request handler for Nemotron API"""
    
    # Shared model instance
    model = None
    tokenizer = None
    device = None
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            response = {
                'status': 'ok',
                'model_loaded': self.model is not None,
                'device': str(self.device) if self.device else 'cpu',
                'transformers_available': TRANSFORMERS_AVAILABLE,
                'version': '1.0',
            }
            self.wfile.write(json.dumps(response).encode())
            logger.info("Health check successful")
        else:
            self.send_error(404)
    
    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/nemotron':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                request_data = json.loads(body.decode())
                
                prompt = request_data.get('prompt', '')
                max_tokens = request_data.get('max_tokens', 100)
                temperature = request_data.get('temperature', 0.7)
                
                if not prompt:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Missing prompt'}).encode())
                    return
                
                if not TRANSFORMERS_AVAILABLE or self.model is None:
                    # Mock response in demo mode
                    response = {
                        'prompt': prompt,
                        'response': f"[Demo Mode] Response to: {prompt[:50]}...",
                        'tokens': max_tokens,
                        'demo': True,
                    }
                else:
                    # Real generation
                    import time
                    start = time.time()
                    
                    inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
                    outputs = self.model.generate(
                        **inputs,
                        max_length=max_tokens,
                        temperature=temperature,
                        top_p=0.9,
                        do_sample=True
                    )
                    generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
                    latency = int((time.time() - start) * 1000)
                    
                    response = {
                        'prompt': prompt,
                        'response': generated_text,
                        'tokens': max_tokens,
                        'latency': latency,
                    }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
                logger.info(f"Generated response for prompt: {prompt[:50]}...")
                
            except Exception as e:
                logger.error(f"Generation error: {e}\n{traceback.format_exc()}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_error(404)
    
    def log_message(self, format, *args):
        """Suppress default HTTP logging"""
        pass


class NemotronService:
    """Standalone Nemotron service manager"""
    
    def __init__(self, port=5000, model_name='nvidia/Nemotron-3-Super'):
        self.port = port
        self.model_name = model_name
        self.server = None
        self.server_thread = None
        self.device = None
        
        # Setup paths
        self.app_data = Path.home() / '.mossy'
        self.app_data.mkdir(exist_ok=True)
        self.model_cache = self.app_data / 'models'
        self.model_cache.mkdir(exist_ok=True)
        
        # Set cache directory
        os.environ['TRANSFORMERS_CACHE'] = str(self.model_cache)
    
    def load_model(self):
        """Load the Nemotron model"""
        if not TRANSFORMERS_AVAILABLE:
            logger.warning("Transformers not available - skipping model load")
            return False
        
        try:
            logger.info(f"Loading model: {self.model_name}")
            
            # Detect device
            if torch.cuda.is_available():
                self.device = torch.device('cuda')
                logger.info(f"Using GPU: {torch.cuda.get_device_name(0)}")
            else:
                self.device = torch.device('cpu')
                logger.info("Using CPU (inference will be slow)")
            
            # Load tokenizer
            logger.info("Loading tokenizer...")
            NemotronRequestHandler.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=str(self.model_cache)
            )
            
            # Load model
            logger.info("Loading model weights...")
            NemotronRequestHandler.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                cache_dir=str(self.model_cache),
                device_map='auto' if str(self.device) == 'cuda' else None,
                torch_dtype=torch.float16 if str(self.device) == 'cuda' else torch.float32,
                low_cpu_mem_usage=True,
            )
            
            NemotronRequestHandler.device = self.device
            logger.info("Model loaded successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}\n{traceback.format_exc()}")
            logger.info("Service will run in demo mode without model")
            return False
    
    def start(self):
        """Start the HTTP server"""
        try:
            logger.info(f"Starting Nemotron service on port {self.port}")
            self.server = HTTPServer(('localhost', self.port), NemotronRequestHandler)
            
            # Run server in background thread
            self.server_thread = threading.Thread(target=self.server.serve_forever, daemon=True)
            self.server_thread.start()
            
            logger.info("Nemotron service started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start service: {e}\n{traceback.format_exc()}")
            return False
    
    def stop(self):
        """Stop the HTTP server"""
        if self.server:
            logger.info("Stopping Nemotron service")
            self.server.shutdown()
            self.server.server_close()
    
    def run(self, load_model=True):
        """Run the service (blocking)"""
        try:
            if load_model:
                self.load_model()
            
            if not self.start():
                logger.error("Failed to start service - exiting")
                return False
            
            logger.info("Service is running. Press Ctrl+C to stop.")
            
            # Keep running
            while True:
                time.sleep(1)
            
            return True
            
        except KeyboardInterrupt:
            logger.info("Service interrupted by user")
            self.stop()
            return True
        except Exception as e:
            logger.error(f"Fatal error: {e}\n{traceback.format_exc()}")
            self.stop()
            return False


def main():
    parser = argparse.ArgumentParser(description='Standalone Nemotron Service')
    parser.add_argument('--port', type=int, default=5000, help='Port to listen on')
    parser.add_argument('--model', default='nvidia/Nemotron-3-Super', help='Model to load')
    parser.add_argument('--demo', action='store_true', help='Run in demo mode (no model)')
    parser.add_argument('--log', default=None, help='Log file path')
    args = parser.parse_args()
    
    service = NemotronService(port=args.port, model_name=args.model)
    
    success = service.run(load_model=not args.demo)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
