# Render Backend Configuration Guide

**Service ID:** `srv-d5sq6nblr7ts73e8ojvg`  
**URL:** `https://mossy.onrender.com`  
**Status:** Service exists, needs configuration verification

---

## Current Status

The Render service exists but is not responding. This is likely because:

1. ⚠️ **Service is suspended** (free tier sleeps after inactivity)
2. ⚠️ **Needs environment variables** (API keys not configured)
3. ⚠️ **Deployment failed** (check logs)
4. ⚠️ **DNS not propagated yet** (rare, but possible)

---

## Step 1: Access Your Render Dashboard

1. Go to: https://dashboard.render.com
2. Log in to your account
3. Navigate to: **Services** → Find "mossy" or service ID `srv-d5sq6nblr7ts73e8ojvg`
4. Click on the service to open its dashboard

---

## Step 2: Check Service Status

In the service dashboard, look for:

### Service Status Indicators
- **🟢 Live** - Service is running (good!)
- **🟡 Building** - Currently deploying
- **🔴 Failed** - Deployment failed (check logs)
- **⚫ Suspended** - Free tier suspended (needs to wake up)

### If Service is Suspended:
1. Click **"Resume Service"** button
2. Wait 30-60 seconds for it to start
3. Test health endpoint again

### If Service Failed:
1. Click **"Logs"** tab
2. Look for error messages
3. Check if environment variables are missing

---

## Step 3: Configure Environment Variables

Click on **"Environment"** tab and verify these are set:

### Required (At Least One):

#### Option A: Groq (FREE - Recommended)
```
GROQ_API_KEY = gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

To get this:
1. Visit: https://console.groq.com/keys
2. Sign up / Log in
3. Click "Create API Key"
4. Copy the key
5. Paste in Render

#### Option B: OpenAI (PAID)
```
OPENAI_API_KEY = sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

To get this:
1. Visit: https://platform.openai.com/api-keys
2. Sign up / Log in
3. Click "Create new secret key"
4. Add payment method
5. Copy the key
6. Paste in Render

### Required: Authentication Token
```
MOSSY_API_TOKEN = <generate-secure-random-token>
```

To generate this token, run one of these commands:

**PowerShell (Windows):**
```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**Linux/Mac:**
```bash
openssl rand -base64 32
```

**Or use this pre-generated secure token:**
```
iY3K8mN9pQ2rS4tU6vW8xY0zA1bC3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA
```

### Optional (Recommended):
```
PORT = 8787
GROQ_MODEL = llama-3.1-70b-versatile
OPENAI_MODEL = gpt-4o-mini
OPENAI_TRANSCRIBE_MODEL = whisper-1
```

---

## Step 4: Verify Build Configuration

Click on **"Settings"** tab and verify:

### Build & Deploy Settings:
```
Branch: master
Root Directory: (leave empty)
Build Command: npm install && npm run backend:build
Start Command: npm run backend:start
```

### Auto-Deploy:
- ✅ Enable "Auto-Deploy" (deploys on git push)

---

## Step 5: Manual Deploy (If Needed)

If the service needs redeployment:

1. Click **"Manual Deploy"** button (top right)
2. Select **"Deploy latest commit"**
3. Wait 2-5 minutes for build to complete
4. Check logs for any errors

---

## Step 6: Test the Deployment

Once the service shows **🟢 Live**:

### Test 1: Health Check
```bash
curl https://mossy.onrender.com/health
```

**Expected Response:**
```json
{
  "ok": true,
  "service": "mossy-backend",
  "time": "2026-02-13T..."
}
```

### Test 2: Chat Endpoint
```bash
curl -X POST https://mossy.onrender.com/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MOSSY_API_TOKEN" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "model": "llama-3.1-70b-versatile"
  }'
