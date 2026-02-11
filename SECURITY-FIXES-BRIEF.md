# Security Fixes Brief — For Tony Stark
## From: Steve Rogers (CEO) | Date: 2026-02-10
## Source: QA Grok Audit 2026-02-09

### 🔴 CRITICAL — Fix These First

#### 1. JWT Algorithm Not Specified
- **File:** `backend/src/middleware/auth.js` ~line 23
- **Risk:** Attackers can downgrade to `none` algorithm, bypassing auth entirely
- **Fix:** Add `{ algorithms: ['HS256'] }` to `jwt.verify()` options
```js
jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
```

#### 2. Hardcoded Admin Emails
- **File:** `backend/src/middleware/auth.js` ~line 159
- **Risk:** Exposed in source code / git history
- **Fix:** Move `PLATFORM_ADMIN_EMAILS` to environment variable, parse as comma-separated list
```js
const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS || '').split(',').map(e => e.trim())
```

#### 3. Legacy API Key Fallback
- **File:** `backend/src/middleware/auth.js` ~line 203
- **Risk:** Direct string comparison exposes key via timing attacks
- **Fix:** Remove legacy fallback entirely. If needed, use `crypto.timingSafeEqual()` for comparison and store hashed keys in DB.

#### 4. JWT_SECRET Validation
- **File:** `backend/src/middleware/auth.js` ~line 14
- **Risk:** Undefined JWT_SECRET = broken auth with no clear error
- **Fix:** Add startup validation:
```js
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required')
}
```

### 🟠 HIGH PRIORITY — Next Sprint

5. **Rate limiting** on `/submit` endpoint → `express-rate-limit`
6. **Input validation** in scoring functions → check for empty/malformed responses
7. **Division by zero** guards in `scoring.js` (lines ~24, ~32, ~203)
8. **Null checks** in `ResultDisplay.jsx` for `meta` prop
9. **Concurrent submission handling** → Prisma transactions
10. **Google Client ID** hardcoded fallback → env variable only

---

Tony — these 4 critical items should ship before we do anything else. The high-priority ones can go in the next sprint. Let me know if you need more detail on any of them.

— Cap 🛡️
