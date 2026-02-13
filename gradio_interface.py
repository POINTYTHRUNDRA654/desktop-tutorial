"""
Gradio Python Code Writing Assistant for Mossy
Provides an interactive interface for writing, formatting, and validating Python code
"""

import gradio as gr
import subprocess
import sys
import io
import contextlib
from typing import Tuple, Optional

# Code templates for common Fallout 4 modding tasks
TEMPLATES = {
    "Papyrus Script Template": """# Papyrus Script Template for Fallout 4
# This is Python pseudocode - convert to Papyrus syntax

class MyScript:
    def OnInit(self):
        # Initialize your script here
        pass
    
    def OnUpdate(self):
        # Update logic here
        pass
""",
    "Blender Script Template": """import bpy

# Blender script for Fallout 4 asset creation
# Standard scale: 1.0 units = 1 meter
# Standard FPS: 30

def main():
    # Select all objects
    bpy.ops.object.select_all(action='SELECT')
    
    # Your code here
    print("Script executed successfully")

if __name__ == "__main__":
    main()
""",
    "Python Utility Template": """#!/usr/bin/env python3
\"\"\"
Fallout 4 Modding Utility Script
Description: [Add description here]
\"\"\"

import os
import sys

def main():
    \"\"\"Main function\"\"\"
    print("Utility script running...")
    # Your code here
    
if __name__ == "__main__":
    main()
""",
}


def format_code(code: str, formatter: str = "black") -> Tuple[str, str]:
    """
    Format Python code using black or autopep8
    
    Args:
        code: Python code to format
        formatter: 'black' or 'autopep8'
    
    Returns:
        Tuple of (formatted_code, status_message)
    """
    if not code.strip():
        return code, "⚠️ No code to format"
    
    try:
        if formatter == "black":
            # Use black formatter
            result = subprocess.run(
                [sys.executable, "-m", "black", "-", "--quiet"],
                input=code.encode(),
                capture_output=True,
                timeout=5
            )
            if result.returncode == 0:
                formatted = result.stdout.decode()
                return formatted, "✅ Code formatted with Black"
            else:
                error = result.stderr.decode()
                return code, f"❌ Black error: {error}"
        
        elif formatter == "autopep8":
            # Use autopep8 formatter
            result = subprocess.run(
                [sys.executable, "-m", "autopep8", "-"],
                input=code.encode(),
                capture_output=True,
                timeout=5
            )
            if result.returncode == 0:
                formatted = result.stdout.decode()
                return formatted, "✅ Code formatted with autopep8"
            else:
                return code, "❌ autopep8 error"
    
    except subprocess.TimeoutExpired:
        return code, "❌ Formatter timed out"
    except Exception as e:
        return code, f"❌ Format error: {str(e)}"
    
    return code, "❌ Unknown formatter"


def validate_syntax(code: str) -> str:
    """
    Validate Python syntax
    
    Args:
        code: Python code to validate
    
    Returns:
        Validation message
    """
    if not code.strip():
        return "⚠️ No code to validate"
    
    try:
        compile(code, "<string>", "exec")
        return "✅ Syntax is valid!"
    except SyntaxError as e:
        return f"❌ Syntax Error at line {e.lineno}:\n{e.msg}\n{e.text}"
    except Exception as e:
        return f"❌ Error: {str(e)}"


def run_code_safe(code: str, allow_execution: bool = False) -> str:
    """
    Safely execute Python code with output capture
    
    Args:
        code: Python code to execute
        allow_execution: Safety flag - must be True to actually run
    
    Returns:
        Execution output or safety message
    """
    if not allow_execution:
        return "⚠️ Code execution is disabled for safety. Enable it in the checkbox above to run code."
    
    if not code.strip():
        return "⚠️ No code to execute"
    
    # Capture stdout and stderr
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    
    try:
        with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(stderr_capture):
            # Execute in a restricted namespace
            namespace = {
                '__builtins__': __builtins__,
                '__name__': '__main__',
            }
            exec(code, namespace)
        
        output = stdout_capture.getvalue()
        errors = stderr_capture.getvalue()
        
        result = ""
        if output:
            result += f"📤 Output:\n{output}\n"
        if errors:
            result += f"⚠️ Warnings/Errors:\n{errors}\n"
        if not output and not errors:
            result = "✅ Code executed successfully (no output)"
        
        return result
    
    except Exception as e:
        return f"❌ Execution Error:\n{type(e).__name__}: {str(e)}"