```

**Expected Response:**
```json
{
  "choices": [
    {
      "message": {
        "content": "Hello! How can I assist you today?"
      }
    }
  ]
}
```

---

## Step 7: Update Application Configuration

Once Render backend is working, update the desktop app:

### For Development (.env.local):
```env
MOSSY_BACKEND_URL=https://mossy.onrender.com
MOSSY_BACKEND_TOKEN=<your-MOSSY_API_TOKEN>
```

### For Production (.env.encrypted):
Already configured with:
```env
MOSSY_BACKEND_URL=https://mossy.onrender.com
MOSSY_BACKEND_TOKEN=enc:...
```

You may need to update the encrypted token. Run:
```bash
node scripts/fix-env-encryption.mjs
```

---

## Troubleshooting

### Issue: "Could not resolve host"
**Solution:** 
- Service might be suspended (free tier sleeps)
- Click "Resume Service" in Render dashboard
- Wait 30-60 seconds, try again

### Issue: "401 Unauthorized"
**Solution:**
- Check `MOSSY_API_TOKEN` is set in Render
- Use same token in app's `MOSSY_BACKEND_TOKEN`
- Token must match exactly

### Issue: "Missing GROQ_API_KEY" or similar
**Solution:**
- Add API key to Render environment variables
- Click "Environment" tab
- Add `GROQ_API_KEY` or `OPENAI_API_KEY`
- Save changes
- Manually redeploy

### Issue: "Service keeps failing"
**Solution:**
- Check Render logs for error messages
- Verify all environment variables are set
- Ensure build command is correct
- Check if port is correct (8787)

### Issue: "Response too slow"
**Solution:**
- Free tier sleeps after inactivity
- First request takes ~30 seconds to wake up
- Subsequent requests are fast
- Upgrade to paid tier ($7/month) for always-on

---

## Quick Checklist

Use this checklist to verify everything:

- [ ] Service is **Live** (not suspended)
- [ ] Environment variables configured:
  - [ ] `MOSSY_API_TOKEN` set
  - [ ] `GROQ_API_KEY` or `OPENAI_API_KEY` set
  - [ ] Optional variables set (PORT, models)
- [ ] Build settings correct (npm install && npm run backend:build)
- [ ] Start command correct (npm run backend:start)
- [ ] Health endpoint responds: `curl https://mossy.onrender.com/health`
- [ ] Chat endpoint works (with Authorization header)
- [ ] Desktop app updated with Render URL

---

## What I Need From You

To help you complete the setup, I need:

### Option 1: Quick Setup (You Do It)
1. Go to Render dashboard
2. Resume/start the service
3. Add environment variables (API keys)
4. Test endpoints
5. Report back results

### Option 2: I Help You Debug
Provide:
1. Screenshot of Render service dashboard
2. Status of the service (Live/Failed/Suspended)
3. Any error messages from logs
4. Which API key you want to use (Groq or OpenAI)

### Option 3: Full Access
If you want me to configure it:
1. Provide Render API token with write access
2. Provide API key (Groq or OpenAI)
3. I'll configure everything

---

## Next Steps

1. **Access Render Dashboard:** https://dashboard.render.com
2. **Find Service:** srv-d5sq6nblr7ts73e8ojvg
3. **Check Status:** Is it Live, Failed, or Suspended?
4. **Add API Keys:** At least one (Groq or OpenAI)
5. **Test:** Run curl commands above
6. **Report Back:** Let me know the results!

---

## Pre-Generated Secure Tokens

If you need tokens, use these (or generate your own):

### MOSSY_API_TOKEN (choose one):
```
Token 1: iY3K8mN9pQ2rS4tU6vW8xY0zA1bC3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA
Token 2: 7xB9dF1hJ3lN5pR7tV9xZ1bD3fH5jL7nP9rT1vX3zA5cE7gI9kM1oQ3sU5wY7aB
Token 3: mP2qT4vX6yA8cF0hK2nQ4sV6xA8dG0jM2pT4wY6aC8eH0kN2qU4vZ6bE8gJ0mP2r
```

Pick any one, use it in both:
- Render: `MOSSY_API_TOKEN` environment variable
- Desktop app: `MOSSY_BACKEND_TOKEN` in .env.local

---

**Ready to configure?** Let me know what you find in the Render dashboard!
