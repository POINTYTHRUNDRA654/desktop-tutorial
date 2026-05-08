import { PluginManifest, ActivationEvent, PluginValidationResult, SecurityRisk } from '../shared/types';

/**
 * Plugin Manifest Validator
 * Validates plugin.json schema and structure
 */

export class PluginManifestValidator {
  /**
   * Validate a plugin manifest object
   */
  static validate(manifest: any): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const risks: SecurityRisk[] = [];
    let checksumValid = true;

    // Required fields
    if (!manifest.id || typeof manifest.id !== 'string') {
      errors.push('Missing or invalid plugin ID (must be string like "com.example.plugin")');
    } else if (!/^[a-z0-9_.-]+$/.test(manifest.id)) {
      errors.push('Plugin ID contains invalid characters (only lowercase letters, numbers, dots, underscores, and hyphens allowed)');
    }

    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('Missing or invalid plugin name');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      errors.push('Missing or invalid version');
    } else if (!this.isValidVersion(manifest.version)) {
      errors.push('Version must be semantic versioning format (e.g., 1.0.0)');
    }

    if (!manifest.main || typeof manifest.main !== 'string') {
      errors.push('Missing entry point (main field must point to the main script)');
    }

    // Optional but recommended
    if (!manifest.description) {
      warnings.push('Missing description (recommended for marketplace visibility)');
    }

    if (!manifest.author) {
      warnings.push('Missing author information');
    }

    if (!manifest.license) {
      warnings.push('Missing license information (recommended)');
    }

    // Validate optional fields
    if (manifest.engines) {
      this.validateEngines(manifest.engines, errors, warnings);
    }

    if (manifest.activationEvents) {
      this.validateActivationEvents(manifest.activationEvents, errors, warnings);
    }

    if (manifest.contributes) {
      this.validateContributes(manifest.contributes, errors, warnings);
    }

    if (manifest.permissions) {
      this.validatePermissions(manifest.permissions, errors, risks, warnings);
    }

    if (manifest.dependencies) {
      this.validateDependencies(manifest.dependencies, errors, warnings);
    }

    if (manifest.categories) {
      this.validateCategories(manifest.categories, warnings);
    }

    // Security Analysis
    this.analyzeSecurityRisks(manifest, risks);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      risks,
      checksumValid,
    };
  }

  /**
   * Check if version string is valid semantic versioning
   */
  private static isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/;
    return semverRegex.test(version);
  }

  /**
   * Validate engine requirements
   */
  private static validateEngines(engines: any, errors: string[], warnings: string[]): void {
    if (typeof engines !== 'object') {
      errors.push('engines must be an object');
      return;
    }

    // Mossy version requirement
    if (engines.mossy) {
      if (!this.isValidVersionRange(engines.mossy)) {
        warnings.push(`Invalid Mossy version range: "${engines.mossy}"`);
      }
    }

    // Node version requirement
    if (engines.node) {
      if (!this.isValidVersionRange(engines.node)) {
        warnings.push(`Invalid Node version range: "${engines.node}"`);
      }
    }

    // Electron version requirement
    if (engines.electron) {
      if (!this.isValidVersionRange(engines.electron)) {
        warnings.push(`Invalid Electron version range: "${engines.electron}"`);
      }
    }
  }

  /**
   * Check if version range is valid
   */
  private static isValidVersionRange(range: string): boolean {
    // Simple check for common semver patterns: ^1.0.0, ~1.0.0, >=1.0.0, etc.
    const rangePattern = /^[\^~><=*x\d.]+$/;
    return rangePattern.test(range);
  }

  /**
   * Validate activation events
   */
  private static validateActivationEvents(events: any, errors: string[], warnings: string[]): void {
    if (!Array.isArray(events)) {
      errors.push('activationEvents must be an array');
      return;
    }

    const validEventTypes = ['onStartup', 'onShutdown', 'onCommand', 'onFileType', 'onView', 'onSettingChange'];

    for (const event of events) {
      if (typeof event !== 'string') {
        errors.push('Each activation event must be a string');
        continue;
      }

      const eventType = event.split(':')[0];
      if (!validEventTypes.includes(eventType)) {
        warnings.push(`Unknown activation event type: "${eventType}"`);
      }

      // Validate specific event formats
      if (event.startsWith('onCommand:')) {
        if (!event.includes('.')) {
          warnings.push('Command event should follow format: onCommand:pluginId.commandName');
        }
      } else if (event.startsWith('onFileType:')) {
        if (!event.includes('*')) {
          warnings.push('File type event should use wildcards: onFileType:*.esp');
        }
      }
    }

    if (events.length === 0) {
      warnings.push('activationEvents array is empty (plugin may never activate)');
    }
  }

  /**
   * Validate plugin contributions
   */
  private static validateContributes(contributes: any, errors: string[], warnings: string[]): void {
    if (typeof contributes !== 'object') {
      errors.push('contributes must be an object');
      return;
    }

    // Validate commands
    if (contributes.commands) {
      if (!Array.isArray(contributes.commands)) {
        errors.push('contributes.commands must be an array');
      } else {
        for (const cmd of contributes.commands) {
          if (!cmd.command || !cmd.title) {
            errors.push('Each command must have "command" and "title" properties');
          }
        }
      }
    }

    // Validate menus
    if (contributes.menus) {
      if (typeof contributes.menus !== 'object') {
        errors.push('contributes.menus must be an object');
      }
    }

    // Validate settings
    if (contributes.settings) {
      if (typeof contributes.settings !== 'object') {
        errors.push('contributes.settings must be an object');
      }
    }

    // Validate keybindings
    if (contributes.keybindings) {
      if (!Array.isArray(contributes.keybindings)) {
        errors.push('contributes.keybindings must be an array');
      } else {
        for (const kb of contributes.keybindings) {
          if (!kb.command || !kb.key) {
            errors.push('Each keybinding must have "command" and "key" properties');
          }
        }
      }
    }
  }

  /**
   * Validate requested permissions and assess security risks
   */
  private static validatePermissions(
    permissions: any,
    errors: string[],
    risks: SecurityRisk[],
    warnings: string[]
  ): void {
    if (!Array.isArray(permissions)) {
      errors.push('permissions must be an array');
      return;
    }

    const validPermissions = [
      'filesystem:read',
      'filesystem:write',
      'process:spawn',
      'network:request',
      'network:listen',
      'settings:read',
      'settings:write',
      'ui:modify',
      'extension:load',
      'electron:ipc',
    ];

    const highRiskPermissions = {
      'process:spawn': 'Can execute arbitrary system processes',
      'network:listen': 'Can listen for network connections',
      'filesystem:write': 'Can write/modify files on disk',
    };

    for (const permission of permissions) {
      if (typeof permission !== 'string') {
        errors.push('Each permission must be a string');
        continue;
      }

      if (!validPermissions.includes(permission)) {
        warnings.push(`Unknown permission: "${permission}"`);
      }

      // Flag high-risk permissions
      if (highRiskPermissions[permission as keyof typeof highRiskPermissions]) {
        risks.push({
          level: 'high',
          permission,
          description: highRiskPermissions[permission as keyof typeof highRiskPermissions],
        });
      }
    }

    if (permissions.includes('filesystem:write') && permissions.includes('process:spawn')) {
      risks.push({
        level: 'critical',
        permission: 'filesystem:write + process:spawn',
        description: 'Plugin can write files and execute processes - high risk of malicious activity',
      });
    }
  }

  /**
   * Validate dependencies object
   */
  private static validateDependencies(dependencies: any, errors: string[], warnings: string[]): void {
    if (typeof dependencies !== 'object') {
      errors.push('dependencies must be an object');
      return;
    }

    for (const [name, version] of Object.entries(dependencies)) {
      if (typeof version !== 'string') {
        errors.push(`Dependency version for "${name}" must be a string`);
      } else if (!this.isValidVersionRange(version as string)) {
        warnings.push(`Invalid version range for dependency "${name}": "${version}"`);
      }
    }
  }

  /**
   * Validate categories
   */
  private static validateCategories(categories: any, warnings: string[]): void {
    if (!Array.isArray(categories)) {
      warnings.push('categories must be an array');
      return;
    }

    const validCategories = [
      'Tools',
      'Themes',
      'Integrations',
      'Importers',
      'Exporters',
      'Validators',
      'Automation',
      'UI',
      'Other',
    ];

    for (const category of categories) {
      if (!validCategories.includes(category)) {
        warnings.push(`Invalid category: "${category}". Valid categories: ${validCategories.join(', ')}`);
      }
    }
  }

  /**
   * Analyze security risks in the manifest
   */
  private static analyzeSecurityRisks(manifest: any, risks: SecurityRisk[]): void {
    // Check for suspicious patterns

    // Network + Process execution
    if (
      manifest.permissions?.includes('network:request') &&
      manifest.permissions?.includes('process:spawn')
    ) {
      if (!risks.some(r => r.permission === 'network:request + process:spawn')) {
        risks.push({
          level: 'high',
          permission: 'network:request + process:spawn',
          description: 'Plugin can make network requests and execute processes - could enable command & control',
        });
      }
    }

    // Check for onStartup without version constraints
    if (manifest.activationEvents?.includes('onStartup') && !manifest.engines?.mossy) {
      risks.push({
        level: 'low',
        permission: 'onStartup',
        description: 'Plugin activates on startup without version constraints - may cause startup delays',
      });
    }

    // Check for wildcard file associations
    if (manifest.activationEvents?.some((e: string) => e.startsWith('onFileType') && e.includes('*.'))) {
      const hasWrite = manifest.permissions?.includes('filesystem:write');
      if (hasWrite) {
        risks.push({
          level: 'medium',
          permission: 'onFileType:* + filesystem:write',
          description: 'Plugin responds to multiple file types and can write files - monitor carefully',
        });
      }
    }
  }
}

/**
 * Validate a plugin manifest from JSON or file path
 */
export async function validatePluginManifest(manifestPath: string): Promise<PluginValidationResult> {
  try {
    // This would be implemented with actual file reading in production
    // For now, it's a placeholder
    const manifest = require(manifestPath);
    return PluginManifestValidator.validate(manifest);
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to load manifest: ${error}`],
      warnings: [],
      risks: [],
      checksumValid: false,
    };
  }
}

/**
 * Simple semantic version comparison
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;

    if (aPart < bPart) return -1;
    if (aPart > bPart) return 1;
  }

  return 0;
}

/**
 * Validate contributors satisfies requirements
 */
export function validatePluginRequirements(manifest: PluginManifest, systemVersion: string): string[] {
  const issues: string[] = [];

  if (!manifest.engines?.mossy) {
    return issues; // No version requirement
  }

  // Simple version comparison (in production, use semver library)
  const required = manifest.engines.mossy;
  const requires = required.replace(/[^0-9.]/g, '');

  if (compareVersions(systemVersion, requires) < 0) {
    issues.push(`Plugin requires Mossy ${required}, but system has ${systemVersion}`);
  }

  return issues;
}
