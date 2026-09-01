# Nemotron Packaging & Deployment Guide

This guide covers how to package and distribute Mossy with the Nemotron model integrated.

## Overview

The Nemotron service is deployed as a Docker container, which is started either:
1. **Automatically** when the user launches Mossy (native installer)
2. **On-demand** via the UI (portable/cloud versions)

## Build & Package Flow

```
┌─────────────────────────────────┐
│ 1. Compile Electron App         │
│    (npm run build)              │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ 2. Build Nemotron Docker Image  │
│    (docker build ...)           │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ 3. Package Both Together        │
│    (.zip, .exe, .app, etc)      │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ 4. Create Installer Script      │
│    (NSIS, wix, or shell)        │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ 5. Distribute via Package       │
│    (GitHub Releases, etc)       │
└─────────────────────────────────┘
```

## Windows (NSIS Installer)

### Step 1: Update package.json

Add build scripts:

```json
{
  "scripts": {
    "build": "npm run build:app && npm run build:docker",
    "build:app": "vite build",
    "build:docker": "docker build -f Dockerfile.nemotron -t mossy-nemotron:latest .",
    "package:win": "npm run build && yarn electron-builder --publish never",
    "package:win-full": "npm run build && yarn electron-builder --publish never -m nsis:x64"
  },
  "build": {
    "nsis": {
      "installers": ["nsis"],
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Mossy AI"
    }
  }
}
```

### Step 2: Create NSIS Installer Script

File: `build/mossy-installer.nsi`

```nsis
!include "MUI2.nsh"
!include "FileFunc.nsh"

Name "Mossy AI"
OutFile "Mossy-Setup-1.0.0.exe"
InstallDir "$PROGRAMFILES\Mossy"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install"
    SetOutPath "$INSTDIR"
    
    # Copy Electron app
    File /r "dist\*.*"
    
    # Copy Docker files
    File "Dockerfile.nemotron"
    File "docker-compose.nemotron.yml"
    File "requirements-docker.txt"
    File "nemotron_api.py"
    
    # Check Docker Desktop
    ReadRegStr $0 HKLM "Software\Docker Inc.\Docker" "InstallPath"
    StrCmp $0 "" docker_not_found
    
    # Create start menu shortcuts
    CreateDirectory "$SMPROGRAMS\Mossy"
    CreateShortcut "$SMPROGRAMS\Mossy\Mossy.lnk" "$INSTDIR\mossy.exe"
    CreateShortcut "$SMPROGRAMS\Mossy\Uninstall.lnk" "$INSTDIR\uninstall.exe"
    
    # Create uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"
    
    MessageBox MB_OK "Mossy installed successfully!$\n$\nDocker Desktop is required to use Nemotron AI features.$\nYou can download it from: https://docker.com/download"
    Goto done
    
    docker_not_found:
    MessageBox MB_YESNO "Docker Desktop not found.$\n$\nNemotron AI features require Docker.$\nDownload now?" /SD IDYES IDYES open_docker IDNO done
    open_docker:
    ExecShell "open" "https://docker.com/download"
    
    done:
SectionEnd

Section "Uninstall"
    RMDir /r "$INSTDIR"
    RMDir /r "$SMPROGRAMS\Mossy"
SectionEnd
```

### Step 3: Auto-start Docker Service on First Launch

In Electron main process (`src/electron/main.ts`):

```typescript
import { spawn } from 'child_process';
import fetch from 'node-fetch';

async function startNemotronService() {
  try {
    // Check if service is already running
    const response = await fetch('http://localhost:5000/health', {
      timeout: 5000,
    });
    
    if (response.ok) {
      console.log('Nemotron service already running');
      return;
    }
  } catch (error) {
    console.log('Nemotron service not running, attempting to start...');
  }

  try {
    // Start Docker container
    const process = spawn('docker-compose', [
      '-f', 'docker-compose.nemotron.yml',
      'up', '-d'
    ], {
      detached: true,
      stdio: 'ignore',
    });

    process.unref();

    // Wait for service to be ready
    let retries = 30;
    while (retries > 0) {
      try {
        const response = await fetch('http://localhost:5000/health', {
          timeout: 2000,
        });
        if (response.ok) {
          console.log('Nemotron service started successfully');
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries--;
    }

    console.warn('Nemotron service startup timeout');
  } catch (error) {
    console.error('Failed to start Nemotron service:', error);
  }
}

// Call on app ready
app.on('ready', () => {
  startNemotronService();
  // ... rest of initialization
});
```

