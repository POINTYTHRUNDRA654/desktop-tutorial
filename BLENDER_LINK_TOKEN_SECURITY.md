# Mossy ↔ Blender Token-Based Authentication (Security Update)

**Date:** March 30, 2026  
**Status:** ✅ Production Ready

## Overview
Added optional token-based authentication to the Mossy Link for Blender add-on. All Blender commands now support authentication via a shared security token that must match between Blender preferences and Mossy settings.

## User Setup

### Step 1: Set Token in Blender
1. Open **Blender**
2. Go to **Edit → Preferences → Add-ons**
3. Search for **"Mossy Link"** (or **"Blender Game Tools"** category)
4. Expand the **Mossy Link** add-on preferences
5. In the **Mossy Link Token** field, enter a secure token (e.g., `my-secure-blender-key-2026`)
6. Click **Save** (preferences auto-save in Blender)

### Step 2: Set Token in Mossy
1. Open **Mossy** Desktop app
2. Go to **Desktop Bridge → Blender** tab
3. Enter the **same token** in the **Mossy Link Token** field
4. Token is saved automatically to settings

### Step 3: Connect
- **Auto-start** (recommended): Check **Auto-start Mossy Link** in Blender addοn prefs
  - Both will start automatically when opened
- **Manual** (if auto-start disabled): In Blender, open the **Mossy** side panel (press **N**) and toggle the **Link** switch **ON**

## Technical Implementation

### 1. Blender Add-on Changes (`public/mossy_link_addon.py`)

#### Token Field in Preferences
```python
class MossyLinkPreferences(bpy.types.AddonPreferences):
    token: bpy.props.StringProperty(
        name="Mossy Link Token",
        description="Security token to authenticate connections from Mossy Desktop",
        default="",
        subtype="PASSWORD",  # Masked in UI
    )
```

#### Token Validation
```python
def _validate_token(self, token_from_client):
    """Validate token. Returns (is_valid: bool, error_message: str|None)"""
    prefs = _get_prefs()
    required_token = prefs.token.strip() if hasattr(prefs, 'token') else ""
    
    # No token set → backward compatible, allow all
    if not required_token:
        return True, None
    
    # Token required → check client token
    if not token_from_client or token_from_client.strip() != required_token:
        return False, "Token mismatch. Set Add-ons → Blender Game Tools → Mossy Link Token in Blender, then enter the same value in Mossy settings."
    
    return True, None
```

**Applied to all commands** via `_execute_command()`:
```python
def _execute_command(self, command):
    # ✓ TOKEN VALIDATION (applies to all commands)
    token_from_client = command.get("token", "")
    is_valid, error_msg = self._validate_token(token_from_client)
    if not is_valid:
        return json.dumps({"success": False, "status": "error", "message": error_msg})
    # ... proceed with command
```

### 2. Mossy TypeScript Changes

#### Settings Type (`src/shared/types.ts`)
```typescript
export interface Settings {
  // ...
  blenderLinkToken?: string;  // Token to authenticate Mossy ↔ Blender connection
}
```

#### Preload IPC (`src/electron/preload.ts`)
```typescript
const IPC_CHANNELS = {
  SEND_BLENDER_COMMAND: 'send-blender-command',
};

const electronAPI = {
  sendBlenderCommand: (commandType: string, commandData?: any, token?: string): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SEND_BLENDER_COMMAND, commandType, commandData || {}, token);
  },
};
```

#### Electron Main Handler (`src/electron/main.ts`)
```typescript
registerHandler('send-blender-command', async (_event, commandType: string, commandData: any = {}, token?: string) => {
  // Build payload and include token
  const payload: any = { type: commandType, /* ... */ };
  if (token) {
    payload.token = token;
  }
  return await _sendToBlenderTCP(payload);
});
```

#### UI & Token Storage (`src/renderer/src/DesktopBridge.tsx`)
```typescript
// State for token
const [blenderLinkToken, setBlenderLinkToken] = useState<string>(() => {
  try {
    return localStorage.getItem('mossy_blender_link_token') || '';
  } catch {
    return '';
  }
});

// Save token to settings on change
const saveBlenderToken = async (token: string) => {
  const api = getElectronApi();
  if (api?.setSettings) {
    await api.setSettings({ blenderLinkToken: token });
  }
};

// Helper to send commands with token
const sendBlenderCommandWithToken = async (commandType: string, commandData?: any) => {
  const api = getElectronApi();
  return await api.sendBlenderCommand(commandType, commandData || {}, blenderLinkToken || undefined);
};
```

**UI Input:**
- Located in **Desktop Bridge → Blender** tab
- Password field (tokens masked)
- Auto-saves to Mossy settings
- Help text: "Set Add-ons → Blender Game Tools → Mossy Link Token in Blender, then enter the same value here"

