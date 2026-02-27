# MOSSY Testing Guide

## Quick Start
- **Dev Server**: `npm run dev` (runs on http://localhost:5176)
- **Build**: `npm run build`
- **Stop Dev**: Press `Ctrl+C` in the terminal

---

## Testing Checklist

### 1. Navigation & Routing
- [ ] App loads on http://localhost:5176
- [ ] Home page displays with dark theme (black background, emerald accents)
- [ ] Sidebar is visible on left with menu items
- [ ] Click menu items and verify pages load without crashing
  - [ ] "Knowledge Base" navigates to /knowledge-base
  - [ ] "Mossy Quick Actions" navigates to /quick-actions
  - [ ] "Live Chat" shows maintenance page (not crashing)
  - [ ] "Settings" navigates to /settings
  - [ ] "About" navigates to /about

### 2. Back Navigation
- [ ] Every page has a back button (← icon)
- [ ] Back button returns to home page
- [ ] Back button works from every route

### 3. Error Handling
- [ ] Verify DevTools opens (F12)
- [ ] Check Console for any red errors on each page
- [ ] Click links that might not exist - should show error page with back button
- [ ] Refresh page with Ctrl+R - should reload without crashing

### 4. Responsive Design
- [ ] Resize browser window - layout should adapt
- [ ] Sidebar should be visible at all sizes (or toggle on mobile)
- [ ] Text should be readable at different zoom levels (Ctrl++ / Ctrl+-)

### 5. Live Voice Chat (Maintenance Mode)
- [ ] Navigate to "Live Chat" in sidebar
- [ ] Should show "Feature Under Maintenance" message
- [ ] Should NOT crash or show blank page
- [ ] Back button should be visible and functional
- [ ] "Return to Home" button should work

### 6. Knowledge Base
- [ ] Page loads without errors
- [ ] Can search for information
- [ ] Results display properly
- [ ] Back button returns to home

### 7. Quick Actions
- [ ] Page loads without errors
- [ ] Actions are clickable
- [ ] Each action executes without crashes
- [ ] Feedback is displayed (success/error messages)

### 8. Settings
- [ ] Page loads without errors
- [ ] Can adjust settings (if available)
- [ ] Changes persist if saved
- [ ] Back button works

### 9. Performance
- [ ] Pages load within 2-3 seconds
- [ ] No lag when clicking buttons
- [ ] No memory leaks (check DevTools > Memory tab)
- [ ] Console has no repeated errors

---

## Testing Environment

### Browser DevTools
1. Press `F12` to open DevTools
2. Check **Console** tab for errors (red text = problems)
3. Check **Network** tab for failed requests (red entries)
4. Check **Application** tab for:
   - LocalStorage (app data saved locally)
   - SessionStorage (temporary data)
   - IndexedDB (if used)

### Dev Server Logs
- Watch the terminal where you ran `npm run dev`
- Look for:
  - Build errors (red text)
  - File changes being watched
  - Port number (currently 5176)

---

## Common Issues & Solutions

### Issue: Blank Page
**Solution**: 
- Check browser console (F12) for errors
- Look for red errors in DevTools Console
- Refresh page with Ctrl+R
- Clear cache: Ctrl+Shift+Delete

### Issue: Sidebar Not Visible
**Solution**:
- Check if page is responsive width
- Check CSS is loaded (DevTools > Network tab, look for .css files)
- Check for JavaScript errors in Console

### Issue: Component Not Loading
**Solution**:
- Check DevTools Console for import errors
- Check that all imported files exist
- Verify file names match exactly (case-sensitive on Linux/Mac)

### Issue: API Errors
**Solution**:
- Check .env file has correct API keys
- Check internet connection
- Look at Network tab to see failed requests

---

## Testing a Feature End-to-End

### Example: Testing Knowledge Base
1. Open DevTools (F12)
2. Go to home page
3. Click "Knowledge Base" in sidebar
4. Wait for page to load
5. Search for a term
6. Verify results appear
7. Click a result
8. Verify content displays
9. Click back button
10. Verify you're back on home
11. Check Console for any errors

### Example: Testing Error Recovery
1. Navigate to a page
2. Try to trigger an error:
   - Disconnect internet
   - Click invalid links
   - Refresh while loading
3. Verify:
   - Error message displays (not blank page)
   - Back button is visible
   - You can navigate away
4. Reconnect internet
5. Verify page works again

---

## What to Test Today

### Priority 1 (Critical Path)
- [ ] App loads without crashing
- [ ] Back button works on every page
- [ ] No red errors in console
- [ ] Can navigate between all pages

### Priority 2 (Core Features)
- [ ] Knowledge Base searches work
- [ ] Quick Actions execute properly
- [ ] Live Chat shows maintenance message (doesn't crash)

### Priority 3 (Polish)
- [ ] Styling looks correct
- [ ] Buttons respond to clicks
- [ ] Text is readable
- [ ] Layout is responsive

---

## Reporting Issues

When you find a problem, note:
1. **URL**: What page were you on? (e.g., http://localhost:5176/knowledge-base)
2. **Steps to Reproduce**: Exactly what did you click?
3. **Expected**: What should happen?
4. **Actual**: What actually happened?
5. **Console Errors**: Any red text in DevTools Console?
6. **Screenshot**: Useful if visual issue

Example:
```
URL: http://localhost:5176/live
Steps: Clicked "Live Chat" in sidebar
Expected: Feature page loads normally
Actual: Blank white page, can't click back
Console Error: "Failed to load LiveContext: TypeError..."
```

---

## Testing Session Template

Use this to track your testing:

```
Date: January 13, 2026
Time Started: 3:30 PM
Dev Server: npm run dev (http://localhost:5176)

Tests Completed:
- Navigation: ✅ All routes working
- Back Button: ✅ Works from /live page
- Live Chat: ✅ Shows maintenance message
- Console: ✅ No red errors
- Performance: ✅ Pages load in <2 sec

Issues Found:
- (none so far)

Next Steps:
- Test Knowledge Base search
- Test Quick Actions
- Test Settings page
```

---

## After Testing

1. Note any issues in the console log
2. Take screenshots of errors
3. Save the DevTools Console output:
   - Right-click in Console
   - "Save as..." 
   - Name it with the test case
4. Report findings for each priority level
