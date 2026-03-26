# Fix Plan: Apple App Store Rejection (Feb 25, 2026)

## Rejection Details
- **Guideline:** 2.1 - Performance - App Completeness
- **Issue:** Sign Up button returned an error. Sign In with Apple button returned an error.
- **Devices:** iPhone 17 Pro Max (iOS 26.3), iPad Air 11-inch M3 (iPadOS 26.3)
- **Version:** 2.0 (Build 21)

---

## Root Cause Analysis

### Problem 1: Missing Sign In with Apple Entitlement
The iOS Xcode project has **no `.entitlements` file** and the "Sign In with Apple" capability is not added to the project. The Capacitor plugin (`@capacitor-community/apple-sign-in@^7.1.0`) is installed and referenced in `Package.swift`, and the frontend code calls `SignInWithApple.authorize()`, but without the entitlement, iOS blocks the authorization at runtime → instant error.

**Evidence:**
- No `*.entitlements` file anywhere under `frontend/ios/`
- No `CODE_SIGN_ENTITLEMENTS` in `project.pbxproj`
- `capacitor.config.json` lists `"SignInWithApple"` in `packageClassList`
- `Package.swift` includes `CapacitorCommunityAppleSignIn` dependency
- Plugin IS in `package.json`: `"@capacitor-community/apple-sign-in": "^7.1.0"`

### Problem 2: Signup Page Missing Apple Sign In Button
The **Login page** (`frontend/src/pages/Auth/Login.js`) has both Google and Apple sign-in buttons. The **Signup page** (`frontend/src/pages/Auth/Signup.js`) only has Google (`<GoogleLogin>` from `@react-oauth/google`). If the Apple reviewer navigated to Sign Up first, there's no Apple option.

Additionally, the Signup page uses the old `@react-oauth/google` web component while Login uses the native `@codetrix-studio/capacitor-google-auth` — inconsistent behavior on native iOS.

### Problem 3 (Potential): Email Signup Error on Native
The email signup API works (tested via curl — returns 201 with token). However, on native iOS, if the Capacitor webview has any network/CORS issues or if `REACT_APP_API_URL` wasn't baked into the build correctly, it could fail. The build does contain the correct URL (`https://love-rescue-production.up.railway.app/api`), so this is lower probability but worth verifying.

---

## Fix Plan

### Fix 1: Add Sign In with Apple Entitlement (Xcode)

**File to create:** `frontend/ios/App/App/App.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.applesignin</key>
    <array>
        <string>Default</string>
    </array>
</dict>
</plist>
```

**Then in Xcode:**
1. Open `frontend/ios/App/App.xcodeproj`
2. Select the "App" target → Signing & Capabilities
3. Click "+ Capability" → Add "Sign In with Apple"
4. Verify the entitlements file is referenced in Build Settings → `CODE_SIGN_ENTITLEMENTS`
5. Ensure the App ID in Apple Developer portal has "Sign In with Apple" enabled for `com.gullstack.loverescue`

**Apple Developer Portal check:**
- Go to Certificates, Identifiers & Profiles → Identifiers → `com.gullstack.loverescue`
- Ensure "Sign In with Apple" is checked and configured

### Fix 2: Add Apple Sign In Button to Signup Page

**File:** `frontend/src/pages/Auth/Signup.js`

Replace the Google-only social auth section with both Google and Apple buttons, matching the Login page's native approach:

