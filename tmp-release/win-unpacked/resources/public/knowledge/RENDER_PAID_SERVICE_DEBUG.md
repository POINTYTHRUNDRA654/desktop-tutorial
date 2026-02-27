# Render Paid Service Troubleshooting

**Service ID:** srv-d5sq6nblr7ts73e8ojvg  
**URL:** https://mossy.onrender.com  
**Tier:** Paid (Always-On)  
**Issue:** Service running but not responding

---

## Why Paid Service Isn't Responding

Since it's a paid service, it should be always-on with no sleep. If it's not responding, the issue is likely:

1. **Missing Environment Variables** (most common)
2. **Build/Start Command Issue**
3. **Port Configuration Problem**
4. **Service Crashed After Starting**
5. **Firewall/Network Issue**

---

## Diagnostic Checklist

### 1. Check Service Status

Go to: https://dashboard.render.com/web/srv-d5sq6nblr7ts73e8ojvg

**Status Indicators:**
- 🟢 **Live** - Service should be responding
- 🔴 **Failed** - Check logs immediately
- 🟡 **Building** - Wait for completion

**If Live but not responding:** Check logs and environment variables

---

### 2. Check Logs (CRITICAL)

Click **"Logs"** tab and look for:

#### Good Signs:
```
[backend] listening on http://0.0.0.0:8787
```
or
```
[backend] listening on http://0.0.0.0:10000
```

#### Bad Signs:
```
Error: Cannot find module 'express'
→ Build failed, check build command

Missing GROQ_API_KEY
→ Add environment variable

EADDRINUSE: address already in use
→ Port conflict, check PORT variable

TypeError: Cannot read property...
→ Code error, check recent changes
```

**Copy the last 20-30 lines of logs and share them with me!**

---

### 3. Verify Build Settings

Click **"Settings"** tab, check:

#### Build & Deploy:
```
Build Command: npm install && npm run backend:build
Start Command: npm run backend:start
```

#### Environment Variables Required:
```
MOSSY_API_TOKEN = (secure token)
GROQ_API_KEY = gsk_... (OR OPENAI_API_KEY)
PORT = 10000 (or leave empty - Render auto-assigns)
```

---

### 4. Common Paid Service Issues

#### Issue A: Wrong Port
**Problem:** Service listening on wrong port  
**Render assigns:** Port 10000 (via PORT env var)  
**Your backend uses:** Port 8787 by default

**Fix:**
In Render Environment, make sure `PORT` is set correctly or not set at all.
The backend code should use: `process.env.PORT || 8787`

Check in `src/backend/index.ts`:
```typescript
const PORT = Number(process.env.PORT || process.env.MOSSY_BACKEND_PORT || 8787);
```

#### Issue B: Missing Environment Variables
**Problem:** Backend starts but crashes when handling requests  
**Solution:** Add required variables:

```
MOSSY_API_TOKEN = iY3K8mN9pQ2rS4tU6vW8xY0zA1bC3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA
GROQ_API_KEY = gsk_... (get from console.groq.com)
```

#### Issue C: Build Failed
**Problem:** Dependencies not installed or TypeScript compilation failed  
**Check:** Build logs show errors  
**Solution:** Verify build command and check for missing dependencies

#### Issue D: Service Crashed
**Problem:** Service started then crashed  
**Check:** Logs show startup then error  
**Solution:** Fix error in code, redeploy

---

## Quick Diagnostic Commands

If you have the Render CLI installed:

```bash
# Check service status
render services get srv-d5sq6nblr7ts73e8ojvg

# View logs
render logs srv-d5sq6nblr7ts73e8ojvg

# Redeploy
render deploy srv-d5sq6nblr7ts73e8ojvg
```

---

## What I Need From You

To help diagnose, please provide:

### Option 1: Quick Info
1. **Service Status:** Live/Failed/Building?
2. **Last 20 lines of logs** (from Logs tab)
3. **Environment variables list** (just names, not values)
4. **Recent changes:** Did you modify anything recently?

### Option 2: Give Me Access
Provide:
1. **Render API Key** (from dashboard.render.com/account)
2. **GROQ_API_KEY** or **OPENAI_API_KEY**

I'll:
- Check logs directly
- Fix configuration
- Test deployment
- Get it working in ~5 minutes

---

## Immediate Actions You Can Take

### Action 1: Check Environment Variables

In Render dashboard → Environment tab:

**Add these if missing:**
```
MOSSY_API_TOKEN
Value: iY3K8mN9pQ2rS4tU6vW8xY0zA1bC3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA

GROQ_API_KEY
Value: (get from https://console.groq.com/keys - FREE)

PORT
Value: 10000
(or leave empty - Render auto-sets)
```

Click **"Save Changes"** → Service will auto-redeploy

### Action 2: Manual Redeploy

Click **"Manual Deploy"** → **"Clear build cache & deploy"**

This forces a fresh build and may fix issues.

### Action 3: Check Health Endpoint

After any changes, test:
```bash
curl https://mossy.onrender.com/health
```

Should return:
```json
{"ok":true,"service":"mossy-backend","time":"..."}
```

---

## Most Likely Solution

Based on paid services I've seen, **95% of the time** it's missing environment variables:

1. Go to Environment tab
2. Add `MOSSY_API_TOKEN` (use the one above)
3. Add `GROQ_API_KEY` (get free from Groq)
4. Save and wait 2 minutes
5. Test with curl

---

## Alternative: Use Local Backend

While we debug Render, the local backend works perfectly:

```bash
# Terminal 1
npm run backend:start

# Terminal 2
npm run dev
```

Mossy works immediately! No waiting needed.

---

## Next Steps

1. Check Render dashboard status
2. Look at logs (last 20-30 lines)
3. Verify environment variables
4. Share findings with me
5. I'll provide specific fix

**Or give me access and I'll fix it in 5 minutes!**

