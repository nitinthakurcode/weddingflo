# WeddingFlow Pro - PWA Implementation Guide

## 📱 Progressive Web App Features

Your WeddingFlow Pro app now includes complete PWA (Progressive Web App) functionality with offline support!

## ✅ What's Been Implemented

### 1. PWA Manifest (`/src/app/manifest.ts`)
- App name, description, and metadata
- App icons in all required sizes (72px - 512px)
- Display mode: Standalone (appears like a native app)
- Theme color: #4f46e5 (Indigo)
- App shortcuts for quick access

### 2. Service Worker (`/public/sw.js`)
- **Workbox-powered** caching strategies:
  - **Cache-first** for images (30 days)
  - **Network-first** for API calls (3s timeout fallback)
  - **Stale-while-revalidate** for CSS/JS
  - **Network-only** for authentication (Clerk)
- Background sync support
- Offline fallback support

### 3. Offline Storage (`/src/lib/offline/`)
- **IndexedDB** for local data storage
- Object stores: guests, vendors, budgets, offlineQueue, metadata
- Caches up to 100MB of data
- Automatic cleanup of old data

### 4. Offline Queue System
- Queues actions while offline (check-ins, edits, etc.)
- Automatic sync when back online
- Retry failed actions (up to 3 times)
- Visual feedback for pending actions

### 5. Sync Manager
- Background synchronization
- Progress tracking
- Error handling and recovery
- Data staleness detection

### 6. UI Components
- **Offline Indicator** - Shows banner when offline
- **Sync Status** - Real-time sync progress
- **Install Prompt** - Encourages app installation
- **Compact indicators** for header/navbar

## 🚀 Testing the PWA

### Prerequisites
1. **HTTPS or localhost** - PWAs require secure connection
2. **Modern browser** - Chrome 90+, Edge 90+, Safari 14+
3. **Icons** - Generate icons using `/public/icons/generate-icons.html`

### Step 1: Generate Icons

1. Open in browser: `http://localhost:3000/icons/generate-icons.html`
2. Click "Generate All Icons"
3. Download each icon using the "Download" buttons
4. Save all icons to `/public/icons/` folder