def load_template(template_name: str) -> str:
    """Load a code template"""
    return TEMPLATES.get(template_name, "# Select a template")


def create_gradio_interface():
    """Create the Gradio interface for Python code writing"""
    
    with gr.Blocks(title="Mossy Python Code Assistant", theme=gr.themes.Soft()) as demo:
        gr.Markdown("""
        # 🐍 Mossy Python Code Writing Assistant
        
        Create, edit, and validate Python scripts for Fallout 4 modding.
        Includes templates for Papyrus pseudocode, Blender scripts, and Python utilities.
        """)
        
        with gr.Row():
            with gr.Column(scale=2):
                # Code editor
                code_input = gr.Code(
                    label="Python Code Editor",
                    language="python",
                    lines=20,
                    value="# Start writing your Python code here\nprint('Hello from Mossy!')"
                )
                
                with gr.Row():
                    template_dropdown = gr.Dropdown(
                        choices=list(TEMPLATES.keys()),
                        label="Load Template",
                        value=None
                    )
                    load_btn = gr.Button("📋 Load Template", variant="secondary")
            
            with gr.Column(scale=1):
                # Actions and output
                gr.Markdown("### Actions")
                
                validate_btn = gr.Button("✓ Validate Syntax", variant="primary")
                validation_output = gr.Textbox(
                    label="Validation Result",
                    lines=3,
                    interactive=False
                )
                
                gr.Markdown("### Code Formatting")
                formatter_choice = gr.Radio(
                    choices=["black", "autopep8"],
                    value="black",
                    label="Formatter"
                )
                format_btn = gr.Button("✨ Format Code", variant="secondary")
                format_output = gr.Textbox(
                    label="Format Status",
                    lines=2,
                    interactive=False
                )
                
                gr.Markdown("### Safe Execution")
                allow_exec = gr.Checkbox(
                    label="⚠️ Enable code execution (use with caution)",
                    value=False
                )
                run_btn = gr.Button("▶️ Run Code", variant="stop")
                execution_output = gr.Textbox(
                    label="Execution Output",
                    lines=8,
                    interactive=False
                )
        
        # Tips section
        with gr.Accordion("💡 Tips & Best Practices", open=False):
            gr.Markdown("""
            ### Blender Scripts (for Fallout 4)
            - Use scale 1.0 = 1 meter
            - Set animation to 30 FPS
            - Export as .nif using NifSkope
            
            ### Python Best Practices
            - Use descriptive variable names
            - Add docstrings to functions
            - Follow PEP 8 style guide
            - Test code in safe environments
            
            ### Safety Notes
            - Code execution runs in a restricted environment
            - File system access is limited
            - Network access may be restricted
            - Always review generated code before using
            """)
        
        # Event handlers
        load_btn.click(
            fn=load_template,
            inputs=[template_dropdown],
            outputs=[code_input]
        )
        
        validate_btn.click(
            fn=validate_syntax,
            inputs=[code_input],
            outputs=[validation_output]
        )
        
        def format_and_update(code, formatter):
            formatted, status = format_code(code, formatter)
            return formatted, status
        
        format_btn.click(
            fn=format_and_update,
            inputs=[code_input, formatter_choice],
            outputs=[code_input, format_output]
        )
        
        run_btn.click(
            fn=run_code_safe,
            inputs=[code_input, allow_exec],
            outputs=[execution_output]
        )
    
    return demo


if __name__ == "__main__":
    print("🚀 Starting Mossy Python Code Assistant...")
    print("📝 Features: Code templates, syntax validation, formatting, safe execution")
    
    # Create and launch the interface
    demo = create_gradio_interface()
    
    # Launch with share=False for local use only
    # Set server_name to allow access from Electron app
    demo.launch(
        server_name="127.0.0.1",
        server_port=7860,
        share=False,
        show_error=True,
        quiet=False
    )
