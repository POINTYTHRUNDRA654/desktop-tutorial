# Migration Guide: v5.0.x → v5.1.0

## ⚠️ Important Changes - READ THIS FIRST

### **All Paid API Dependencies Have Been REMOVED** ✅

**Version 5.1.0 removes ALL paid API integrations** and makes Mossy the exclusive AI provider.

---

## 🔄 What Changed

### **REMOVED Features** ❌
1. **OpenAI API Integration** - No longer supported
2. **Custom LLM Endpoints** - Removed
3. **API Key Management** - No longer needed (except Mossy token)
4. **Paid Service Configuration** - All UI removed

### **NEW/UPDATED Features** ✅
1. **Mossy AI (100% Free)** - Now the ONLY AI provider
2. **Simplified Setup** - No API keys to manage
3. **Privacy-First** - All AI runs locally via Mossy
4. **Better UI** - Clear "FREE" indicators everywhere

---

## 🚀 Migration Steps

### **For Users WITH OpenAI API Keys**

Your old settings will be automatically ignored. No action needed, but:

1. **Remove old API key file** (optional cleanup):
   ```bash
   # Windows
   del %USERPROFILE%\.blender_game_tools_keys.json

   # Linux/Mac
   rm ~/.blender_game_tools_keys.json
   ```

2. **Enable Mossy AI** (if you want AI features):
   - Download free Mossy desktop app
   - In Blender: `N → Fallout 4 → Settings → AI Advisor`
   - Check "Enable AI Advisor (via Mossy)"
   - Set Mossy token (same in both apps)

### **For Users WITHOUT API Keys**

Nothing changes! If you weren't using AI features before, everything works the same.

**Want to try FREE AI now?**
- Download Mossy (free, open-source)
- Enable in Settings → AI Advisor
- Enjoy local AI assistance with zero cost

---

## 📋 Preference Migration

### **What's Preserved** ✅
- ✅ All mesh optimization settings
- ✅ All export preferences
- ✅ Havok2FBX configuration
- ✅ Tool paths (NVTT, texconv, etc.)
- ✅ Mossy Link token (if set)
- ✅ Asset library paths
- ✅ All automation settings

### **What's Removed** ❌
- ❌ `llm_enabled` - No longer exists
- ❌ `llm_endpoint` - Removed
- ❌ `llm_model` - Removed
- ❌ `llm_api_key` - Removed
- ❌ `llm_allow_actions` - Removed
- ❌ `llm_send_stats` - Removed

### **What's Added** ✅
- ✅ `use_mossy_as_ai` - Enable FREE Mossy AI (defaults to True)
- ✅ Enhanced Mossy connection status
- ✅ Better AI feature descriptions

---

## 🎯 Feature Mapping

### **OLD** → **NEW**

| Old Feature | New Feature | Status |
|-------------|-------------|--------|
| OpenAI GPT-4 API | Mossy Local AI | ✅ FREE |
| Custom LLM Endpoint | Mossy Local AI | ✅ FREE |
| API Key Required | No Keys Needed | ✅ FREE |
| Cloud Processing | 100% Local | ✅ Privacy |
| Paid Subscription | 100% Free Forever | ✅ FREE |

---

## 🔍 What to Expect

### **Behavior Changes**

**Before (v5.0.x)**:
1. Set LLM endpoint + API key
2. Enable LLM advisor
3. Calls go to OpenAI (or custom endpoint)
4. $$$ Charges may apply

**After (v5.1.0)**:
1. Install FREE Mossy app
2. Enable AI Advisor (Mossy)
3. Calls go to Mossy (localhost)
4. ✅ 100% FREE forever

### **UI Changes**

**Settings Panel - BEFORE**:
```
AI Advisor – LLM (optional, opt-in)
├── Enable LLM Advisor [checkbox]
├── Endpoint URL [text field]
├── Model [text field]
├── API Key [password field]
└── ...
```

