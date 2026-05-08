# Sponsorship Quick Start Card

## ✅ What's Already Set Up

- ✅ **FUNDING.yml** - GitHub Sponsors button configuration file
- ✅ **DonationSupport.tsx** - In-app donation page with links
- ✅ **Sidebar Navigation** - "Support Mossy" link in app menu
- ✅ **README Badges** - Sponsor badges in README.md
- ✅ **Route Configuration** - `/support` route active in app

## 🚧 What You Need To Do

### 1. Create Platform Accounts (Choose What You Want)

| Platform | Recommended | Setup Time | Notes |
|----------|-------------|------------|-------|
| **GitHub Sponsors** | ⭐ YES | 15 min + approval | Best for open source, 0% fees |
| **Buy Me a Coffee** | ⭐ YES | 5 min | Easy one-time donations |
| **Ko-fi** | Optional | 5 min | Similar to BMAC |
| **PayPal** | Optional | 5 min | Direct payments |
| **Patreon** | Optional | 20 min | Best for monthly tiers |

### 2. Update Configuration Files

After creating accounts, you need to update 2 files:

#### File 1: `.github/FUNDING.yml`
```yaml
github: POINTYTHRUNDRA654
ko_fi: your-username  # If using Ko-fi
custom: ['https://buymeacoffee.com/your-username']  # Add your actual URLs
```

#### File 2: `src/renderer/src/DonationSupport.tsx`
Replace these URLs (lines 88, 107, 126, 145):
- Buy Me a Coffee: Line 88
- Ko-fi: Line 107  
- GitHub Sponsors: Line 126
- PayPal: Line 145

### 3. Test Everything

```bash
# Run the app
npm run dev

# Navigate to: http://localhost:5174/#/support
# Click each button to verify links work
```

### 4. Push to GitHub

```bash
git add .github/FUNDING.yml src/renderer/src/DonationSupport.tsx README.md
git commit -m "Set up sponsorship links"
git push
```

## 📋 Step-by-Step Checklist

Use this checklist to track your progress:

- [ ] **Step 1:** Create GitHub Sponsors account
  - [ ] Go to https://github.com/sponsors
  - [ ] Apply for GitHub Sponsors
  - [ ] Wait for approval (1-3 days)
  - [ ] Set up payment information

- [ ] **Step 2:** Create Buy Me a Coffee account
  - [ ] Go to https://www.buymeacoffee.com/
  - [ ] Sign up with username (e.g., "mossy")
  - [ ] Set up profile and pricing

- [ ] **Step 3:** (Optional) Create Ko-fi account
  - [ ] Go to https://ko-fi.com/
  - [ ] Sign up with username
  - [ ] Configure profile

- [ ] **Step 4:** (Optional) Set up PayPal.Me
  - [ ] Go to https://www.paypal.com/paypalme/
  - [ ] Create your PayPal.Me link
  - [ ] Test it works

- [ ] **Step 5:** Update `.github/FUNDING.yml`
  - [ ] Add your GitHub username (if approved)
  - [ ] Add Ko-fi username (if using)
  - [ ] Add custom URLs array with BMAC, PayPal, etc.

- [ ] **Step 6:** Update `DonationSupport.tsx`
  - [ ] Replace Buy Me a Coffee URL (line 88)
  - [ ] Replace Ko-fi URL (line 107)
  - [ ] Replace GitHub Sponsors URL (line 126)
  - [ ] Replace PayPal URL (line 145)

- [ ] **Step 7:** Test in development
  - [ ] Run `npm run dev`
  - [ ] Go to Support page
  - [ ] Click each button
  - [ ] Verify correct pages open

- [ ] **Step 8:** Commit and push
  - [ ] Git add files
  - [ ] Git commit with message
  - [ ] Git push to GitHub

- [ ] **Step 9:** Verify GitHub button
  - [ ] Visit repository on GitHub
  - [ ] Check for "Sponsor" button
  - [ ] Click to verify it works

- [ ] **Step 10:** Share with community
  - [ ] Announce on Discord/Reddit
  - [ ] Tweet about it
  - [ ] Add to Nexus Mods page

## 🎯 Minimum Viable Setup (10 minutes)

If you want to start ASAP, just do:

1. Create GitHub Sponsors account
2. Update FUNDING.yml with: `github: POINTYTHRUNDRA654`
3. Update line 126 in DonationSupport.tsx
4. Push to GitHub

That's it! You can add other platforms later.

## 📚 Need More Help?

- **Full Guide:** See [SPONSORSHIP_SETUP_GUIDE.md](SPONSORSHIP_SETUP_GUIDE.md)
- **Monetization Strategy:** See [MONETIZATION_STRATEGY.md](MONETIZATION_STRATEGY.md)

## 🎉 After Setup

Once everything is live:

1. Test all links work
2. Share with your users
3. Thank supporters publicly
4. Consider regular updates on how funds are used
5. Add supporter acknowledgments (optional)

## 💡 Pro Tips

- **Be transparent:** Tell users where money goes
- **Say thanks:** Acknowledge supporters
- **Make it optional:** Never pressure users
- **Show value:** Explain what Mossy does
- **Be patient:** Building support takes time

## ⚡ Quick Reference URLs

Here are direct links to create accounts:

- GitHub Sponsors: https://github.com/sponsors
- Buy Me a Coffee: https://www.buymeacoffee.com/
- Ko-fi: https://ko-fi.com/
- PayPal.Me: https://www.paypal.com/paypalme/
- Patreon: https://www.patreon.com/

---

**Remember:** The infrastructure is ready. You just need to connect your accounts and update the URLs. Should take 15-30 minutes total!
