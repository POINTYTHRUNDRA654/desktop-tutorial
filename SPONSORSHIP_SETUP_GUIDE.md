# Sponsorship Setup Guide for Mossy

This guide will walk you through setting up all the sponsorship/donation platforms for the Mossy project.

## Quick Start Checklist

- [ ] Set up GitHub Sponsors
- [ ] Create Buy Me a Coffee account
- [ ] Create Ko-fi account
- [ ] Set up PayPal.me
- [ ] Update FUNDING.yml
- [ ] Update DonationSupport.tsx with real URLs
- [ ] Test all links

## Platform Setup Instructions

### 1. GitHub Sponsors (Recommended)

GitHub Sponsors is the most integrated option for open-source projects.

**Steps:**
1. Go to https://github.com/sponsors
2. Click "Join the waitlist" or "Set up GitHub Sponsors"
3. Complete the application:
   - Add banking information
   - Set up sponsorship tiers
   - Write your profile
4. Wait for approval (usually 1-3 days)
5. Once approved, your username will be `POINTYTHRUNDRA654`

**Recommended Tiers:**
- $1/month - Coffee Supporter
- $5/month - Mod Enthusiast  
- $10/month - Pro Modder
- $25/month - Team Support
- $100/month - Studio Sponsor

**After Setup:**
- Update `.github/FUNDING.yml` line 5: `github: POINTYTHRUNDRA654`
- Update `DonationSupport.tsx` line 126: Replace URL

---

### 2. Buy Me a Coffee

Simple one-time and monthly donation platform.

**Steps:**
1. Go to https://www.buymeacoffee.com/
2. Click "Start my page"
3. Choose a username (e.g., "mossy" or "mossyai")
4. Set up your profile:
   - Add profile photo
   - Write bio
   - Set coffee price ($3-5 recommended)
5. Enable memberships for monthly support

**After Setup:**
- Your URL will be: `https://buymeacoffee.com/YOUR_USERNAME`
- Update `.github/FUNDING.yml`: Add to custom array
- Update `DonationSupport.tsx` line 88: Replace URL

---

### 3. Ko-fi

Similar to Buy Me a Coffee, popular in creative communities.

**Steps:**
1. Go to https://ko-fi.com/
2. Click "Sign Up"
3. Choose username (e.g., "mossy")
4. Set up profile:
   - Upload avatar
   - Write description
   - Set donation amount
5. Choose between:
   - One-time donations only (free)
   - Ko-fi Gold ($6/month - enables monthly subscriptions)

**After Setup:**
- Your URL will be: `https://ko-fi.com/YOUR_USERNAME`
- Update `.github/FUNDING.yml`: Uncomment and add `ko_fi: YOUR_USERNAME`
- Update `DonationSupport.tsx` line 107: Replace URL

---

### 4. PayPal

Direct payment option, widely trusted.

**Steps:**
1. Go to https://www.paypal.com/paypalme/
2. Create your PayPal.Me link
3. Choose your username (e.g., "mossydev" or "mossyai")
4. Verify your account if needed

**After Setup:**
- Your URL will be: `https://paypal.me/YOUR_USERNAME`
- Update `.github/FUNDING.yml`: Add to custom array
- Update `DonationSupport.tsx` line 145: Replace URL

---

### 5. Patreon (Optional)

Best for ongoing monthly support with tiered rewards.

**Steps:**
1. Go to https://www.patreon.com/
2. Click "Create on Patreon"
3. Set up creator page
4. Create membership tiers:
   - $3/month - Supporter
   - $10/month - Pro Modder
   - $25/month - Studio Tier
5. Set up rewards for each tier

**After Setup:**
- Your URL will be: `https://patreon.com/YOUR_USERNAME`
- Update `.github/FUNDING.yml`: Uncomment and add `patreon: YOUR_USERNAME`
- Add to `DonationSupport.tsx` if desired

---

## File Updates Required

### 1. Update `.github/FUNDING.yml`

After setting up accounts, update the file:

