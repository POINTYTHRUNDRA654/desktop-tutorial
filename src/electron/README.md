# Volt Tech Desktop - Electron Wrapper

This directory contains the Electron-based desktop wrapper for the Volt Tech web application with program detection capabilities.

## Overview

The desktop wrapper provides:
- **Secure Electron Context**: Runs with `contextIsolation`, no `nodeIntegration`, and sandboxed renderer
- **Program Detection**: Discovers installed desktop programs on Windows through:
  - Windows Registry scanning (HKLM & HKCU Uninstall keys)
  - Program Files directory scanning (fallback)
- **IPC Bridge**: Exposes minimal API to front-end via `window.electron.api`
- **Windows Installer**: Builds NSIS installer for easy distribution

## Directory Structure

```
src/electron/
├── main.ts           # Electron main process
├── preload.ts        # Secure IPC bridge via contextBridge
├── detectPrograms.ts # Windows program detection logic
└── types.ts          # Shared TypeScript interfaces

external/volttech-dist/
└── index.html        # Volt Tech web build assets go here

public/
└── attach-programs.html  # Example UI demonstrating the API
```

## Front-End Integration

The desktop wrapper exposes a minimal API to the front-end via `window.electron.api`:

### API Methods

```typescript
// Detect installed programs
window.electron.api.detectPrograms(): Promise<InstalledProgram[]>

// Open/launch a program
window.electron.api.openProgram(path: string): Promise<void>
```

### InstalledProgram Interface

```typescript
interface InstalledProgram {
  name: string;           // Program executable name
  displayName: string;    // Display name from registry
  path: string;           // Full path to executable
  icon?: string;          // Icon path (optional)
  version?: string;       // Version string (optional)
  publisher?: string;     // Publisher name (optional)
}
```

### Example Usage

```javascript
// Detect programs
const programs = await window.electron.api.detectPrograms();
console.log(`Found ${programs.length} programs`);

// Launch a program
await window.electron.api.openProgram('C:\\Program Files\\Example\\app.exe');
```

## Development

### Setup

1. Install dependencies:
```bash
npm install
```

2. Place Volt Tech web build in `external/volttech-dist/`:
   - Copy the built output from Mossy-Vault---TEC
   - Must include `index.html` as entry point
   - Or keep the placeholder for testing

### Development Mode

Start the development server:

```bash
npm run dev
```

This starts:
1. Vite dev server on port 5173
2. Electron with hot reload

The main process loads from `http://localhost:5173` in development.

To test with a different URL:
```bash
ELECTRON_START_URL=http://localhost:3000 npm run dev:electron
```

### View Example UI

The example UI page is at `public/attach-programs.html`. It demonstrates:
- Calling `detectPrograms()` to scan the system
- Displaying results in a responsive grid
- Launching programs with `openProgram()`

## Building

### Build for Development

```bash
npm run build
```

This creates:
- `dist/` - Compiled renderer files (if using Vite)
- `dist-electron/` - Compiled main process files

### Package for Distribution

Build Windows installer:

```bash
npm run package:win
```

This creates:
- `release/Volt Tech Desktop Setup x.x.x.exe` - NSIS installer for Windows

The installer:
- Allows custom installation directory
- Creates desktop shortcut
- Creates Start Menu shortcut
- Supports both x64 and ia32 architectures

## Program Detection Details

### Windows Registry Scanning

Queries three registry locations:
1. `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall` (64-bit programs)
2. `HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall` (32-bit on 64-bit)
3. `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall` (user-installed)

Extracts:
- DisplayName
- InstallLocation
- DisplayIcon
- DisplayVersion
- Publisher

### Fallback: File System Scanning

If registry access fails, scans:
- `C:\Program Files`
- `C:\Program Files (x86)`

Recursively finds `.exe` files (max depth: 2), excluding:
- Uninstallers (`*unins*.exe`)
- Setup files (`*setup*.exe`, `*install*.exe`)

### Security Considerations

- Input validation on all IPC handlers
- Path sanitization before launching programs
- File existence verification before execution
- No direct Node.js access from renderer
- Sandboxed renderer process

## Configuration

### Electron Builder (package.json)

```json
{
  "build": {
    "appId": "com.volttech.desktop",
    "productName": "Volt Tech Desktop",
    "win": {
      "target": ["nsis"]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

## Troubleshooting

### Front-end not loading in production

Ensure `external/volttech-dist/index.html` exists and contains valid HTML.

### Program detection fails

- Check Windows Registry access permissions
- Verify Program Files directories are accessible
- Review console logs for detailed error messages

### Build errors

```bash
# Clean build artifacts
rm -rf dist dist-electron release

# Rebuild
npm run build
```

## Future Enhancements

- [ ] Add icon extraction for detected programs
- [ ] Support for other platforms (macOS, Linux)
- [ ] Filter programs by category
- [ ] Search/filter UI in front-end
- [ ] Recent programs list
- [ ] Custom program shortcuts

## License

MIT License - See LICENSE file for details