## macOS (DMG Package)

### Step 1: Build DMG

Update `package.json`:

```json
{
  "build": {
    "dmg": {
      "contents": [
        { "x": 410, "y": 150, "type": "link", "path": "/Applications" },
        { "x": 130, "y": 150, "type": "file" }
      ]
    }
  }
}
```

### Step 2: Include Docker Desktop Requirement

Create `build/mossy.dmg.sh`:

```bash
#!/bin/bash
echo "Installing Mossy..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Docker Desktop not found. Installing..."
    open https://desktop.docker.com/mac/main/arm64/Docker.dmg
fi

# Install Mossy
cp -r "/Volumes/Mossy/Mossy.app" /Applications/

echo "Installation complete"
```

## Linux (AppImage)

### Step 1: Build AppImage

```bash
npm run build:app
npx electron-builder --linux AppImage

# Also create Docker image
docker build -f Dockerfile.nemotron -t mossy-nemotron:latest .
```

### Step 2: Create Installation Script

File: `build/install-linux.sh`

```bash
#!/bin/bash
set -e

echo "Installing Mossy AI..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required but not installed"
    echo "Install it with: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# Install AppImage
chmod +x ./Mossy-*.AppImage
./Mossy-*.AppImage --install-system

# Build Docker image
docker build -f Dockerfile.nemotron -t mossy-nemotron:latest .

echo "Installation complete!"
```

## Cloud Deployment (Optional)

### Docker Hub

```bash
# Build and push
docker build -f Dockerfile.nemotron -t <username>/mossy-nemotron:1.0 .
docker push <username>/mossy-nemotron:1.0

# In docker-compose.nemotron.yml, reference remote image:
image: <username>/mossy-nemotron:1.0
```

### AWS Lambda / Azure Functions

Use [AWS Lambda Container Image Support](https://aws.amazon.com/blogs/aws/new-aws-lambda-container-image-support/):

```dockerfile
FROM public.ecr.aws/lambda/python:3.11

COPY nemotron_api.py .
COPY requirements-docker.txt .

RUN pip install -r requirements-docker.txt

# Wrap for Lambda
COPY lambda_handler.py .
```

## Distribution Checklist

- [ ] Build Electron app: `npm run build`
- [ ] Build Docker image: `docker build -f Dockerfile.nemotron ...`
- [ ] Test locally: `docker-compose -f docker-compose.nemotron.yml up`
- [ ] Run integration tests (E2E)
- [ ] Update version numbers and CHANGELOG
- [ ] Sign binaries (code signing certificate)
- [ ] Create installer (NSIS/DMG/AppImage)
- [ ] Test installer on clean system
- [ ] Generate checksums/hashes
- [ ] Upload to GitHub Releases
- [ ] Create release announcement
- [ ] Monitor for issues/feedback

## Rollback Procedure

If a release has critical bugs:

```bash
# Revert to previous image version
git checkout v1.0.0 Dockerfile.nemotron
docker build -f Dockerfile.nemotron -t mossy-nemotron:1.0-rollback .
docker-compose -f docker-compose.nemotron.yml down
docker-compose -f docker-compose.nemotron.yml up -d --build
```

## Monitoring & Telemetry

Add health/crash reporting to track issues:

```typescript
// In Electron main process
function reportHealth(status: 'ok' | 'error', details: any) {
  if (process.env.TELEMETRY_ENABLED === 'true') {
    fetch('https://api.example.com/telemetry/health', {
      method: 'POST',
      body: JSON.stringify({
        version: app.getVersion(),
        timestamp: new Date().toISOString(),
        status,
        ...details,
      }),
    });
  }
}
```

---

**See Also**: 
- `NEMOTRON_INTEGRATION.md` - Development guide
- `.github/workflows/build.yml` - CI/CD pipeline
- `CHANGES.md` - Release notes