**Settings Panel - AFTER**:
```
AI Advisor – FREE via Mossy (100% Local)
├── Enable AI Advisor [checkbox]
├── ✓ No API keys needed
├── ✓ No cloud services
├── ✓ 100% free forever
└── Requires Mossy desktop app running
```

---

## 🐛 Troubleshooting

### **"AI features not working"**

**Cause**: Mossy not installed or not running

**Solution**:
1. Download Mossy desktop app (free)
2. Launch Mossy and start AI service
3. In Blender: Settings → AI Advisor → Enable
4. Verify Mossy connection status

### **"Can't find LLM settings"**

**Expected**: LLM settings were intentionally removed

**Solution**:
- Use Mossy instead (100% free)
- See "Setting Up Mossy" in README.md

### **"Old API key still in file"**

**Impact**: None - file is ignored in v5.1.0

**Solution** (optional cleanup):
```bash
# Windows
del %USERPROFILE%\.blender_game_tools_keys.json

# Linux/Mac
rm ~/.blender_game_tools_keys.json
```

### **"Tests failing after update"**

**Cause**: Cached `.pyc` files from old version

**Solution**:
```bash
# Delete all Python cache
python -c "import pathlib; [p.unlink() for p in pathlib.Path('.').rglob('*.pyc')]"
python -c "import pathlib; [p.rmdir() for p in pathlib.Path('.').rglob('__pycache__')]"

# Re-run tests
python test_addon_integrity.py
```

---

## ✅ Verification Checklist

After updating to v5.1.0, verify:

- [ ] Add-on loads without errors
- [ ] All 219 tests pass (`python test_addon_integrity.py`)
- [ ] Settings panel shows "AI Advisor – FREE via Mossy"
- [ ] No LLM/OpenAI fields visible in UI
- [ ] Mossy connection section visible
- [ ] All mesh/export features work normally
- [ ] (Optional) Mossy AI features work when enabled

---

## 📞 Need Help?

### **For Migration Issues**
- **GitHub Issues**: [Report a problem](https://github.com/POINTYTHRUNDRA654/Blender-add-on/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/POINTYTHRUNDRA654/Blender-add-on/discussions)

### **For Mossy Setup**
- See `README.md` → "FREE AI Setup (Mossy)"
- Check Mossy documentation (link in README)

---

## 🎉 Benefits of This Change

### **For Users**
✅ **Zero Cost** - No more API charges  
✅ **Privacy** - Your data never leaves your machine  
✅ **Simplicity** - No API keys to manage  
✅ **Performance** - Local AI is faster  
✅ **Reliability** - No internet required for AI

### **For the Project**
✅ **Blender Extension Platform Ready** - No paid service dependencies  
✅ **Open Source Friendly** - 100% free stack  
✅ **User Trust** - Privacy-first approach  
✅ **Maintenance** - Simpler codebase  
✅ **Community** - More accessible to everyone

---

## 📊 Version Comparison

| Aspect | v5.0.x (Old) | v5.1.0 (New) |
|--------|--------------|--------------|
| **AI Provider** | OpenAI / Custom LLM | Mossy (Free, Local) |
| **Cost** | Pay per API call | 100% Free |
| **Privacy** | Data sent to cloud | 100% Local |
| **Setup** | API keys required | No keys (just Mossy token) |
| **Internet** | Required for AI | Not required |
| **Blender Platform** | Requires paid services | ✅ Ready to publish |
| **Code Complexity** | Higher (dual AI paths) | Simpler (Mossy only) |

---

## 🔮 Future Plans

- [ ] Enhance Mossy AI capabilities
- [ ] Add more local AI models (via Mossy)
- [ ] Expand knowledge base
- [ ] Improve Mossy desktop app integration
- [ ] Community-contributed AI workflows

**All future AI features will remain FREE and LOCAL via Mossy.**

---

**Questions? Issues? Let us know on GitHub!**

*This migration ensures 100% free, privacy-first AI for all users.*
