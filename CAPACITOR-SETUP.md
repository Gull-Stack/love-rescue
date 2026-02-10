# Capacitor iOS Setup — Love Rescue

## Quick Start

```bash
cd frontend

# Build the web app and sync to iOS
npm run build:ios

# Open in Xcode
npm run open:ios
```

In Xcode: select a simulator or device → Run (⌘R).

## Project Structure

```
frontend/
├── capacitor.config.ts      # Capacitor configuration
├── ios/                      # Native Xcode project (gitignored)
├── resources/                # App icons & splash screens
├── src/utils/
│   ├── platform.js           # Platform detection (isNative, isIOS, etc.)
│   └── capacitor-init.js     # Native plugin initialization
```

## Installed Plugins

| Plugin | Purpose |
|--------|---------|
| `@capacitor/core` | Core runtime |
| `@capacitor/ios` | iOS platform |
| `@capacitor/push-notifications` | Native push notifications |
| `@capacitor/haptics` | Haptic feedback |
| `@capacitor/status-bar` | Status bar styling |
| `@capacitor/splash-screen` | Native splash screen |
| `@capacitor/keyboard` | Keyboard behavior |
| `@capacitor/app` | App lifecycle events |

## Backend Changes

### New Database Fields (User model)
- `pushToken` — Native push token (APNs device token)
- `pushPlatform` — `ios`, `android`, or `web`
- `subscriptionSource` — `STRIPE`, `APPLE`, or `NONE`
- `appleReceiptData` — Stored Apple receipt for re-verification

Migration: `20260209210000_add_capacitor_fields`

### New API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/notifications/register` | POST | Store native push token |
| `/api/notifications/send` | POST | Send push (admin only) |
| `/api/subscriptions/status` | GET | Unified subscription status |
| `/api/subscriptions/verify-apple` | POST | Verify Apple IAP receipt |

## Subscription Pricing

| Plan | Web (Stripe) | iOS (Apple IAP) |
|------|-------------|-----------------|
| Monthly | $9.99 | $13.99 (+40%) |
| Yearly | $79.99 | $109.99 (+40%) |

The frontend detects platform via `useAppleIAP()` and shows the appropriate checkout flow.

## Apple Developer Setup Required

### 1. APNs Key (Push Notifications)
1. Go to [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Create a new key with **Apple Push Notifications service (APNs)** enabled
3. Download the `.p8` file
4. Note the **Key ID** and your **Team ID**
5. Set environment variables:
   ```
   APNS_KEY_PATH=./AuthKey_XXXXXXXXXX.p8
   APNS_KEY_ID=XXXXXXXXXX
   APNS_TEAM_ID=XXXXXXXXXX
   ```

### 2. App Store Connect — In-App Purchases
1. Create your app in [App Store Connect](https://appstoreconnect.apple.com)
2. Bundle ID: `com.gullstack.loverescue`
3. Set up auto-renewable subscriptions:
   - Monthly: $13.99
   - Yearly: $109.99
4. Get the **Shared Secret** for receipt verification:
   - App Store Connect → App → In-App Purchases → App-Specific Shared Secret
   - Set: `APPLE_SHARED_SECRET=your_secret_here`

### 3. Provisioning Profiles
1. Register your app ID with Push Notifications capability
2. Create development and distribution provisioning profiles
3. In Xcode: Signing & Capabilities → add Push Notifications

## Environment Variables

Add to your backend `.env`:
```
# Apple IAP
APPLE_SHARED_SECRET=           # App Store Connect shared secret

# APNs (for server-side push — implement with @parse/node-apn)
APNS_KEY_PATH=                 # Path to .p8 key file
APNS_KEY_ID=                   # Key ID from Apple Developer
APNS_TEAM_ID=                  # Your Apple Team ID
```

## Deploy to TestFlight

1. `cd frontend && npm run build:ios`
2. `npm run open:ios` → opens Xcode
3. In Xcode:
   - Set version/build number
   - Product → Archive
   - Distribute App → App Store Connect
4. In App Store Connect: select the build for TestFlight testing

## Development Workflow

```bash
# Make frontend changes, then sync
npm run build:ios

# Or just sync without rebuilding (if only native config changed)
npm run sync:ios

# Open Xcode
npm run open:ios
```

For live reload during development, uncomment the `server.url` in `capacitor.config.ts` and point to your dev server.

## Frontend Integration

```javascript
import { initCapacitor, registerNativePush, hapticFeedback } from './utils/capacitor-init';
import { isNative, useAppleIAP } from './utils/platform';

// In App.js useEffect:
useEffect(() => {
  initCapacitor();
}, []);

// Register push token after login:
const token = await registerNativePush();
if (token) {
  await axios.post('/api/notifications/register', {
    token,
    platform: getPlatform(),
  });
}

// Show correct checkout:
if (useAppleIAP()) {
  // Show StoreKit purchase flow
} else {
  // Show Stripe checkout
}

// Haptic feedback on actions:
await hapticFeedback('Medium');
```
