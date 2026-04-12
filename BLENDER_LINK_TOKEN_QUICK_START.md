# Quick Start: Mossy Link Token Setup

⚠️ **Development Notice:** The Mossy Link Blender add-on is still under active development. Features and stability may change as we continue to improve the integration.

## 🔒 New Security Feature - Optional Token-Based Authentication

Mossy v6.1 and Blender add-on v6.1+ now support **optional token authentication** to secure your Blender ↔ Mossy connection.

---

## ⚡ 30-Second Setup

### In Blender

1. **Edit** → **Preferences** → **Add-ons**
2. Search for **"Mossy Link"**
3. Expand the add-on → find **"Mossy Link Token"** field
4. Enter a secure token (or leave blank to disable)
5. **Done** ✓

### In Mossy

1. **Desktop Bridge** → **Blender** tab
2. Find **"Mossy Link Token"** field
3. Enter the **same token** as Blender
4. **Saved automatically** ✓

### Connect

- Open **Blender** + toggle **Mossy** panel → **Link ON**
- Or enable **Auto-start** in Blender preferences

---

## 🆚 Token vs No Token

| Scenario | Blender Token | Mossy Token | Result |
| --- | --- | --- | --- |
| **Secure Setup** | `my-key-123` | `my-key-123` | ✅ **Connects** |
| **Mismatch** | `my-key-123` | `wrong-key` | ❌ **Fails** (helpful error) |
| **No Security** | *(empty)* | *(empty)* | ✅ **Connects** (default) |
| **Upgrade Path** | *(old addon)* | `new-token` | ✅ **Still works** (backward compat) |

---

## 🔐 Token Examples

### Strong Token (Recommended)

```text
mossy-f4-7f8e9c3a2b1d5e4fq9wk3x7m
```

### Medium Token

```text
blender-key-2026-production
```

### Simple Token (for local dev)

```text
test123
```

### Generate Random Token

**Windows PowerShell:**

```powershell
[guid]::NewGuid().ToString().Replace('-','').Substring(0,32)
```

**Linux/Mac:**

```bash
openssl rand -hex 16
```

---

## ❓ FAQ

**Q: Is a token required?**  
A: No. Leave both fields empty to work as before.

**Q: What if I forget the token?**  
A: Change it in both Blender and Mossy. Old token is no longer needed.

**Q: Can I disable it later?**  
A: Yes, just clear both fields. No token = open connection (backward compatible).

**Q: Is it encrypted?**  
A: No, just plain text. Use only on localhost (127.0.0.1), or add TLS/VPN for remote.

**Q: Can I use my Mossy token for other tools?**  
A: Not recommended. Use unique tokens for each service.

---

## ✅ Verification

After setup, click **"Check for Blender Add-on"** in Desktop Bridge:

- ✅ **Connected** = Tokens match + addon is running
- ❌ **Token mismatch** error = Check both fields are identical
- ❌ **Connection timeout** = Blender not running or addon disabled

---

## 🛠️ Troubleshooting

### "Token mismatch" Error

- [ ] Copy the exact token from Blender addon prefs
- [ ] Paste it into Mossy Desktop Bridge → Blender tab
- [ ] Both must be identical (case-sensitive)

### "Connection timeout"

- [ ] Open Blender
- [ ] Press **N** to show side panel
- [ ] Look for **"Mossy"** tab
- [ ] Click **"Link"** toggle **ON**
- [ ] Wait 2 seconds, try again

### Still not working?

- [ ] Clear both tokens (set to empty)
- [ ] Click **Check for Blender Add-on** again
- [ ] If it connects → add tokens back one at a time
- [ ] If it fails → check Blender addon is installed

---

## 📝 Note: This is Optional

**The token feature is completely optional.** If you don't use it, Mossy works exactly as before. Tokens only add an extra layer of security if you want it (especially on shared systems or when debugging).

Enjoy enhanced security! 🚀
