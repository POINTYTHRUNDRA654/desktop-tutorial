"""
Knowledge helpers for the advisor.
- Loads small snippets from bundled or user-provided knowledge base.
- Supports .txt/.md directly.
- PDFs: best-effort text extraction if pypdf is installed.
- Video: looks for sidecar transcripts (.srt/.vtt/.txt) with the same stem.
- Keeps snippets short to avoid large prompts.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

from . import preferences

_DEFAULT_KB_DIR = "knowledge_base"
_TEXT_EXT = {".txt", ".md"}
_VIDEO_EXT = {".mp4", ".mov", ".mkv", ".webm"}


def _kb_root() -> Path:
    prefs = preferences.get_preferences()
    if prefs and getattr(prefs, "knowledge_base_path", ""):
        return Path(os.path.abspath(os.path.expanduser(prefs.knowledge_base_path)))
    base = Path(__file__).resolve().parent / _DEFAULT_KB_DIR
    # Auto-create the default directory if it is absent (e.g. older installs
    # that were deployed before knowledge_base/ was added to the repo).
    if not base.exists():
        try:
            base.mkdir(parents=True, exist_ok=True)
        except OSError:
            # Silently ignore: the add-on dir may be read-only (e.g. system-
            # wide install).  The caller handles a non-existent kb_dir safely.
            pass
    return base


def _read_text_file(path: Path, max_chars: int) -> str | None:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
        text = text.strip()
        return text[:max_chars] if text else None
    except Exception:
        return None


def _read_pdf(path: Path, max_chars: int) -> str | None:
    try:
        import pypdf  # optional dependency
    except Exception:
        return None
    try:
        reader = pypdf.PdfReader(str(path))
        parts = []
        for page in reader.pages:
            txt = page.extract_text() or ""
            if txt:
                parts.append(txt)
            if sum(len(p) for p in parts) >= max_chars:
                break
        text = "\n".join(parts).strip()
        return text[:max_chars] if text else None
    except Exception:
        return None


def _read_video_sidecar(path: Path, max_chars: int) -> str | None:
    stem = path.with_suffix("")
    for ext in (".srt", ".vtt", ".txt"):
        candidate = stem.with_suffix(ext)
        if candidate.exists():
            return _read_text_file(candidate, max_chars)
    # if whisper CLI exists, attempt transcription automatically
    try:
        from shutil import which
        if which("whisper"):
            # output to temporary file in same folder
            output_txt = stem.with_suffix(".whisper.txt")
            if not output_txt.exists():
                import subprocess
                subprocess.run(["whisper", str(path), "--model", "small", "--output_dir", str(path.parent)], check=False)
                # whisper creates a .txt per file with same stem
                # sometimes adds language suffix; find the newest text file
            # try to read whatever transcript was generated
            for txt in path.parent.glob(stem.name + "*.txt"):
                if txt.exists():
                    return _read_text_file(txt, max_chars)
    except Exception:
        pass
    return None


def _read_any(path: Path, max_chars: int) -> str | None:
    """Dispatch to the right reader for *path*'s extension."""
    ext = path.suffix.lower()
    if ext in _TEXT_EXT:
        return _read_text_file(path, max_chars)
    if ext == ".pdf":
        return _read_pdf(path, max_chars)
    if ext in _VIDEO_EXT:
        return _read_video_sidecar(path, max_chars)
    return None


_WORD_RE = re.compile(r"[a-z0-9]+")


def _keywords(text: str) -> set[str]:
    return {w for w in _WORD_RE.findall(text.lower()) if len(w) > 2}


def load_snippets(max_files: int = 20, max_chars: int = 6000, query: str | None = None) -> list[str]:
    """Load up to *max_files* knowledge-base snippets, each truncated to *max_chars*.

    Without *query*, files are picked alphabetically (previous behaviour) —
    fine when the caller has no specific question in mind.  With *query*,
    every candidate file is scored by keyword overlap against it and the
    highest-scoring files win, so a growing knowledge base keeps surfacing
    the most relevant snippet for a given question instead of always
    returning whichever files happen to sort first alphabetically (which
    silently starved every file past the first few once the knowledge base
    grew past max_files).
    """
    kb_dir = _kb_root()
    if not kb_dir.exists() or not kb_dir.is_dir():
        return []

    candidates = [
        p for p in sorted(kb_dir.glob("**/*"))
        if p.is_file() and p.suffix.lower() in (_TEXT_EXT | {".pdf"} | _VIDEO_EXT)
    ]

    if not query or not query.strip():
        snippets: list[str] = []
        for path in candidates:
            if len(snippets) >= max_files:
                break
            text = _read_any(path, max_chars)
            if text:
                snippets.append(text)
        return snippets

    # Relevance-ranked path: read each candidate once (generously, so short
    # files aren't unfairly scored against a truncated slice of a long one),
    # score by keyword overlap, then extract an excerpt from *around the
    # actual match* for the winners -- NOT a blind head-of-file truncation.
    # A large multi-section reference file (e.g. addon_complete_guide.md)
    # can legitimately score highest on whole-file keyword overlap while the
    # matching section sits well past character max_chars; truncating from
    # offset 0 would then silently return a snippet that never contains the
    # content that made the file win in the first place.
    query_words = _keywords(query)
    scored: list[tuple[int, str]] = []
    for path in candidates:
        full_text = _read_any(path, max_chars=50_000)
        if not full_text:
            continue
        score = len(query_words & _keywords(full_text))
        scored.append((score, full_text))

    scored.sort(key=lambda t: t[0], reverse=True)
    return [_best_excerpt(text, query_words, max_chars) for _, text in scored[:max_files]]


