#!/usr/bin/env python
"""Convert PDFs in a folder to markdown snippets in knowledge_base/.
Requires: pip install PyPDF2
Usage: python tools/pdf_to_md.py input_dir knowledge_base
"""

import sys
import os
from pathlib import Path

try:
    import PyPDF2
except ImportError:
    print("PyPDF2 not installed. Run: pip install PyPDF2")
    sys.exit(1)


def convert_pdf(pdf_path: Path, out_dir: Path, max_chars: int = 4000):
    reader = PyPDF2.PdfReader(str(pdf_path))
    parts = []
    for page in reader.pages:
        txt = page.extract_text() or ""
        if txt:
            parts.append(txt)
        if sum(len(p) for p in parts) >= max_chars:
            break
    text = "\n".join(parts).strip()
    if not text:
        return False
    out_name = pdf_path.stem + ".md"
    out_path = out_dir / out_name
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text[:max_chars], encoding="utf-8")
    print(f"Wrote {out_path}")
    return True


def main():
    if len(sys.argv) < 3:
        print("Usage: python tools/pdf_to_md.py <input_dir> <output_dir>")
        return
    inp = Path(sys.argv[1])
    out = Path(sys.argv[2])
    if not inp.exists():
        print(f"Input dir not found: {inp}")
        return
    for pdf in inp.glob("**/*.pdf"):
        convert_pdf(pdf, out)


if __name__ == "__main__":
    main()