```yaml
# Example final version
github: POINTYTHRUNDRA654
ko_fi: mossy
custom: ['https://buymeacoffee.com/mossy', 'https://paypal.me/mossy']
```

### 2. Update `src/renderer/src/DonationSupport.tsx`

Replace placeholder URLs (lines 88, 107, 126, 145) with your actual URLs:

```typescript
// Line 88 - Buy Me a Coffee
href="https://buymeacoffee.com/YOUR_ACTUAL_USERNAME"

// Line 107 - Ko-fi
href="https://ko-fi.com/YOUR_ACTUAL_USERNAME"

// Line 126 - GitHub Sponsors
href="https://github.com/sponsors/POINTYTHRUNDRA654"

// Line 145 - PayPal
href="https://paypal.me/YOUR_ACTUAL_USERNAME"
```

### 3. Update README.md

Add sponsor badges to your README:

```markdown
## Support This Project

[![GitHub Sponsors](https://img.shields.io/github/sponsors/POINTYTHRUNDRA654?style=for-the-badge)](https://github.com/sponsors/POINTYTHRUNDRA654)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/YOUR_USERNAME)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/YOUR_USERNAME)

Mossy is free and open-source. Your support helps cover AI API costs and continued development!
```

---

## Testing Your Setup

After updating all files:

1. **Test GitHub Button:**
   - Push your changes to GitHub
   - Visit your repository
   - Look for "Sponsor" button near the top
   - Click it to verify it works

2. **Test In-App Links:**
   - Run Mossy: `npm run dev`
   - Navigate to Support Mossy page
   - Click each donation button
   - Verify each opens the correct URL

3. **Test All Platforms:**
   - Try making a test donation on each
   - Verify you receive notifications
   - Check that payment processing works

---

## Recommended Approach

If you're just starting, I recommend this order:

1. **Start with GitHub Sponsors** (best integration, no fees)
2. **Add Buy Me a Coffee** (easy one-time donations)
3. **Add PayPal** (widely trusted)
4. **Later add Ko-fi or Patreon** (if you want more options)

You don't need all platforms - even just GitHub Sponsors is fine!

---

## Current Status

✅ **Already Done:**
- DonationSupport.tsx component created
- Route configured (/support)
- Sidebar link added
- FUNDING.yml template created

🚧 **You Need To Do:**
- Create accounts on your chosen platforms
- Get your actual usernames/URLs
- Update FUNDING.yml with real info
- Update DonationSupport.tsx URLs
- Test everything works

---

## Quick Commands

```bash
# After updating your sponsorship accounts:

# 1. Update FUNDING.yml
nano .github/FUNDING.yml

# 2. Update DonationSupport component
nano src/renderer/src/DonationSupport.tsx

# 3. Test the app
npm run dev

# 4. Commit and push
git add .github/FUNDING.yml src/renderer/src/DonationSupport.tsx
git commit -m "Add sponsorship links"
git push
```

---

## Need Help?

If you run into issues:

1. **GitHub Sponsors not showing?**
   - Make sure FUNDING.yml is in `.github/` folder
   - Check the file has correct YAML syntax
   - Wait a few minutes for GitHub to process

2. **Links not opening?**
   - Check for typos in URLs
   - Verify `target="_blank"` is set
   - Test with browser dev tools

3. **Platform account issues?**
   - Each platform has support documentation
   - Most have Discord/email support

---

## Privacy & Transparency

Consider adding to your README:

- Where donations go (development, hosting, etc.)
- That Mossy will always be free
- That donations are appreciated but optional
- Monthly transparent reports (optional)

Example:
> "Mossy is and will always be completely free. Donations help cover:
> - AI API costs (OpenAI, embeddings)
> - Development time
> - Hosting and infrastructure
> - Future feature development
>
> Every dollar goes directly to making Mossy better for the Fallout 4 modding community."

---

## Summary

1. Create accounts on chosen platforms
2. Get your usernames/URLs  
3. Update `.github/FUNDING.yml`
4. Update `DonationSupport.tsx`
5. Test everything
6. Push to GitHub
7. Share with your community!

The infrastructure is ready - you just need to connect your actual accounts!
