"""
Gradio web interface integration for AI model interaction.
Provides an easy-to-use browser-based UI for text-to-3D and image-to-3D generation.

This is an OPTIONAL feature that requires Gradio to be installed.
Installation: pip install gradio
"""

import bpy
import os
import sys
import threading
import tempfile
from pathlib import Path

# Check if Gradio is available
GRADIO_AVAILABLE = False
GRADIO_ERROR = None
GRADIO_SERVER = None
GRADIO_THREAD = None

try:
    import gradio as gr
    GRADIO_AVAILABLE = True
except ImportError:
    GRADIO_ERROR = "Gradio not installed"


def check_gradio_availability():
    """
    Check if Gradio is installed and available.
    
    Returns:
        tuple: (available: bool, message: str)
    """
    if not GRADIO_AVAILABLE:
        return False, "Gradio not installed. Install with: pip install gradio"
    
    return True, f"Gradio {gr.__version__} is available"


def create_gradio_interface():
    """
    Create a Gradio interface for AI model interaction.
    
    Returns:
        gradio.Interface or None
    """
    if not GRADIO_AVAILABLE:
        return None
    
    # Import AI helpers
    from . import hunyuan3d_helpers
    
    # Check if AI is available
    ai_available = hunyuan3d_helpers.Hunyuan3DHelpers.is_available()
    
    def generate_from_text(prompt, resolution):
        """Generate 3D model from text (Gradio callback)"""
        if not ai_available:
            return None, "Hunyuan3D-2 not available. See installation guide."
        
        success, result = hunyuan3d_helpers.generate_mesh_from_text(
            prompt=prompt,
            resolution=int(resolution)
        )
        
        if success:
            return result, "Generation successful! Import the model in Blender."
        else:
            return None, f"Error: {result}"
    
    def generate_from_image(image, resolution):
        """Generate 3D model from image (Gradio callback)"""
        if not ai_available:
            return None, "Hunyuan3D-2 not available. See installation guide."
        
        if image is None:
            return None, "Please upload an image"
        
        # Save temporary image
        temp_path = os.path.join(tempfile.gettempdir(), "gradio_input.png")
        image.save(temp_path)
        
        success, result = hunyuan3d_helpers.generate_mesh_from_image(
            image_path=temp_path,
            resolution=int(resolution)
        )
        
        if success:
            return result, "Generation successful! Import the model in Blender."
        else:
            return None, f"Error: {result}"
    
    # Create Gradio interface with tabs
    with gr.Blocks(title="Blender FO4 AI Generation") as interface:
        gr.Markdown("# Blender Fallout 4 Add-on - AI Generation Interface")
        gr.Markdown("Generate 3D meshes using AI for use in Blender and Fallout 4 modding")
        
        # Status indicator
        if ai_available:
            gr.Markdown("✅ **Status**: Hunyuan3D-2 AI is available")
        else:
            gr.Markdown("⚠️ **Status**: Hunyuan3D-2 AI not available. Install it to use generation features.")
            gr.Markdown("See [Hunyuan3D-2 on GitHub](https://github.com/Tencent-Hunyuan/Hunyuan3D-2)")
        
        with gr.Tabs():
            # Text-to-3D Tab
            with gr.TabItem("Text to 3D"):
                gr.Markdown("### Generate 3D mesh from text description")
                
                with gr.Row():
                    with gr.Column():
                        text_prompt = gr.Textbox(
                            label="Description",
                            placeholder="A medieval iron sword with ornate handle",
                            lines=3
                        )
                        text_resolution = gr.Slider(
                            minimum=128,
                            maximum=512,
                            value=256,
                            step=64,
                            label="Resolution"
                        )
                        text_button = gr.Button("Generate 3D Model", variant="primary")
                    
                    with gr.Column():
                        text_output = gr.File(label="Generated Model")
                        text_status = gr.Textbox(label="Status", lines=3)
                
                text_button.click(
                    fn=generate_from_text,
                    inputs=[text_prompt, text_resolution],
                    outputs=[text_output, text_status]
                )
                
                gr.Markdown("""
                **Tips:**
                - Be specific: "rusty iron sword" vs "sword"
                - Include materials: wood, metal, stone
                - Add details: ornate, battle-worn, ancient
                - Keep it simple: one object per prompt
                """)
            
            # Image-to-3D Tab
            with gr.TabItem("Image to 3D"):
                gr.Markdown("### Generate 3D mesh from 2D image")
                
                with gr.Row():
                    with gr.Column():
                        image_input = gr.Image(
                            label="Upload Image",
                            type="pil"
                        )
                        image_resolution = gr.Slider(
                            minimum=128,
                            maximum=512,
                            value=256,
                            step=64,
                            label="Resolution"
                        )
                        image_button = gr.Button("Generate 3D Model", variant="primary")
                    
                    with gr.Column():
                        image_output = gr.File(label="Generated Model")
                        image_status = gr.Textbox(label="Status", lines=3)
                
                image_button.click(
                    fn=generate_from_image,
                    inputs=[image_input, image_resolution],
                    outputs=[image_output, image_status]
                )
                
                gr.Markdown("""
                **Tips:**
                - Use clear, well-lit photos
                - Center the object in the frame
                - Solid background works best
                - Higher resolution = better quality
                """)
            
            # Help Tab
            with gr.TabItem("Help"):
                gr.Markdown("""
                ### How to Use
                
                1. **Choose a tab**: Text to 3D or Image to 3D
                2. **Enter your input**: Text description or upload an image
                3. **Set resolution**: Higher = better quality but slower
                4. **Click Generate**: Wait for the AI to create your model
                5. **Download result**: Get the generated 3D file
                6. **Import to Blender**: File → Import → Wavefront (.obj)
                
                ### About
                
                This interface uses:
                - **Hunyuan3D-2**: Tencent's AI for 3D generation
                - **Gradio**: Web UI framework
                - **Blender Integration**: Seamless workflow for FO4 modding
                
                ### Links
                
                - [Blender FO4 Add-on Docs](https://github.com/POINTYTHRUNDRA654/Blender-add-on.)
                - [Hunyuan3D-2 Repository](https://github.com/Tencent-Hunyuan/Hunyuan3D-2)
                - [Gradio Documentation](https://gradio.app/)
                
                ### Troubleshooting
                
                - **"Hunyuan3D-2 not available"**: Install it following the guide
                - **Slow generation**: Normal, can take 30s-5min
                - **Out of memory**: Reduce resolution or restart
                - **Poor quality**: Try different prompts/images
                """)
    
    return interface


