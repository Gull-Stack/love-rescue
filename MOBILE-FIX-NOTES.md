# Mobile Fix Notes — 2026-07-05

Companion notes for the mobile-audit fix pass (frontend/Capacitor scope). Each
item below is either a decision that needs to be known when touching the native
project, or a manual step that cannot be completed in-repo because the Xcode
project (`frontend/ios/App/App.xcodeproj`) is generated locally by
`npx cap add ios` and is not committed.

## 1. Apple Sign-In (CRITICAL fix #1)

Done in-repo:
- `@capacitor-community/apple-sign-in@^7.1.0` added to `frontend/package.json`
  and `package-lock.json` (peer-compatible with Capacitor 8: peer dep is
  `@capacitor/core >= 7`).
- `frontend/ios/App/App/App.entitlements` created with the
  `com.apple.developer.applesignin` (Default) capability.
- Root `.gitignore` reworked so `frontend/ios/**` stays ignored but
  `App.entitlements` and `Info.plist` are tracked.

Manual steps (Xcode / Apple Developer portal):
1. `cd frontend && npm install && npm run build:ios` (runs `cap sync ios` and
   installs the new `CapacitorCommunityAppleSignIn` pod).
2. In Xcode, ensure the App target references the entitlements file:
   Build Settings → `CODE_SIGN_ENTITLEMENTS` = `App/App.entitlements`
   (or add the "Sign in with Apple" capability via Signing & Capabilities,
   which wires this up automatically — it must point at the committed file).
3. In the Apple Developer portal, enable **Sign In with Apple** for the
   `com.gullstack.loverescue` App ID and regenerate provisioning profiles.

## 2. Deep links (HIGH fix #6)

`initCapacitor()` is now called from `App.js` and its `appUrlOpen` handler
routes `pathname + search + hash` through React Router (`navigate`), so
`https://loverescue.app/join/<code>` opens the right screen in-app.

Manual steps for universal links to actually reach the app:
1. Xcode → Signing & Capabilities → add **Associated Domains** with
   `applinks:loverescue.app`.
2. Serve an `apple-app-site-association` file from
   `https://loverescue.app/.well-known/apple-app-site-association` covering the
   paths you want to open in-app (at minimum `/join/*` and
   `/therapist/join/*`).

## 3. Keyboard handling (HIGH fix #6, decision)

Chosen approach: **native webview resize**. `capacitor.config.ts` now sets
`Keyboard.resize: 'native'`; the `--keyboard-height` CSS-var listeners were
removed from `capacitor-init.js` because nothing in the app consumed that
variable. If a future screen needs manual keyboard-height layout, switch back
to `resize: 'none'` + the CSS var in one place — don't mix both. Requires
`npx cap sync ios` to take effect.

## 4. Calendar OAuth on native (HIGH fix #9, decision)

Decision: **hide connect on native with an explanatory caption** (Settings) and
a clear error instead of redirect (Strategies sync).

Reason: Google's OAuth page returns `403: disallowed_useragent` inside
WKWebView, and the backend callback (`backend/src/routes/calendar.js`)
redirects to `${FRONTEND_URL}/settings?...` — a web URL that cannot re-enter
the native app. So even `@capacitor/browser` would strand the user on the
website. Once connected on the web, sync works everywhere (the native app can
call `POST /calendar/sync` fine).

If in-app connect is ever wanted: add a universal-link (or custom-scheme)
redirect target to the backend callback, then open the auth URL with
`@capacitor/browser` and close it on `appUrlOpen`.

## 5. Push notifications (CRITICAL fix #4 / HIGH fix #12)

- `index.js` no longer unregisters every service worker at startup; it now
  unregisters only the legacy CRA `service-worker.js` and leaves `/push-sw.js`
  (the web-push worker) alone.
- `navigator.serviceWorker.ready` hangs forever when nothing is registered;
  all push code now uses `getRegistration('/push-sw.js')` or a timeout-guarded
  `.ready` after registering.
- Native push registration on login (`AuthContext.fetchUser`) is now
  `registerNativePushIfGranted()` — it only refreshes the device token when
  permission was already granted and never triggers the iOS permission dialog.
  First-time opt-in remains explicit: the Settings toggle or the DailyLog
  post-check-in prompt.
- Push plugin listeners are attached once (module-level guard) and the
  transient registration listeners are removed after each registration, so
  repeated logins no longer stack duplicate handlers.

## 6. capacitor.config.ts cleanup (MEDIUM)

- `server.cleartext: true` removed (App Transport Security should not be
  weakened in production builds). If you need to point a local device build at
  an `http://` dev backend, temporarily add a `server` block locally — do not
  commit it.
- Splash `backgroundColor`, `<meta name="theme-color">`, and the PWA manifest
  `theme_color` updated from legacy pink `#E91E63` to brand slate `#1B2735`
  (matches `theme.js` primary). If native splash images were generated with
  the pink background, regenerate them (`npx capacitor-assets generate`) so
  the image matches the new background color.

## 7. Test-suite baseline (context, not a regression)

The frontend Jest suite had 12 of 17 suites failing before this fix pass
(stale tests referencing removed UI — e.g. `DailyLog.test.js` still tests the
pre-card-deck "Daily Log" form, `Signup.test.js` expects the Google button
without `REACT_APP_GOOGLE_CLIENT_ID` set). This pass keeps the 5 passing
suites green and does not add new failures; a production build
(`react-scripts build`) completes with no "Module not found" errors. Updating
the stale suites is out of scope for this pass and still needs doing.
