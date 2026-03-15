# Knowledge base

Place small reference docs here (txt/md). Examples:
- Workflow notes for FO4 export (scale, collision, materials)
- Texture compression cheatsheets (BC1/BC3/BC5/BC7)
- Unity/UE import tips

The advisor will sample a few files (up to 6, truncated to keep prompts small) when LLM is enabled.

PDFs: supported if PyPDF2 is installed; you can also batch-convert via tools/pdf_to_md.py.
Video: place sidecar transcripts (.srt/.vtt/.txt) next to the video, or run tools/video_to_txt.ps1 (requires ffmpeg + whisper CLI).
