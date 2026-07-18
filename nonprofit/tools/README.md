# Automation tools — browser driving & grant search

## Browser automation (verified working July 18, 2026)

`drive-check.js` is the proven Playwright configuration for driving Chrome against the
federal portals from this environment. It successfully loaded (HTTP 200, screenshots
captured):

- **Pay.gov** form search for Form 1023-EZ (the 501(c)(3) filing portal)
- **Grants.gov** grant search
- **SAM.gov** entity registration

Environment-specific config that made it work (this took debugging — don't rediscover it):

```js
const { chromium } = require('playwright');
const browser = await chromium.launch({
  headless: true,
  // Playwright's default headless_shell binary fails TLS through the egress proxy;
  // the full Chromium binary works:
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  // All traffic must go through the local policy proxy:
  proxy: { server: process.env.HTTPS_PROXY },
  // The TLS-interception proxy resets Chromium's TLS 1.3 post-quantum ClientHello;
  // cap the LOCAL hop at TLS 1.2 (the proxy makes its own modern TLS connection upstream):
  args: ['--ssl-version-max=tls1.2'],
});
```

Run: `node nonprofit/tools/drive-check.js`

**What this capability is for:** navigating, pre-filling, and screenshotting government
forms for officer review. Final submission of IRS/SAM.gov/Grants.gov filings requires an
authorized officer's own account, attestation under penalty of perjury, and payment — those
clicks are the officer's to make.

## Grants.gov live search

No browser needed — Grants.gov has a public API:

```bash
curl -sS -X POST https://api.grants.gov/v1/api/search2 \
  -H 'Content-Type: application/json' \
  -d '{"keyword":"healthy marriage relationship education","oppStatuses":"forecasted|posted","rows":15}'
```

Useful keyword sets already run (results in `../04-FEDERAL-GRANTS.md`):
`healthy marriage relationship education`, `family strengthening fatherhood`,
`behavioral health community mental`. Re-run monthly; the ACF youth-program cluster
(SRAE/PREP/PREIS) closes 08/17–18/2026.