```jsx
// Replace the GoogleLogin import at top:
// REMOVE: import { GoogleLogin } from '@react-oauth/google';
// ADD:
import { isNative } from '../../utils/platform';

// In useAuth destructure, add appleLogin:
const { signup, googleLogin, appleLogin } = useAuth();

// Replace the Google-only section (after the Divider "or") with:
<div style={{ marginBottom: '16px' }}>
  <button
    type="button"
    onClick={async () => {
      setLoading(true);
      setError('');
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        if (!isNative()) {
          await GoogleAuth.initialize({
            clientId: '665328889617-mg6vqui0a5bgkjpj7p85o35lc0f7rnft.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
          });
        }
        const result = await GoogleAuth.signIn();
        const idToken = result.authentication.idToken;
        const data = await googleLogin(idToken);
        if (data.isNewUser) {
          navigate('/assessments');
        } else {
          navigate(redirectTo);
        }
      } catch (err) {
        if (err.message !== 'The user canceled the sign-in flow.') {
          setError(err.response?.data?.error || err.message || 'Google sign-up failed');
        }
      } finally {
        setLoading(false);
      }
    }}
    disabled={loading}
    style={{
      width: '100%',
      height: '48px',
      backgroundColor: '#ffffff',
      border: '1px solid #dadce0',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      cursor: 'pointer',
      marginBottom: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '15px',
      fontWeight: 500,
      color: '#3c4043',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}
  >
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#34A853" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
    Sign up with Google
  </button>

  <button
    type="button"
    onClick={async () => {
      setLoading(true);
      setError('');
      try {
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        const result = await SignInWithApple.authorize({
          clientId: 'com.gullstack.loverescue',
          redirectURI: 'https://loverescue.app',
          scopes: 'email name',
        });
        const fullName = result.response.givenName
          ? { firstName: result.response.givenName, lastName: result.response.familyName }
          : null;
        const data = await appleLogin(result.response.identityToken, fullName);
        if (data.isNewUser) {
          navigate('/assessments');
        } else {
          navigate(redirectTo);
        }
      } catch (err) {
        if (err.message !== 'The user canceled the sign-in flow.' && err.code !== '1001') {
          setError(err.response?.data?.error || err.message || 'Apple sign-up failed');
        }
      } finally {
        setLoading(false);
      }
    }}
    disabled={loading}
    style={{
      width: '100%',
      height: '48px',
      backgroundColor: '#000000',
      border: 'none',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      cursor: 'pointer',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '15px',
      fontWeight: 500,
      color: '#ffffff',
    }}
  >
    <svg width="16" height="20" viewBox="0 0 814 1000">
      <path fill="#ffffff" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57.4-155.5-127.4c-58.8-82-106.6-209.3-106.6-330.8 0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8.7 15.6 1.3 18.2 2.6.6 6.4 1.3 10.2 1.3 45.4 0 103.1-30.4 139.5-71.5z"/>
    </svg>
    Sign up with Apple
  </button>
</div>
```

### Fix 3: Remove Stale Pricing Copy on Signup Page

The Signup page still shows: `"14-day free trial, then $9.99/month per couple"`

The app is **free** (all users get `subscriptionStatus: 'premium'` on creation). This misleading copy could cause another rejection (Guideline 3.1.1 - In-App Purchase). **Remove this line.**

---

## Verification Checklist (Before Resubmit)

- [ ] Entitlements file exists at `frontend/ios/App/App/App.entitlements`
- [ ] Xcode shows "Sign In with Apple" under Signing & Capabilities
- [ ] Apple Developer Portal: App ID `com.gullstack.loverescue` has Sign In with Apple enabled
- [ ] Fresh build: Sign Up with email → works (creates account, navigates to dashboard)
- [ ] Fresh build: Sign Up with Apple → Apple auth sheet appears, creates account
- [ ] Fresh build: Sign Up with Google → Google auth sheet appears, creates account
- [ ] Fresh build: Sign In with email → works
- [ ] Fresh build: Sign In with Apple → works
- [ ] Fresh build: Sign In with Google → works
- [ ] No pricing/trial copy on Signup page
- [ ] Test on both iPhone and iPad simulators
- [ ] Increment build number (22+)

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/ios/App/App/App.entitlements` | **NEW** — Sign In with Apple entitlement |
| `frontend/ios/App/App.xcodeproj/project.pbxproj` | Xcode auto-updates when adding capability |
| `frontend/src/pages/Auth/Signup.js` | Add Apple + native Google buttons, remove `@react-oauth/google`, remove pricing copy |

## Risk Assessment
- **Low risk** — these are additive changes (adding a missing capability, adding a button)
- **No backend changes** — the `/api/auth/apple` endpoint already works
- **No database changes**
- **No dependency changes** — all plugins already installed
