# Integration Connectors

This directory contains example integration modules that allow the AI assistant to interact with external applications and system features.

## Overview

Integration connectors enable the AI assistant to:
- Launch applications
- Read and write files (with explicit user permission)
- Simulate keyboard/mouse events
- Interact with system APIs
- Connect to third-party services

## Security Principles

⚠️ **IMPORTANT SECURITY CONSIDERATIONS** ⚠️

1. **Explicit User Permission**: ALL potentially dangerous operations (file system access, keyboard simulation, app launching) must require explicit user confirmation via a dialog or permission prompt.

2. **Input Validation**: Always validate and sanitize inputs before executing any system command or file operation.

3. **Least Privilege**: Operations should run with the minimum necessary permissions.

4. **Audit Trail**: Log all integration actions for transparency and debugging.

5. **Sandboxing**: Consider running integrations in isolated contexts when possible.

6. **No Default Enabling**: Dangerous integrations should be opt-in and disabled by default.

## Example Integration Structure

```typescript
// src/integrations/example-integration.ts

export interface IntegrationConfig {
  enabled: boolean;
  permissions: string[];
  settings?: Record<string, any>;
}

export interface IntegrationAction {
  name: string;
  description: string;
  requiresPermission: boolean;
  execute: (params: any) => Promise<any>;
}

export class ExampleIntegration {
  config: IntegrationConfig;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  async executeAction(action: string, params: any): Promise<any> {
    // Validate action
    // Check permissions
    // Execute safely
  }
}
```

## Available Example Integrations

### 1. Hello World (Safe Demo)
File: `hello-world.ts`
- Purpose: Demonstrate basic integration structure
- Permissions: None required
- Safe: Yes

### 2. Application Launcher (Moderate Risk)
File: `app-launcher.ts`
- Purpose: Launch system applications
- Permissions: System execution
- Risk: Can launch any application
- Mitigation: Whitelist of allowed applications, user confirmation

### 3. File Reader (Moderate Risk)
File: `file-reader.ts`
- Purpose: Read file contents
- Permissions: File system read
- Risk: Can read sensitive files
- Mitigation: Restrict to specific directories, user confirmation per file

### 4. Clipboard Manager (Low Risk)
File: `clipboard-manager.ts`
- Purpose: Read/write clipboard
- Permissions: Clipboard access
- Risk: Could leak sensitive copied data
- Mitigation: Clear disclosure, opt-in only

## External AI/ML Integrations

The following repos are included locally for reference and optional workflows:

- Cosmos Reason2 (embedded repo copy): `src/integrations/cosmos-reason2`
- Cosmos Transfer2.5 (external clone): `external/nvidia-cosmos/cosmos-transfer2.5`
- Cosmos Predict2.5 (external clone): `external/nvidia-cosmos/cosmos-predict2.5`
- Cosmos Cookbook (external clone): `external/nvidia-cosmos/cosmos-cookbook`
- Cosmos RL (external clone): `external/nvidia-cosmos/cosmos-rl`
- Cosmos Dependencies (external clone): `external/nvidia-cosmos/cosmos-dependencies`
- Cosmos Curate (external clone): `external/nvidia-cosmos/cosmos-curate`
- Cosmos Xenna (external clone): `external/nvidia-cosmos/cosmos-xenna`

These are documented integrations and are not auto-executed by Mossy. Use Knowledge Search to index them if you want local semantic search.

## Creating New Integrations

1. Create a new file in this directory
2. Implement the integration interface
3. Add proper error handling and validation
4. Document required permissions
5. Add user confirmation for dangerous operations
6. Test thoroughly before enabling

## Platform Considerations

### Windows
- Use PowerShell or Windows APIs for system interaction
- Consider UAC elevation requirements
- Path separators: backslash `\`

### macOS
- Use AppleScript or shell commands
- Consider privacy permissions (Accessibility, Automation)
- Path separators: forward slash `/`

### Linux
- Use shell commands or D-Bus
- Consider distribution differences
- Path separators: forward slash `/`

## Recommended Libraries

- **Keyboard/Mouse**: `robotjs`, `nut-js`
- **File System**: Node.js `fs` module with careful validation
- **Process Management**: Node.js `child_process` with spawn (safer than exec)
- **Clipboard**: `electron` clipboard API
- **System Info**: `systeminformation`

## Best Practices

1. Always validate inputs before system calls
2. Use `child_process.spawn()` instead of `exec()` when possible
3. Implement timeouts for long-running operations
4. Provide clear error messages
5. Log all operations for debugging
6. Test on all target platforms
7. Document any platform-specific behavior
8. Never execute arbitrary code from LLM responses without validation

## Testing Integrations

Create unit tests for each integration:

```typescript
// src/integrations/__tests__/example-integration.test.ts

import { describe, it, expect } from 'vitest';
import { ExampleIntegration } from '../example-integration';

describe('ExampleIntegration', () => {
  it('should require permission for dangerous actions', () => {
    // Test implementation
  });
});
```

## Disabling Integrations

To disable an integration:
1. Set `enabled: false` in the integration config
2. Or remove the integration module entirely
3. Restart the application

## Future Enhancements

- [ ] Integration permission system with granular controls
- [ ] Integration marketplace/plugin system
- [ ] Sandboxed execution environment
- [ ] Rate limiting for API calls
- [ ] Integration health monitoring
- [ ] Automated security scanning for integration code
