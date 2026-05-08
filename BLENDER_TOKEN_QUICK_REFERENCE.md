# Blender Link Token - Quick Reference

## 🚀 Quick Start

### First Time Setup (Fully Automatic)

1. **Open Blender** → Mossy Link addon loads → token auto-generated ✅
2. **Open Mossy** → Desktop Bridge tab → token auto-generated ✅
3. **Copy token** → Click "📋 Copy" button → paste into Blender preferences ✅
4. **Done!** Connection automatically activates ✅

---

## 📋 Copy Token to Blender

**In Mossy Desktop:**

```text
Desktop Bridge → Blender tab → "📋 Copy" button
```

Token is now on your clipboard (see feedback message).

**In Blender:**

```text
Edit → Preferences → Add-ons 
→ Search "Mossy Link"
→ Expand the addon
→ Paste token in "Mossy Link Token" field
```

---

## 🔄 Regenerate Token

**In Mossy Desktop:**

- Click "🔄 Regenerate Token" button under the token display
- New token appears instantly
- Old token is invalidated

**In Blender:**

- Clear the token field in Blender preferences
- Reload Blender or toggle addon OFF/ON
- Addon auto-generates new token
- Check Blender console for new token value

---

## 🔍 Token Location

**Blender:**

- Stored in addon preferences
- Visible in Edit → Preferences → Add-ons → Mossy Link

**Mossy:**

- Stored in settings.json
- Displayed in Desktop Bridge UI

---

## ✅ Verify Connection

You'll know it's working when:

- ✅ Desktop Bridge shows "Connected" badge (green)
- ✅ Blender N-panel shows "Neural Link Active"
- ✅ Mossy console logs: "Auto-detected: Blender add-on found"
- ✅ No token mismatch errors in console

---

## ❌ Troubleshooting

| Issue | Solution |
| --- | --- |
| "Token mismatch" error | Copy token from Mossy, paste in Blender preferences |
| Token not showing in Mossy | Restart Mossy or refresh Desktop Bridge tab |
| Blender shows blank token | Restart Blender with addon enabled |
| Want fresh tokens | Click "🔄 Regenerate" in Mossy, update Blender |
| Connection won't activate | Ensure ports 9999 (Blender) + 21337 (Mossy) are open |

---

## 🔐 Security Notes

- Tokens are **128-bit cryptographically random** (very secure)
- Tokens are **stored locally** (never sent to internet)
- Tokens are **automatically generated** (no manual creation needed)
- Tokens can be **regenerated anytime** if needed
- Empty tokens = **backward compatible** (no auth required)

---

## 📞 Need Help?

Check:

1. Blender console for token generation logs
2. Mossy Desktop Bridge logs for connection status
3. Make sure both apps are on the same machine (localhost only)
4. Check that Blender addon is actually enabled

---

**Version**: Mossy Link v6.0+  
**Status**: ✅ Production Ready
