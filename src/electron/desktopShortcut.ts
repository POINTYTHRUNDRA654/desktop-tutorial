/**
 * Desktop Shortcut Manager
 * Handles creation of desktop shortcuts for Mossy Pip-Boy
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

export class DesktopShortcutManager {
  private static getDesktopPath(): string {
    try {
      return app.getPath('desktop');
    } catch {
      const homeDir = process.env.USERPROFILE || process.env.HOME || '';
      return path.join(homeDir, 'Desktop');
    }
  }

  private static getLinuxIconPath(): string {
    const candidates = [
      path.join(process.resourcesPath, 'public', 'pipboy-icon.svg'),
      path.join(app.getAppPath(), 'public', 'pipboy-icon.svg'),
      path.join(__dirname, '../../public/pipboy-icon.svg'),
    ];

    return candidates.find(candidate => fs.existsSync(candidate)) || '';
  }

  /**
   * Create a desktop shortcut for Windows
   */
  static createWindowsShortcut(): boolean {
    try {
      const desktopPath = this.getDesktopPath();
      
      if (!fs.existsSync(desktopPath)) {
        console.warn('Desktop folder not found');
        return false;
      }

      const exePath = process.execPath; // This gets the Electron executable
      // Use the Electron executable's icon (avoids external icon file dependencies)
      const iconPath = exePath;
      
      // Windows shortcut creation using PowerShell
      const shortcutName = 'Mossy Pip-Boy';
      const shortcutPath = path.join(desktopPath, `${shortcutName}.lnk`);
      
      // For packaged builds the exe IS the app – no --app argument needed.
      // For dev builds pass --app= so Electron loads the right entry point.
      const appPath = app.getAppPath();
      const argAssignment = app.isPackaged
        ? ''
        : `$Shortcut.Arguments = "--app=${appPath}"; `;

      // Create the shortcut using WScript.Shell (VBScript via PowerShell)
      const psCommand = [
        '$WshShell = New-Object -ComObject WScript.Shell',
        `$Shortcut = $WshShell.CreateShortcut("${shortcutPath}")`,
        `$Shortcut.TargetPath = "${exePath}"`,
        ...(argAssignment ? [`${argAssignment}`] : []),
        `$Shortcut.WorkingDirectory = "${path.dirname(exePath)}"`,
        '$Shortcut.Description = "Mossy - Fallout 4 Modding AI Assistant with Pip-Boy Interface"',
        `$Shortcut.IconLocation = "${iconPath}, 0"`,
        '$Shortcut.Save()',
      ].join('; ');

      execSync(`powershell -NoProfile -Command "${psCommand}"`, { stdio: 'pipe' });
      
      console.log(`✓ Desktop shortcut created: ${shortcutPath}`);
      return true;
    } catch (error) {
      console.error('Failed to create Windows shortcut:', error);
      return false;
    }
  }

  /**
   * Create a desktop shortcut for macOS
   */
  static createMacShortcut(): boolean {
    try {
      const desktopPath = this.getDesktopPath();
      
      if (!fs.existsSync(desktopPath)) {
        console.warn('Desktop folder not found');
        return false;
      }

      const appPath = app.getAppPath();
      const shortcutPath = path.join(desktopPath, 'Mossy Pip-Boy.app');
      
      // Create simple alias on macOS
      execSync(`ln -s "${appPath}" "${shortcutPath}"`, { stdio: 'pipe' });
      
      console.log(`✓ Desktop shortcut created: ${shortcutPath}`);
      return true;
    } catch (error) {
      console.error('Failed to create macOS shortcut:', error);
      return false;
    }
  }

  /**
   * Create a desktop shortcut for Linux
   */
  static createLinuxShortcut(): boolean {
    try {
      const desktopPath = this.getDesktopPath();
      
      if (!fs.existsSync(desktopPath)) {
        console.warn('Desktop folder not found');
        return false;
      }

      const appPath = app.getAppPath();
      const exePath = process.execPath;
      const iconPath = this.getLinuxIconPath();
      const shortcutPath = path.join(desktopPath, 'Mossy.desktop');
      const applicationsDir = path.join(process.env.HOME || '', '.local', 'share', 'applications');
      const appMenuShortcutPath = path.join(applicationsDir, 'Mossy.desktop');
      const execCommand = app.isPackaged
        ? `"${exePath}"`
        : `"${exePath}" --app="${appPath}"`;
      
      const desktopContent = `[Desktop Entry]
Version=1.0
Type=Application
Name=Mossy
Comment=Fallout 4 Modding AI Assistant with Pip-Boy Interface
Exec=${execCommand}
Icon=${iconPath}
Terminal=false
Categories=Utility;Development;
StartupNotify=true
StartupWMClass=mossy-desktop
`;

      fs.writeFileSync(shortcutPath, desktopContent);
      fs.chmodSync(shortcutPath, 0o755);
      fs.mkdirSync(applicationsDir, { recursive: true });
      fs.writeFileSync(appMenuShortcutPath, desktopContent);
      fs.chmodSync(appMenuShortcutPath, 0o755);
      
      console.log(`✓ Desktop shortcuts created: ${shortcutPath}, ${appMenuShortcutPath}`);
      return true;
    } catch (error) {
      console.error('Failed to create Linux shortcut:', error);
      return false;
    }
  }

  /**
   * Create desktop shortcut based on platform
   */
  static createDesktopShortcut(): boolean {
    const platform = process.platform;
    
    switch (platform) {
      case 'win32':
        return this.createWindowsShortcut();
      case 'darwin':
        return this.createMacShortcut();
      case 'linux':
        return this.createLinuxShortcut();
      default:
        console.warn(`Desktop shortcut creation not supported for platform: ${platform}`);
        return false;
    }
  }

  /**
   * Check if desktop shortcut already exists
   */
  static shortcutExists(): boolean {
    try {
      const desktopPath = this.getDesktopPath();
      
      const platform = process.platform;
      let shortcutPath = '';
      
      if (platform === 'win32') {
        shortcutPath = path.join(desktopPath, 'Mossy Pip-Boy.lnk');
      } else if (platform === 'darwin') {
        shortcutPath = path.join(desktopPath, 'Mossy Pip-Boy.app');
      } else if (platform === 'linux') {
        const desktopShortcut = path.join(desktopPath, 'Mossy.desktop');
        const legacyDesktopShortcut = path.join(desktopPath, 'Mossy-Pip-Boy.desktop');
        const appMenuShortcut = path.join(process.env.HOME || '', '.local', 'share', 'applications', 'Mossy.desktop');
        return fs.existsSync(desktopShortcut) || fs.existsSync(appMenuShortcut) || fs.existsSync(legacyDesktopShortcut);
      }
      
      return fs.existsSync(shortcutPath);
    } catch {
      return false;
    }
  }
}
