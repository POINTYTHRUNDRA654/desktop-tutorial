# Volt Tech Desktop Wrapper - Update

This repository now includes an **Electron-based desktop wrapper** for the Volt Tech web application with native program detection capabilities.

## New Features

### 🔗 Program Detection & Attachment
- Detects installed desktop programs on Windows
- Scans Windows Registry (HKLM & HKCU Uninstall keys)
- Falls back to Program Files directory scanning
- Exposes clean API to front-end via `window.electron.api`

### 🚀 Desktop Application
- Secure Electron context (contextIsolation, no nodeIntegration, sandboxed)
- Loads Volt Tech web build from `./external/volttech-dist/`
- Development mode with hot reload support
- Production-ready Windows NSIS installer

## Quick Start

### For Volt Tech Integration

1. **Place your built front-end in `external/volttech-dist/`**
   ```bash
   # Copy built files from Mossy-Vault---TEC
   cp -r /path/to/Mossy-Vault---TEC/dist/* external/volttech-dist/
   ```

2. **Use the API in your front-end**
   ```javascript
   // Detect programs
   const programs = await window.electron.api.detectPrograms();
   
   // Launch a program
   await window.electron.api.openProgram('C:\\Program Files\\App\\app.exe');
   ```

3. **Build and package**
   ```bash
   npm run build
   npm run package:win
   ```

### Development

```bash
# Install dependencies
npm install

# Start development (with Vite dev server)
npm run dev

# Or use a custom URL (must already be running)
# Note: on Windows, prefer running via npm scripts (or `npx`) so the local Electron binary is found.
ELECTRON_START_URL=http://localhost:5173 npm run dev:electron
```

#### Windows note (common gotcha)

If you run `electron .` directly in PowerShell and see:

`The term 'electron' is not recognized...`

that just means Electron is installed locally (in `node_modules`) but not globally on your PATH.

Use one of these instead:

```bash
npm run start
# or
npx electron .
```

### View Example UI

Open `public/attach-programs.html` in the Electron app to see a working demonstration of:
- Program detection
- Program listing with metadata
- Launching programs

## API Documentation

### `window.electron.api.detectPrograms()`
Returns a Promise resolving to an array of detected programs.

**Returns:** `Promise<InstalledProgram[]>`

```typescript
interface InstalledProgram {
  name: string;           // Executable name
  displayName: string;    // Display name
  path: string;           // Full path to executable
  icon?: string;          // Icon path (optional)
  version?: string;       // Version (optional)
  publisher?: string;     // Publisher name (optional)
}
```

### `window.electron.api.openProgram(path: string)`
Opens/launches a program by its executable path.

**Parameters:**
- `path`: Full path to the program executable

**Returns:** `Promise<void>`

## Building for Production

### Build Application
```bash
npm run build
```

### Create Windows Installer
```bash
npm run package:win
```

This creates:
- `release/Volt Tech Desktop Setup x.x.x.exe` - NSIS installer
- Installer supports both x64 and ia32 architectures
- Allows custom installation directory
- Creates desktop and Start Menu shortcuts

**Note:** Building Windows installer on Linux/macOS requires Wine. Build on Windows for best results.

## Directory Structure

```
desktop-tutorial/
├── src/
│   ├── electron/              # NEW: Electron wrapper
│   │   ├── main.ts           # Main process
│   │   ├── preload.ts        # IPC bridge
│   │   ├── detectPrograms.ts # Program detection logic
│   │   ├── types.ts          # TypeScript interfaces
│   │   └── README.md         # Detailed documentation
│   ├── main/                 # Original main process
│   ├── renderer/             # React renderer
│   └── shared/               # Shared types
├── external/
│   └── volttech-dist/        # NEW: Volt Tech web build goes here
│       └── index.html        # Entry point (placeholder)
├── public/
│   └── attach-programs.html  # NEW: Example UI
└── package.json              # Updated with new scripts
```

## Configuration

### package.json
- Updated `main` to point to `dist-electron/electron/main.js`
- Added `package:win` script for Windows-only builds
- Configured electron-builder with NSIS options
- Added `cross-env` for environment variable support

### electron-builder (in package.json)
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

## Security

The implementation follows Electron security best practices:

- ✅ `contextIsolation: true` - Isolated preload context
- ✅ `nodeIntegration: false` - No Node.js in renderer
- ✅ `sandbox: true` - Sandboxed renderer process
- ✅ Input validation on all IPC handlers
- ✅ Path sanitization before launching programs
- ✅ Minimal API surface via contextBridge

## Platform Support

- **Windows**: Full support (primary target)
  - Registry scanning for installed programs
  - Program Files directory scanning
  - NSIS installer generation

- **macOS/Linux**: Infrastructure ready
  - Program detection needs platform-specific implementation
  - Build system configured for DMG/AppImage

## Troubleshooting

### Front-end not loading
Ensure `external/volttech-dist/index.html` exists with valid HTML content.

### Program detection returns empty
- Verify Windows Registry access permissions
- Check Program Files directories are accessible
- Review console logs for detailed error messages

### Build fails on Linux
Windows installer requires Wine. Build on Windows or use CI/CD with Windows runners.

## Next Steps

1. Copy Volt Tech built assets to `external/volttech-dist/`
2. Integrate `window.electron.api` calls in your front-end
3. Test program detection and launching
4. Build Windows installer with `npm run package:win`
5. Distribute the generated `.exe` installer

## Documentation

- **Full Electron Wrapper Docs**: `src/electron/README.md`
- **Example UI**: `public/attach-programs.html`
- **API Types**: `src/electron/types.ts`

## Testing

```bash
# Run tests
npm test

# Run in watch mode
npm run test:watch
```

All tests are passing ✅

## License

MIT License - See LICENSE file for details
