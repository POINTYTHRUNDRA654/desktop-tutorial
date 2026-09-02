# Knowledge Base

This folder is the default knowledge base for the add-on's AI Advisor feature.

Place `.txt` or `.md` files here to provide custom context that will be included
in Advisor prompts.  PDF files are also supported if `pypdf` is installed, and
video files (`.mp4`, `.mov`, `.mkv`, `.webm`) are supported when a `.srt`/`.vtt`/`.txt`
sidecar transcript with the same filename stem exists alongside them.

You can override this folder by setting a custom **Knowledge Base Path** in
*Add-on Preferences → AI Advisor*.

## Tips

- Keep individual files concise (a few thousand characters) so they fit
  comfortably inside the LLM context window.
- Use descriptive filenames; the Advisor loads files in alphabetical order
  and stops after the first 12 snippets.
- Subdirectories are searched recursively.