def start_gradio_server(share=False, port=7860):
    """
    Start the Gradio web server in a background thread.
    
    Args:
        share (bool): Create a public shareable link
        port (int): Port to run the server on
        
    Returns:
        tuple: (success: bool, message: str)
    """
    global GRADIO_SERVER, GRADIO_THREAD
    
    if not GRADIO_AVAILABLE:
        return False, "Gradio not installed. Install with: pip install gradio"
    
    if GRADIO_SERVER is not None:
        return False, "Gradio server is already running"
    
    try:
        interface = create_gradio_interface()
        if interface is None:
            return False, "Failed to create Gradio interface"
        
        # Start server in background thread
        def run_server():
            global GRADIO_SERVER
            GRADIO_SERVER = interface.launch(
                share=share,
                server_port=port,
                prevent_thread_lock=True,
                show_error=True
            )
        
        GRADIO_THREAD = threading.Thread(target=run_server, daemon=True)
        GRADIO_THREAD.start()
        
        url = f"http://localhost:{port}"
        message = f"Gradio server started at: {url}"
        
        if share:
            message += "\nPublic link will be shown in console"
        
        return True, message
        
    except Exception as e:
        return False, f"Error starting Gradio server: {str(e)}"


def stop_gradio_server():
    """
    Stop the Gradio web server.
    
    Returns:
        tuple: (success: bool, message: str)
    """
    global GRADIO_SERVER, GRADIO_THREAD
    
    if GRADIO_SERVER is None:
        return False, "Gradio server is not running"
    
    try:
        # Gradio's close method
        if hasattr(GRADIO_SERVER, 'close'):
            GRADIO_SERVER.close()
        
        GRADIO_SERVER = None
        GRADIO_THREAD = None
        
        return True, "Gradio server stopped successfully"
        
    except Exception as e:
        return False, f"Error stopping Gradio server: {str(e)}"


def is_server_running():
    """Check if Gradio server is currently running"""
    return GRADIO_SERVER is not None


class GradioHelpers:
    """Helper class for Gradio operations"""
    
    @staticmethod
    def is_available():
        """Check if Gradio is available"""
        return GRADIO_AVAILABLE
    
    @staticmethod
    def is_server_running():
        """Check if Gradio server is running"""
        return is_server_running()
    
    @staticmethod
    def get_status_message():
        """Get the current status message for Gradio"""
        if not GRADIO_AVAILABLE:
            return "✗ Gradio not installed"
        
        if is_server_running():
            return "✓ Gradio server is running"
        else:
            return "✓ Gradio installed (server stopped)"
    
    @staticmethod
    def get_installation_instructions():
        """Get installation instructions for Gradio"""
        return """
To install Gradio:

1. Install Gradio in Blender's Python environment:
   pip install gradio

2. Restart Blender

3. Start the Gradio server from the add-on panel

Gradio provides a web interface for AI generation:
- Easy-to-use browser-based UI
- Text-to-3D generation interface
- Image-to-3D generation interface
- No command-line knowledge required
- Works on any device with a browser

The Gradio interface will be available at:
http://localhost:7860

You can also create a public shareable link (optional).
"""


def register():
    """Register Gradio helper functions"""
    global GRADIO_AVAILABLE, GRADIO_ERROR
    
    # Check availability on registration
    if GRADIO_AVAILABLE:
        print("✓ Gradio is available")
    else:
        print(f"ℹ Gradio not available: {GRADIO_ERROR}")
        print("  (This is optional - install for web UI features)")


def unregister():
    """Unregister Gradio helper functions"""
    # Stop server if running
    if is_server_running():
        stop_gradio_server()
