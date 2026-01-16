# Video Transcription Feature - User Guide

## Overview
Mossy can now transcribe video tutorials and add them to the Memory Vault! This allows you to upload your favorite modding video tutorials and have Mossy learn from them.

## Setup (One-Time)

### 1. Get an OpenAI API Key
1. Visit https://platform.openai.com/api-keys
2. Sign up or log in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-...`)

### 2. Add Your API Key to Mossy
1. Open Mossy
2. Go to **Settings** → **Privacy & Data**
3. Scroll to the "API Keys" section
4. Paste your OpenAI API key
5. Click **Save**

## Using Video Transcription

### Supported Video Formats
- `.mp4` (most common)
- `.webm`
- `.mov`
- `.avi`
- `.mkv`
- `.flv`

### How to Transcribe a Video

1. **Go to Memory Vault**
   - Click the brain icon in the sidebar

2. **Upload Your Video**
   - Click "Upload Knowledge" button, OR
   - Drag and drop the video file directly into the text area

3. **Wait for Processing**
   - Mossy will extract the audio (takes a few seconds)
   - Then send it to OpenAI Whisper for transcription (1-2 minutes depending on video length)
   - Progress bar will show the status

4. **Review & Save**
   - The transcript will appear in the upload modal
   - Edit the title if needed
   - Add relevant tags (optional)
   - Click "Digest This Knowledge" to save

5. **Done!**
   - Mossy can now reference this video content in conversations
   - Ask questions about the tutorial content

## Example Use Cases

### Modding Tutorials
"Hey Mossy, I uploaded a video about Creation Kit navmesh. Can you summarize the key points?"

### Tool Workflows
"I have a video showing the xEdit workflow. What are the main steps?"

### Best Practices
"Based on the Blender tutorial I uploaded, what's the proper export process?"

## Cost Information

- Transcription uses OpenAI's Whisper API
- Pricing: $0.006 per minute of audio
- Example: A 10-minute video costs $0.06
- Your API key is billed by OpenAI, not by Mossy

## Privacy & Security

✅ **Your API key is stored locally** - Never sent to Mossy servers
✅ **Videos are processed locally** - Audio extraction happens on your computer
✅ **Only audio goes to OpenAI** - The video file itself stays private
✅ **Transcripts are stored locally** - In your browser's localStorage

## Troubleshooting

### "OpenAI API Key Required" Error
- Make sure you've added your API key in Settings → Privacy & Data
- Check that the key starts with `sk-`

### Transcription Failed
**Possible causes:**
1. Invalid or expired API key
2. No internet connection
3. Corrupted video file
4. Video has no audio track
5. OpenAI API rate limit reached

**Solutions:**
- Verify your API key is correct
- Check your internet connection
- Try a different video file
- Wait a few minutes if rate limited

### FFmpeg Error
- This is rare but can happen with unusual video codecs
- Try converting the video to MP4 format first
- Use a tool like HandBrake or VLC to re-encode

## Tips for Best Results

1. **Clear Audio**: Videos with clear speech transcribe better
2. **English Works Best**: Whisper supports 50+ languages but English is most accurate
3. **Shorter is Better**: Break long videos into segments for easier processing
4. **Name It Well**: Use descriptive titles so you can find transcripts later
5. **Add Tags**: Use tags like "blender", "creation-kit", "papyrus" for easy searching

## What Happens Behind the Scenes

1. **Video Upload**: File is read as ArrayBuffer in the browser
2. **Send to Electron**: ArrayBuffer sent via IPC to main process
3. **Save to Temp**: Video saved to temporary directory
4. **Extract Audio**: FFmpeg extracts audio as MP3 (128kbps)
5. **Send to OpenAI**: Audio sent to Whisper API via HTTPS
6. **Receive Transcript**: Text returned and displayed to user
7. **Cleanup**: Temporary video and audio files deleted
8. **Store Locally**: Transcript saved in Memory Vault

## Future Enhancements (Coming Soon)

- [ ] Support for subtitle files (.srt, .vtt)
- [ ] Batch processing multiple videos
- [ ] Progress percentage during transcription
- [ ] Speaker diarization (who said what)
- [ ] Timestamp markers in transcripts
- [ ] Local Whisper model option (no API key needed)

## Support

If you encounter issues:
1. Check the console (F12) for error messages
2. Verify your API key is valid
3. Test with a short, simple MP4 file first
4. Ensure you have internet connectivity

---

**Happy Learning!** 🎓📹
Now Mossy can learn from video tutorials just like you do!
