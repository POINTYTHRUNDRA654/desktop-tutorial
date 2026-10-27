# How to install Mossy

Mossy is a free Fallout 4 modding assistant for Windows. This guide takes you from download to a working setup, about 15 minutes plus any optional downloads you pick.

Out of the box Mossy runs entirely on your own PC: no account, no API keys, and nothing about you is sent anywhere. The only thing Mossy reads from the internet by itself is the public GitHub Releases list, at most once a day, to tell you when a new version is out (you can switch that off in **Settings > Updates**). Everything extra is optional, and Mossy asks before it downloads anything.

---

## 1. Check your PC

| | Minimum | Recommended |
|---|---|---|
| Windows | 10 or 11, 64-bit | 11 |
| Memory (RAM) | 8 GB | 16 GB or more |
| Disk space | 1 GB for Mossy | 20 GB or more if you want local AI and image tools |
| Graphics card | Not required | NVIDIA with 8 GB of video memory, for AI image tools and faster AI chat |

Every modding tool, guide and checker in Mossy works on any PC. Only the AI features depend on your graphics card and memory, and Mossy checks that for you during setup.

## 2. Pick your edition

The [Releases page](https://github.com/POINTYTHRUNDRA654/desktop-tutorial/releases/latest) has two installers:

- **Mossy NVIDIA**: for PCs with an NVIDIA GeForce or RTX card. It adds GPU acceleration and local model training.
- **Mossy Universal**: for every other PC (AMD, Intel, or no graphics card).

If you aren't sure, open **Task Manager > Performance > GPU** and look at the name. Picking the wrong one doesn't break anything: Mossy tells you during setup if the other edition suits your PC better.

## 3. Install

1. Download the `.exe` for your edition from the [Releases page](https://github.com/POINTYTHRUNDRA654/desktop-tutorial/releases/latest).
2. Run it. Windows may show a blue **SmartScreen** box for new releases. Click **More info**, then **Run anyway**.
3. Follow the installer and launch Mossy when it finishes.

## 4. First-run setup

Mossy walks you through these screens in order. You can go back at any time, and you can replay the whole setup later from **Settings > Tutorial & Onboarding**.

1. **Welcome / edition check.** Shows which edition you installed. Press **Test Voice** to hear Mossy.
2. **Which Fallout 4 version do you have?** Pick Original, Next-Gen or Anniversary, so Mossy's advice matches your game.
3. **Scanning Your System.** Mossy looks for Fallout 4 and the modding tools already on your PC. Nothing is changed or uploaded.
4. **What your PC can run.** Mossy measures your graphics card, memory and disk, then shows each feature as **Ready**, **Needs setup**, **Limited** or **Not on this PC**. See [section 5](#5-optional-downloads) for what each button does.
5. **Credits & Acknowledgments.** The community tools and authors Mossy builds on.
6. **Whitelist & Blacklist.** Choose which detected programs Mossy may talk about and work with.
7. **Tools Discovered.** What the scan found and what Mossy can do with each tool.
8. **Install Dependencies & Tools.** Links to the official download pages of modding tools you don't have yet (xEdit, Mod Organizer 2, LOOT, F4SE and more), each with a note on what stops working without it. These are links only: you download and install them yourself.
9. **Feed Me the Base Game.** Optional: let Mossy read your game's plugin files so she knows the base game's records.
10. **Before we finish.** What Mossy should call you, and where to keep her memory files (another drive is fine).
11. **Setup Complete!** Then the **Voice Setup** and **AI Texture Tools** wizards, both optional.

## 5. Optional downloads

All of these are on the **What your PC can run** screen (and later in **Settings > Your PC**). Nothing installs unless you click it.

### Things Mossy can download and set up for you

When you click **Download and set up for me**, Mossy:

- asks which folder to use (pick another drive if C: is short on space),
- downloads the official release,
- checks it against the publisher's published SHA-256 checksum (and, for Ollama and Python, the publisher's digital signature),
- and only then installs it. The downloaded installer is deleted afterwards.

| Item | What it's for | Download |
|---|---|---|
| **Ollama** | Runs Mossy's AI chat on your own PC, privately | about 1.7 GB, plus a model |
| **AI model** | The "brain" Ollama runs. Mossy picks the largest one that fits your graphics card or memory, and you can choose a separate folder or drive for models. | 1 to 7 GB |
| **Python** | Needed by the texture batch tools and the Creative Director helpers | about 30 MB |
| **PhotoCraft** | Free image editor for the Glowing Sea Studio | about 90 MB |
| **Starter memory** | Mossy's pre-built Fallout 4 knowledge (FormIDs, records, placements; no game text), so she can answer with real game data straight away | 7 MB (117 MB unpacked) |
| **Creative Director AI helpers** | Local services that let the Creative Director draft quests, dialogue and NPCs with your own AI model. Needs Python and Ollama first. | about 400 MB |
| **Brain B** | Mossy's cited Fallout 4 answers (Creation Kit and Papyrus documentation). Runs on the CPU. | 235 MB (about 1.3 GB installed) |

### Things you install yourself (Mossy gives the link and the steps)

**ComfyUI** runs the AI image tools: AI Image Studio, Glowing Sea Studio, Detail Synthesis and the Background Remover. It needs an NVIDIA card with 6 GB of video memory or more; 8 GB is recommended.

1. On the [ComfyUI releases page](https://github.com/comfyanonymous/ComfyUI/releases), download the Windows portable build for NVIDIA (a `.7z` file of about 2 GB). It includes its own Python.
2. Extract it with [7-Zip](https://www.7-zip.org/) to a drive with at least 20 GB free.
3. Start it with `run_nvidia_gpu.bat` and leave its window open while you use the image tools. On a 6 GB card, add `--lowvram` to that file's command line.
4. In Mossy, open **Textures & Materials > AI Image Studio**, set the ComfyUI folder, and let Mossy fetch an SDXL checkpoint for you.

## 6. Optional extras in Settings

- **Your own AI service.** Mossy runs on local AI. If you'd rather use an online account of your own (OpenAI, Groq, OpenRouter or any OpenAI-compatible service), enter its address, model and your key here.
  - The key is encrypted on your PC and never shown again.
  - Your chat messages go to that service only while this is switched on, under that service's terms and prices.
  - **Turn off** puts everything back to local AI. **Delete my key** removes the key from your PC.
- **Claude / MCP bridge.** Lets Claude Code or another MCP client use Mossy's tools on your PC.
  - It is off by default.
  - It only answers on your own computer, and it refuses requests from web pages.
  - Setup steps are in [tools/mossy-mcp/README.md](tools/mossy-mcp/README.md).

## 7. Where your data lives

- **Settings, memory, projects:** `%APPDATA%\mossy-desktop\`
- **Downloaded AI models:** the folder you chose. The Ollama default is `%USERPROFILE%\.ollama\models`.
- **Installed extras:** the folders you chose. The defaults are under `%LOCALAPPDATA%\Programs\`.

**Upgrading:** when a new version is out, Mossy shows a notice with a link to the release page (or use **Settings > Updates > Check for updates now**). Download the installer for your edition, close Mossy, run the new installer over the old one, and your data is kept.

**Removing Mossy:** uninstall from **Windows Settings > Apps**. Your data folder is left alone; delete `%APPDATA%\mossy-desktop\` yourself if you want a completely fresh start. Extras such as Ollama, Python and PhotoCraft are separate programs: uninstall them from **Windows Settings > Apps**, or delete their folders.

## 8. If something goes wrong

- **A feature shows "Needs setup" after you installed something.** Press **Recheck** on the Your PC screen. Ollama has to be running: start it from the Start menu.
- **A download fails partway.** Click it again; nothing half-installed is left behind. A checksum or signature failure means the file didn't match its publisher's, so it was deleted rather than installed.
- **The AI image tools say ComfyUI is offline.** Start ComfyUI with `run_nvidia_gpu.bat` and leave its window open.
- **Not enough space on C:.** Choose another drive in the folder box of each download. For Ollama models, use **Choose where models are stored**.
- **Still stuck?** Open an issue on the [GitHub Issues page](https://github.com/POINTYTHRUNDRA654/desktop-tutorial/issues). Include what you clicked and the message Mossy showed.

---

Mossy is not affiliated with Bethesda or with any of the third-party tools it helps you use. Always download tools from their official sources.
