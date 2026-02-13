# QA Frontend Fixes — 2026-02-12

## Summary

All critical and warning issues from the QA audit have been resolved.

---

## Critical Fixes 🔴

### 1. OutcomeDashboard Doughnut Positioning Bug
**File:** `charts/OutcomeDashboard.js`
**Fix:** Added `position: 'relative'` to the flex container wrapping the Doughnut chart so the absolute-positioned center text positions correctly relative to its parent.

### 2. Stale Closures in useEffect/useCallback
**Files:** `ClientProgress.js`, `SessionPrep.js`, `AlertsPage.js`, `ClientLinking.js`
**Fix:** Reordered `useCallback` definitions before `useEffect` calls and updated dependency arrays to include the memoized callback (e.g., `[fetchData]` instead of `[id]`). Removed `eslint-disable-next-line` suppression in `ClientLinking.js` — proper `useCallback` + deps now used.

### 3. SuperTool SVG Accessibility (Zero ARIA)
**Files:** `MiniChart.tsx` (SparkLine, BarChart, LineChart), `ProgressRing.tsx`
**Fix:** Added `role="img"`, `aria-label`, and `<title>` elements to all SVG components. Added optional `label` prop to each for custom descriptions.

---

## Warning Fixes ⚠️

### 4. Hardcoded Colors → Theme Tokens
**Files:** `AlertCard.js`, `AssessmentChart.js`, `ClientProgress.js`, `SessionPrep.js`
**Fix:**
- `AlertCard.js`: Replaced hardcoded hex severity colors with `theme.palette.*` + `alpha()` from MUI
- `AssessmentChart.js`: Replaced static `ASSESSMENT_COLORS` array with theme palette colors
- `ClientProgress.js`: Replaced `#e91e63` with `theme.palette.primary.main`
- `SessionPrep.js`: Same — mood chart now uses theme primary color

### 5. Fixed-Width SVGs Overflow on Mobile
**File:** `MiniChart.tsx`
**Fix:** Replaced `width={N} height={N}` attributes with `viewBox` + `className="w-full h-auto"` on all three chart SVGs. Charts now scale responsively to container width.

### 6. Touch Targets Below 44px
**Files:** `client/page.tsx`, `settings/page.tsx`, `session-prep/page.tsx`, `couple/page.tsx`
**Fix:** Back arrow links changed from `p-2` (32px) to `min-w-[44px] min-h-[44px] flex items-center justify-center`. Added `aria-label="Back to dashboard"`.

### 7. Silent Catch Blocks
**File:** `AlertsPage.js`
**Fix:** `handleMarkRead` and `handleBulkMarkRead` now log errors via `console.error` instead of silently swallowing.

### 8. `as any` Type Assertion Removed
**File:** `settings/page.tsx`
**Fix:** Typed `level` parameter as `keyof LoveRescueSettings['notificationPreferences']` and cast to `Record<string, boolean>` — eliminates `as any` while remaining type-safe.

### 9. Component-Inside-Render Anti-Pattern
**File:** `settings/page.tsx`
**Fix:** Extracted `StatusIndicator` from inside `LoveRescueSettingsPage` to module scope. No longer recreated on every render.

---

## Hardcoded Colors on SuperTool Side
**File:** `MiniChart.tsx`
**Fix:** Replaced hardcoded `#667eea` and `#a78bfa` with CSS custom properties: `var(--color-primary, #667eea)`, `var(--color-chart-secondary, #e5e7eb)`, `var(--color-chart-accent, #a78bfa)`.

---

## Files Modified

| File | Changes |
|------|---------|
| `love-rescue/.../charts/OutcomeDashboard.js` | Added `position: 'relative'` to doughnut wrapper |
| `love-rescue/.../pages/therapist/ClientProgress.js` | Fixed stale closure, theme colors |
| `love-rescue/.../pages/Therapist/SessionPrep.js` | Fixed stale closure, theme colors |
| `love-rescue/.../pages/Therapist/AlertsPage.js` | Fixed stale closure, error logging |
| `love-rescue/.../pages/Therapist/ClientLinking.js` | Fixed stale closure, removed eslint-disable |
| `love-rescue/.../components/therapist/AlertCard.js` | Theme tokens for severity colors |
| `love-rescue/.../components/therapist/AssessmentChart.js` | Theme tokens for line colors, ARIA |
| `supertool-app/.../components/loverescue/MiniChart.tsx` | ARIA, responsive SVGs, CSS variables |
| `supertool-app/.../components/loverescue/ProgressRing.tsx` | ARIA labels |
| `supertool-app/.../app/loverescue/settings/page.tsx` | Extract StatusIndicator, remove `as any`, touch targets |
| `supertool-app/.../app/loverescue/client/page.tsx` | Touch targets |
| `supertool-app/.../app/loverescue/session-prep/page.tsx` | Touch targets |
| `supertool-app/.../app/loverescue/couple/page.tsx` | Touch targets |

---

**Estimated grade after fixes: A-** (remaining gaps: focus management on navigation, skip-to-content links, error boundaries around charts — all nice-to-haves)
