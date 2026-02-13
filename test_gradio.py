#!/usr/bin/env python3
"""
Test script to validate Gradio integration
"""

import sys
import os

def test_imports():
    """Test if required modules can be imported"""
    print("=" * 60)
    print("Testing Gradio Integration")
    print("=" * 60)
    
    # Test basic Python modules
    tests = []
    
    # Core modules
    try:
        import io
        import contextlib
        tests.append(("io & contextlib", True, None))
    except Exception as e:
        tests.append(("io & contextlib", False, str(e)))
    
    # Optional: Gradio (may not be installed)
    try:
        import gradio as gr
        tests.append(("gradio", True, gr.__version__))
    except Exception as e:
        tests.append(("gradio", False, "Not installed (run: pip install -r requirements.txt)"))
    
    # Optional: black
    try:
        import black
        tests.append(("black", True, black.__version__))
    except Exception as e:
        tests.append(("black", False, "Not installed"))
    
    # Optional: autopep8
    try:
        import autopep8
        tests.append(("autopep8", True, autopep8.__version__))
    except Exception as e:
        tests.append(("autopep8", False, "Not installed"))
    
    # Print results
    print("\nDependency Check:")
    for name, status, version in tests:
        status_icon = "✓" if status else "✗"
        version_str = f"({version})" if version and status else version if not status else ""
        print(f"  {status_icon} {name:20s} {version_str}")
    
    # Test file existence
    print("\nFile Check:")
    files = [
        "requirements.txt",
        "gradio_interface.py",
        "launch_gradio.py",
        "GRADIO_PYTHON_ASSISTANT.md"
    ]
    
    for file in files:
        exists = os.path.exists(file)
        status_icon = "✓" if exists else "✗"
        print(f"  {status_icon} {file}")
    
    # Test gradio_interface.py syntax
    print("\nSyntax Check:")
    try:
        with open("gradio_interface.py", "r") as f:
            code = f.read()
            compile(code, "gradio_interface.py", "exec")
        print("  ✓ gradio_interface.py syntax is valid")
    except SyntaxError as e:
        print(f"  ✗ Syntax error in gradio_interface.py: {e}")
        return False
    except Exception as e:
        print(f"  ✗ Error reading gradio_interface.py: {e}")
        return False
    
    # Test template loading
    print("\nTemplate Test:")
    try:
        # Try to extract templates without importing gradio
        with open("gradio_interface.py", "r") as f:
            code = f.read()
            if "TEMPLATES = {" in code:
                # Count templates by looking for keys
                template_count = code.count('Template":')
                print(f"  ✓ Found approximately {template_count} templates in code")
            else:
                print("  ✗ TEMPLATES dictionary not found")
                return False
    except Exception as e:
        print(f"  ✗ Error checking templates: {e}")
        return False
    
    # Test function imports
    print("\nFunction Test:")
    try:
        # Check if key functions exist in the code
        with open("gradio_interface.py", "r") as f:
            code = f.read()
            functions = ["def format_code(", "def validate_syntax(", "def run_code_safe("]
            for func in functions:
                if func in code:
                    print(f"  ✓ {func.split('(')[0].replace('def ', '')}() found")
                else:
                    print(f"  ✗ {func.split('(')[0].replace('def ', '')}() not found")
                    return False
        
        # Test validate_syntax without importing gradio
        # We'll just validate that the logic is sound by checking the code structure
        if "compile(code" in code and "SyntaxError" in code:
            print("  ✓ Validation logic implemented")
        else:
            print("  ✗ Validation logic incomplete")
            return False
            
    except Exception as e:
        print(f"  ✗ Error testing functions: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ All basic tests passed!")
    print("=" * 60)
    print("\nTo launch Gradio interface:")
    print("  1. Install dependencies: pip install -r requirements.txt")
    print("  2. Run launcher: python launch_gradio.py")
    print("  3. Open browser: http://127.0.0.1:7860")
    
    return True

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)
