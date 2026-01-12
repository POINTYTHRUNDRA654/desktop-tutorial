/**
 * Desktop Shortcut Manager
 * Handles creation of desktop shortcuts for Mossy Pip-Boy
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

export class DesktopShortcutManager {
  /**
   * Create a desktop shortcut for Windows
   */
  static createWindowsShortcut(): boolean {
    try {
      const homeDir = process.env.USERPROFILE || process.env.HOME || '';
      const desktopPath = path.join(homeDir, 'Desktop');
      
      if (!fs.existsSync(desktopPath)) {
        console.warn('Desktop folder not found');
        return false;
      }

      const appPath = app.getAppPath();
      const exePath = process.execPath; // This gets the Electron executable
      const iconPath = path.join(__dirname, '../../public/pipboy-icon.svg');
      
      // Windows shortcut creation using PowerShell
      const shortcutName = 'Mossy Pip-Boy';
      const shortcutPath = path.join(desktopPath, `${shortcutName}.lnk`);
      
      // Create the shortcut using WScript.Shell (VBScript via PowerShell)
      const psCommand = `
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut("${shortcutPath}")
        $Shortcut.TargetPath = "${exePath}"
        $Shortcut.Arguments = "--app=${appPath}"
        $Shortcut.WorkingDirectory = "${path.dirname(appPath)}"
        $Shortcut.Description = "Mossy - Fallout 4 Modding AI Assistant with Pip-Boy Interface"
        $Shortcut.IconLocation = "${iconPath}, 0"
        $Shortcut.Save()
      `;

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
      const homeDir = process.env.HOME || '';
      const desktopPath = path.join(homeDir, 'Desktop');
      
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
      const homeDir = process.env.HOME || '';
      const desktopPath = path.join(homeDir, 'Desktop');
      
      if (!fs.existsSync(desktopPath)) {
        console.warn('Desktop folder not found');
        return false;
      }

      const appPath = app.getAppPath();
      const exePath = process.execPath;
      const iconPath = path.join(__dirname, '../../public/pipboy-icon.svg');
      const shortcutPath = path.join(desktopPath, 'Mossy-Pip-Boy.desktop');
      
      const desktopContent = `[Desktop Entry]
Version=1.0
Type=Application
Name=Mossy Pip-Boy
Comment=Fallout 4 Modding AI Assistant with Pip-Boy Interface
Exec=${exePath} ${appPath}
Icon=${iconPath}
Terminal=false
Categories=Development;
`;

      fs.writeFileSync(shortcutPath, desktopContent);
      fs.chmodSync(shortcutPath, 0o755);
      
      console.log(`✓ Desktop shortcut created: ${shortcutPath}`);
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
      const homeDir = process.env.USERPROFILE || process.env.HOME || '';
      const desktopPath = path.join(homeDir, 'Desktop');
      
      const platform = process.platform;
      let shortcutPath = '';
      
      if (platform === 'win32') {
        shortcutPath = path.join(desktopPath, 'Mossy Pip-Boy.lnk');
      } else if (platform === 'darwin') {
        shortcutPath = path.join(desktopPath, 'Mossy Pip-Boy.app');
      } else if (platform === 'linux') {
        shortcutPath = path.join(desktopPath, 'Mossy-Pip-Boy.desktop');
      }
      
      return fs.existsSync(shortcutPath);
    } catch {
      return false;
    }
  }
}
