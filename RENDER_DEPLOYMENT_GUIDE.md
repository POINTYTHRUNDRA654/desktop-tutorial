# Render Backend Deployment Instructions

## What You Need to Provide for Render

To deploy the Mossy backend to Render, I need the following information:

### 1. **Render Account Access** (One of these options)
- [ ] **Option A:** Give me your Render dashboard credentials
- [ ] **Option B:** Deploy manually following these instructions
- [ ] **Option C:** Share a Render API token with deploy permissions

### 2. **API Keys** (Required for backend to work)

The backend needs these API keys to communicate with AI services:

#### **Required** (at least one):
- [ ] **GROQ_API_KEY** - For Groq AI (llama-3.1-70b-versatile model)
  - Get from: https://console.groq.com/keys
  - Free tier available with generous limits
  
- [ ] **OPENAI_API_KEY** - For OpenAI (GPT-4o, Whisper transcription)
  - Get from: https://platform.openai.com/api-keys
  - Paid service (pay per use)

#### **Optional** (for enhanced features):
- [ ] **DEEPGRAM_API_KEY** - For faster speech-to-text
  - Get from: https://console.deepgram.com/

### 3. **Security Token** (Will generate)
- [ ] **MOSSY_API_TOKEN** - Backend authentication token
  - I can generate a secure random token
  - Or you can provide one

---

## Deployment Options

### Option 1: I Deploy for You (Recommended)

**What you provide:**
1. Render account credentials or API token
2. At least one AI API key (GROQ_API_KEY or OPENAI_API_KEY)

**What I'll do:**
1. Create Render web service
2. Configure environment variables securely
3. Deploy backend
4. Test connection
5. Update .env.encrypted with the URL

**Time:** ~10 minutes

---

### Option 2: You Deploy Manually

**Step-by-step instructions:**

#### A. Create Render Account
1. Go to https://render.com
2. Sign up/log in
3. Click "New +" → "Web Service"

#### B. Connect Repository
1. Select "GitHub" as source
2. Connect your GitHub account
3. Select repository: `POINTYTHRUNDRA654/desktop-tutorial`
4. Click "Connect"

#### C. Configure Service
```
Name: mossy-backend
Region: Oregon (US West) or closest to you
Branch: master
Root Directory: (leave empty)
Runtime: Node
Build Command: npm install && npm run backend:build
Start Command: npm run backend:start
```

#### D. Add Environment Variables

Click "Environment" tab and add:

**Required:**
```
MOSSY_API_TOKEN=<generate-secure-token-here>
```

**Add at least one:**
```
GROQ_API_KEY=<your-groq-key>
```
OR
```
OPENAI_API_KEY=<your-openai-key>
```

**Optional:**
```
DEEPGRAM_API_KEY=<your-deepgram-key>
GROQ_MODEL=llama-3.1-70b-versatile
OPENAI_MODEL=gpt-4o-mini
OPENAI_TRANSCRIBE_MODEL=whisper-1
PORT=8787
```

#### E. Deploy
1. Click "Create Web Service"
2. Wait for deployment (2-5 minutes)
3. Note your service URL: `https://your-service-name.onrender.com`

#### F. Update Application
1. Update `.env.encrypted` with your Render URL:
   ```
   MOSSY_BACKEND_URL=https://your-service-name.onrender.com
   ```
2. Encrypt the token:
   ```
   MOSSY_BACKEND_TOKEN=enc:<encrypted-value>
   ```
3. Rebuild and test the application

---

### Option 3: Alternative Hosting

If you prefer not to use Render, the backend can be deployed to:

**Cloud Platforms:**
- [ ] Heroku - Similar setup
- [ ] Railway.app - Developer-friendly
- [ ] Fly.io - Global edge network
- [ ] DigitalOcean App Platform
- [ ] AWS Elastic Beanstalk
- [ ] Google Cloud Run
- [ ] Azure App Service

**Self-Hosted:**
- [ ] VPS (DigitalOcean, Linode, Vultr)
- [ ] Docker container
- [ ] Home server with ngrok/CloudFlare tunnel

---

## Generating Secure Tokens

### For MOSSY_API_TOKEN

**Windows PowerShell:**
```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**Linux/Mac:**
```bash
openssl rand -base64 32
```

**Node.js:**
```javascript
require('crypto').randomBytes(32).toString('base64')
```

Save this token securely - you'll need it for:
1. Render environment variable `MOSSY_API_TOKEN`
2. Application .env file `MOSSY_BACKEND_TOKEN`

---

## Cost Estimates

### Render Hosting
- **Free Tier:** 
  - 750 hours/month free compute
  - Spins down after inactivity (cold starts)
  - ✅ Perfect for testing/personal use

- **Paid Tier ($7/month):**
  - Always-on (no cold starts)
  - Better for production

### AI API Costs
- **Groq:** FREE (generous rate limits)
  - Llama 3.1 70B: Fast and free
  - Best option for budget-conscious

- **OpenAI:** Pay per use
  - GPT-4o-mini: ~$0.15/1M input tokens
  - Whisper: ~$0.006/minute
  - Good for quality/features

- **Deepgram:** Free tier available
  - Then pay per use

**Recommendation:** Start with Groq (free) on Render (free tier)

---

## Testing Deployment

After deployment, test with:

```bash
# Test health endpoint
curl https://your-service.onrender.com/health

# Should return:
{"ok":true,"service":"mossy-backend","time":"..."}

# Test chat endpoint
curl -X POST https://your-service.onrender.com/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MOSSY_API_TOKEN" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"model":"llama-3.1-70b-versatile"}'

# Should return AI response
```

---

## Security Notes

### ⚠️ Important Security Practices

1. **Never commit API keys to git**
   - Always use environment variables
   - Use .env.encrypted for packaged builds

2. **Protect MOSSY_API_TOKEN**
   - This authenticates backend requests
   - Share only with your deployed backend
   - Treat like a password

3. **Monitor API usage**
   - Check Groq/OpenAI dashboards regularly
   - Set usage alerts if available
   - Rotate keys if compromised

4. **Rate limiting**
   - Backend has built-in rate limiting
   - 60 requests/minute per IP
   - Protects against abuse

---

## Current Status

✅ **Local Backend:** Running and tested on port 8787
⚠️ **Render Backend:** Not deployed yet (that's why we're here!)
✅ **Application:** Ready to connect to Render once deployed
✅ **Fallback:** Works offline with local API keys if needed

---

## What Happens Next

Once you provide the information above, I will:

1. ✅ Deploy backend to Render
2. ✅ Configure all environment variables securely
3. ✅ Test the deployment
4. ✅ Update .env.encrypted with Render URL
5. ✅ Verify end-to-end connection
6. ✅ Provide you with test instructions

**Estimated time:** 10-15 minutes

---

## Questions?

**Q: Why do I need a backend?**
A: The backend keeps API keys secure on the server instead of in the desktop app. Users can't extract your keys.

**Q: Can I skip Render and use local backend?**
A: Yes! The local backend works great for development. Render is only needed for:
- Distribution to other users
- Not sharing your API keys
- Cloud-based deployment

**Q: What if Render sleeps (free tier)?**
A: The app has fallback mechanisms. First request takes ~30 seconds to wake up, then it's fast.

**Q: Can I use my own API keys locally?**
A: Yes! Put them in .env.local and the app uses them directly, no backend needed.

---

## Ready to Deploy?

Let me know which option you prefer:

1. **"I'll give you access"** → Provide Render credentials + API keys
2. **"I'll do it myself"** → Follow Option 2 instructions above
3. **"Let's skip Render"** → Continue using local backend

Either way, Mossy is already working locally! 🎉