**Alternative:** Use [RealFaviconGenerator](https://realfavicongenerator.net/)

### Step 2: Access Manifest

1. Open your app: `http://localhost:3000`
2. Open DevTools (F12) → Application tab
3. Click "Manifest" in left sidebar
4. Verify manifest loads correctly
5. Check: `http://localhost:3000/manifest.json`

**Expected:** Manifest should show app name, icons, and theme color

### Step 3: Register Service Worker

1. In DevTools → Application → Service Workers
2. Refresh the page
3. Look for "sw.js" registered
4. Status should show "activated and is running"

**Console Logs to Look For:**
```
✅ IndexedDB initialized
✅ Service Worker registered successfully
✅ PWA initialized successfully
```

### Step 4: Test Offline Mode

#### Desktop Testing:
1. Open DevTools (F12) → Network tab
2. Check "Offline" checkbox
3. Refresh the page
4. App should still load from cache
5. Try navigating to different pages
6. Perform an action (e.g., check-in guest)
7. See "You are offline" banner
8. Uncheck "Offline"
9. Actions should auto-sync

#### Mobile Testing:
1. Open app on phone (same WiFi)
2. Go to: `http://192.168.29.93:3000`
3. Enable Airplane mode
4. Navigate the app
5. Try checking in a guest
6. Disable Airplane mode
7. Watch data sync automatically

### Step 5: Test Installation

#### Desktop (Chrome/Edge):
1. Open app in Chrome
2. Look for install icon (➕) in address bar
3. Click to install
4. App opens in standalone window
5. Check Start Menu/Applications folder

#### Mobile (Android):
1. Open app in Chrome
2. Tap menu (⋮) → "Add to Home screen"
3. Name the app and add
4. App icon appears on home screen
5. Tap icon - opens like native app

#### Mobile (iOS/Safari):
1. Open app in Safari
2. Tap Share button
3. Scroll down → "Add to Home Screen"
4. Name the app and add
5. App icon appears on home screen

### Step 6: Test Offline Queue

1. Go offline (DevTools → Network → Offline)
2. Go to `/check-in`
3. Upload a QR code image to check in
4. See "You are offline" banner
5. Action queued (check console)
6. Go back online
7. Actions automatically sync
8. See success notification

### Step 7: Test Caching Strategies

#### Test Image Caching:
1. Load a page with images
2. Open DevTools → Network tab
3. Refresh page
4. Images should load from "Service Worker"
5. Go offline → images still load

#### Test API Caching:
1. Load guest list
2. Go offline
3. Refresh page
4. Guest list loads from cache
5. Try to add new guest → queued for sync

## 📊 Monitoring & Debugging

### DevTools - Application Tab

1. **Manifest** - View manifest.json
2. **Service Workers** - View SW status, update, unregister
3. **Storage** - View cached data:
   - Cache Storage - Workbox caches
   - IndexedDB - WeddingFlowDB
   - Local Storage - Settings
4. **Background Services** - Background Sync events

### Console Commands

```javascript
// Check if service worker is active
navigator.serviceWorker.controller

// Get registration
navigator.serviceWorker.getRegistration()

// Check online status
navigator.onLine

// View IndexedDB
// Open DevTools → Application → IndexedDB → WeddingFlowDB

// Get database info
import { getDatabaseInfo } from '@/lib/offline/indexed-db'
await getDatabaseInfo()

// Get queue stats
import { getQueueStats } from '@/lib/offline/offline-queue'
await getQueueStats()

// Manual sync
import { syncNow } from '@/lib/offline/sync-manager'
await syncNow()
```

### Useful DevTools Features

1. **Clear Site Data**
   - Application → Clear storage
   - Clears: Service workers, cache, IndexedDB

2. **Simulate Offline**
   - Network → Throttling → Offline

3. **Force Update SW**
   - Application → Service Workers → Update

4. **Skip Waiting**
   - Application → Service Workers → skipWaiting

## 🎯 Testing Checklist

- [ ] Icons generated and accessible
- [ ] Manifest loads at `/manifest.json`
- [ ] Service worker registers successfully
- [ ] App works offline
- [ ] Offline banner appears when offline
- [ ] Actions queue when offline
- [ ] Actions sync when back online
- [ ] Install prompt appears (desktop)
- [ ] Can install to home screen (mobile)
- [ ] Standalone mode works correctly
- [ ] Background sync works
- [ ] Images load from cache when offline
- [ ] API fallbacks work when offline

## 🐛 Troubleshooting

### Service Worker Not Registering

**Problem:** SW doesn't show in DevTools

**Solutions:**
1. Check console for errors
2. Ensure `/public/sw.js` exists
3. Clear cache and hard refresh (Ctrl+Shift+R)
4. Check browser supports Service Workers
5. Ensure running on localhost or HTTPS

### Install Prompt Not Showing

**Problem:** Install button doesn't appear

**Solutions:**
1. Generate all required icons
2. Verify manifest is valid
3. Ensure app meets PWA criteria:
   - HTTPS or localhost
   - Valid manifest
   - Service worker registered
   - Meets engagement heuristics
4. Check browser console for errors
5. Try different browser (Chrome is most reliable)

### Offline Mode Not Working

**Problem:** App doesn't work offline

**Solutions:**
1. Ensure SW is activated (DevTools → Application → SW)
2. Visit pages while online first (to cache them)
3. Check cache storage has data
4. Verify SW caching strategies in code
5. Check console for fetch errors

### Data Not Syncing

**Problem:** Offline actions don't sync when online

**Solutions:**
1. Check IndexedDB has queued actions
2. Verify online status (`navigator.onLine`)
3. Check console for sync errors
4. Manually trigger sync in console
5. Check Background Sync permissions

### Icons Not Showing

**Problem:** App icon blank or incorrect

**Solutions:**
1. Generate all icon sizes (72-512px)
2. Place in `/public/icons/` folder
3. Verify manifest points to correct paths
4. Clear browser cache
5. Uninstall and reinstall app

## 📱 Production Deployment

### Before Deploying:

1. **Generate Production Icons**
   - Use professional logo (minimum 512x512px)
   - Generate all sizes using RealFaviconGenerator
   - Test on multiple devices

2. **Update Manifest**
   - Set production start_url
   - Update app description
   - Add production screenshots

3. **Test on Real Devices**
   - Test on actual Android phones
   - Test on actual iPhones
   - Test on tablets

4. **Performance Testing**
   - Use Lighthouse in DevTools
   - Aim for 90+ PWA score
   - Check performance metrics

5. **HTTPS Required**
   - Deploy to HTTPS-enabled hosting
   - Verify SSL certificate is valid
   - Test service worker on production domain

### Lighthouse Audit

1. Open DevTools → Lighthouse tab
2. Select "Progressive Web App"
3. Run audit
4. Fix any failing criteria
5. Aim for 90-100 score

**Key PWA Criteria:**
- ✅ Registers a service worker
- ✅ Responds with 200 when offline
- ✅ Web app manifest meets requirements
- ✅ Configured for custom splash screen
- ✅ Sets theme color
- ✅ Content is sized correctly for viewport
- ✅ Has a viewport meta tag

## 🔧 Advanced Configuration

### Customize Caching Strategy

Edit `/public/sw.js`:

```javascript
// Adjust cache durations
maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days

// Change cache limits
maxEntries: 100,

// Add new routes
workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith('/my-route'),
  new workbox.strategies.CacheFirst()
);
```

### Customize Offline Queue

Edit `/src/lib/offline/offline-queue.ts`:

```javascript
// Add custom queue handlers
export async function queueCustomAction(data: any): Promise<number> {
  return await queueOfflineAction({
    type: 'custom',
    endpoint: '/api/custom',
    method: 'POST',
    data,
  });
}
```

### Customize Sync Behavior

Edit `/src/lib/offline/sync-manager.ts`:

```javascript
// Change staleness threshold
const isStale = await manager.isDataStale(60); // 60 minutes

// Add custom sync logic
async syncCustomData() {
  // Your custom sync implementation
}
```

## 📚 Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [IndexedDB Documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

## 🎉 Success!

Your WeddingFlow Pro app is now a fully functional Progressive Web App with offline support!

**Key Features:**
- ✅ Installable on desktop and mobile
- ✅ Works offline
- ✅ Queues actions when offline
- ✅ Syncs automatically when online
- ✅ Fast loading with caching
- ✅ Native app-like experience

**Next Steps:**
1. Generate production icons
2. Test on multiple devices
3. Run Lighthouse audit
4. Deploy to production (HTTPS)
5. Monitor PWA metrics

---

For questions or issues, check the troubleshooting section or console logs.