_SECTION_RE = re.compile(r"(?=^##\s)", re.MULTILINE)
_PARAGRAPH_RE = re.compile(r"\n\s*\n")


def _best_excerpt(text: str, query_words: set[str], max_chars: int) -> str:
    """Return up to *max_chars* of *text*, centered on whichever chunk(s)
    actually contain the query keywords, instead of always the first
    *max_chars* characters of the file.

    Chunks on markdown ``## `` section boundaries when the file has at
    least two of them (matches this knowledge base's own doc structure);
    falls back to blank-line paragraphs otherwise. Highest-scoring chunks
    are concatenated (each internally still in original order) until
    *max_chars* is filled; if no chunk scores above zero (e.g. the file
    only matched on a query word that occurs everywhere), falls back to
    the previous head-of-file behavior so a snippet is still returned.
    """
    if not query_words:
        return text[:max_chars]

    chunks = [c for c in _SECTION_RE.split(text) if c.strip()]
    if len(chunks) < 2:
        chunks = [c for c in _PARAGRAPH_RE.split(text) if c.strip()]
    if len(chunks) < 2:
        return text[:max_chars]

    scored_chunks = [(len(query_words & _keywords(c)), c) for c in chunks]
    if max(s for s, _ in scored_chunks) <= 0:
        return text[:max_chars]

    scored_chunks.sort(key=lambda t: t[0], reverse=True)
    out, used = [], 0
    for score, chunk in scored_chunks:
        if score <= 0 or used >= max_chars:
            break
        piece = chunk if used + len(chunk) <= max_chars else chunk[:max_chars - used]
        out.append(piece)
        used += len(piece)
    return "\n\n".join(out) if out else text[:max_chars]


def describe_kb() -> str:
    kb_dir = _kb_root()
    if not kb_dir.exists():
        return "Knowledge base not found."
    count_txt = sum(1 for p in kb_dir.glob("**/*") if p.suffix.lower() in _TEXT_EXT)
    count_pdf = sum(1 for p in kb_dir.glob("**/*") if p.suffix.lower() == ".pdf")
    count_vid = sum(1 for p in kb_dir.glob("**/*") if p.suffix.lower() in _VIDEO_EXT)
    return f"KB at {kb_dir} (txt/md={count_txt}, pdf={count_pdf}, video={count_vid} w/ transcripts)"


def tool_status() -> dict:
    status = {
        "pypdf": False,
        "ffmpeg": False,
        "whisper": False,
        "nvcompress": False,
        "texconv": False,
    }
    try:
        import pypdf  # noqa: F401
        status["pypdf"] = True
    except Exception:
        status["pypdf"] = False

    def _which(cmd):
        from shutil import which
        return which(cmd) is not None

    # search PATH
    status["ffmpeg"] = _which("ffmpeg")
    status["whisper"] = _which("whisper")
    status["nvcompress"] = _which("nvcompress")
    status["texconv"] = _which("texconv")

    # also check tools folder (preference-configured root, then addon tools/ subfolder)
    try:
        from . import tool_installers as _tli
        tools_dir = _tli.get_tools_root()
    except Exception:
        tools_dir = Path(__file__).resolve().parent / "tools"
    if not status["ffmpeg"]:
        # honor user-configured path if provided
        try:
            from . import preferences
            ppath = preferences.get_configured_ffmpeg_path()
            if ppath and Path(ppath).exists():
                status["ffmpeg"] = True
        except Exception:
            pass
        if not status["ffmpeg"]:
            # search for ffmpeg.exe anywhere under tools/ffmpeg
            ff_root = tools_dir / "ffmpeg"
            ff = None
            if ff_root.exists():
                for p in ff_root.rglob("ffmpeg.exe"):
                    ff = p
                    break
            status["ffmpeg"] = ff is not None
    if not status["nvcompress"]:
        nv = None
        nv_root = tools_dir / "nvtt"
        if nv_root.exists():
            for p in nv_root.rglob("nvcompress.exe"):
                nv = p
                break
        status["nvcompress"] = nv is not None
    if not status["texconv"]:
        tx = None
        tx_root = tools_dir / "texconv"
        if tx_root.exists():
            for p in tx_root.rglob("texconv.exe"):
                tx = p
                break
        status["texconv"] = tx is not None

    return status


def status() -> tuple[bool, str]:
    """Return (ready, message) tuple for UI display.

    Consistent with status() in other helper modules so the self-test
    can call status() uniformly across all helpers.
    """
    kb_dir = _kb_root()
    if not kb_dir.exists():
        return False, f"Knowledge base directory not found at {kb_dir}"
    snippets = load_snippets()
    count = len(snippets)
    if count == 0:
        return True, (
            f"Knowledge base ready at {kb_dir} "
            "(no snippets loaded; add .txt/.md files for custom Advisor context)"
        )
    return True, describe_kb()


def register():
    pass


def unregister():
    pass