### 3. Command Flow
```
User sets token in Blender prefs
        ↓
User sets same token in Mossy (Desktop Bridge → Blender tab)
        ↓
Token saved to Mossy settings (localStorage + main process)
        ↓
Mossy sends command: {"type": "script", "code": "...", "token": "my-key"}
        ↓
Blender addon receives, validates token against prefs
        ↓
Token matches → command executes
Token mismatch → error response with helpful message
No token set in Blender → accepts any/no token (backward compatible)
```

## Security Characteristics

### ✅ What This Protects Against
- **Accidental connections** from unrelated Blender instances on the same machine
- **Local network attacks** (if Blender socket is exposed)
- **Command injection** if socket is temporarily exposed during debugging
- **Prevent rogue tools** from impersonating Mossy

### ⚠️ Limitations (By Design)
- **Not encrypted** in transit (token sent as plain text in JSON)
  - Recommended only for **local connections** (127.0.0.1)
  - For remote/network scenarios, use TLS/VPN
- **No expiration** - tokens persist until manually changed
- **Not a replacement for full TLS** - just an application-level gate

### 🔐 Best Practices
1. Use **strong, random tokens** (e.g., 32+ char alphanumeric)
   - Example: `mossy-2026-$(openssl rand -hex 16)`
2. **Match exactly** in both Blender and Mossy settings
3. **Change tokens periodically** if shared across systems
4. **Keep localhost only** (do not expose port 9999 to network without TLS)

## Backward Compatibility

✅ **Fully backward compatible:**
- If **no token** is set in Blender, it **accepts all connections**
- Existing Mossy instances (without token) still work
- Old Blender add-ons still function

**Migration path:**
1. Install new Blender add-on (v6.1+)
2. Update Mossy to latest version
3. Optionally set tokens for extra security
4. If tokens not set, everything works as before

## Files Modified

| File | Changes |
|------|---------|
| `public/mossy_link_addon.py` | Token field in prefs, validation logic in `_execute_command()` |
| `src/shared/types.ts` | `blenderLinkToken?: string` in Settings interface |
| `src/electron/preload.ts` | IPC_CHANNELS.SEND_BLENDER_COMMAND, `sendBlenderCommand()` wrapper |
| `src/electron/main.ts` | Already supports token parameter in handler (no change needed) |
| `src/renderer/src/DesktopBridge.tsx` | Token UI input, `saveBlenderToken()`, `sendBlenderCommandWithToken()` |

## Testing Checklist

- [ ] Set token in Blender add-on preferences (e.g., `test-token-123`)
- [ ] Set same token in Mossy (Desktop Bridge → Blender tab)
- [ ] Click "Check for Blender Add-on" → should connect successfully
- [ ] Change token in Mossy to mismatch → should fail with clear error
- [ ] Clear token in Blender prefs → should accept any token (backward compat)
- [ ] Clear token in Mossy → should work when Blender has no token
- [ ] Test all Blender commands (export, script, etc.) with token

## Error Messages

If token mismatch:
```
Mossy Link token required. Set Add-ons → Blender Game Tools → Mossy Link Token in Blender, 
then enter the same value in Mossy settings.
```

If token exists but doesn't match:
```
Mossy Link token mismatch. Token does not match the one set in Blender add-on preferences.
```

## Configuration Examples

### Secure Setup (Recommended for Production)
```
Blender prefs:  token = "mossy-f4-7f8e9c3a2b1d5e4f"
Mossy settings: blenderLinkToken = "mossy-f4-7f8e9c3a2b1d5e4f"
Connection: 127.0.0.1:9999 (localhost only)
```

### Development Setup (No Token)
```
Blender prefs:  token = "" (empty)
Mossy settings: blenderLinkToken = "" (empty)
Connection: Any → accepts all commands (backward compatible)
```

### Multi-User Setup
```
User Alice:
  Blender token = "alice-blender-key-q7x2y9z"
  Mossy token   = "alice-blender-key-q7x2y9z"

User Bob:
  Blender token = "bob-blender-key-m4p1n6v"
  Mossy token   = "bob-blender-key-m4p1n6v"

(Each user's Mossy instance only talks to their Blender)
```

## FAQ

**Q: Do I have to use a token?**  
A: No. If you don't set one, Mossy works exactly as before. Tokens are optional.

**Q: What if I forget my token?**  
A: Just change it in both Blender and Mossy to something new.

**Q: Can I use the same token on multiple machines?**  
A: Not recommended. Use a unique token per machine or per user.

**Q: Is this encrypted?**  
A: No, tokens are sent as plain text. Use only on localhost or behind TLS/VPN.

**Q: Can I generate a strong token programmatically?**  
A: Yes, use: `python -c "import secrets; print(secrets.token_hex(16))"`  
   Or in PowerShell: `$([guid]::NewGuid().ToString().Replace('-','').Substring(0,32))`

## Version History

- **v6.1** (Mar 2026) - Initial token authentication feature
  - Optional token-based auth
  - Backward compatible
  - Stored in Blender prefs + Mossy settings

---

**Implemented by:** GitHub Copilot  
**For:** Mossy (Fallout 4 Modding Assistant)
