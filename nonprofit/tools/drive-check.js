const { chromium } = require('/opt/node22/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    proxy: { server: process.env.HTTPS_PROXY || 'http://127.0.0.1:45021' },
    args: ['--ssl-version-max=tls1.2'],
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: false });
  const page = await ctx.newPage();
  const out = [];

  const targets = [
    ['pay.gov 1023-EZ search', 'https://www.pay.gov/public/search/forms?formNameOrAgency=1023-EZ'],
    ['grants.gov search', 'https://grants.gov/search-grants?query=healthy%20marriage'],
    ['sam.gov entity registration', 'https://sam.gov/content/entity-registration'],
  ];

  for (const [label, url] of targets) {
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(4000);
      const title = await page.title();
      const shot = `/tmp/claude-0/-home-user-love-rescue/ba92baa2-db98-590d-bd2d-5cefc5336ba1/scratchpad/${label.replace(/[^a-z0-9]+/gi, '-')}.png`;
      await page.screenshot({ path: shot, fullPage: false });
      out.push(`OK  ${label}: HTTP ${resp ? resp.status() : '?'} — "${title}" — ${shot}`);
    } catch (e) {
      out.push(`ERR ${label}: ${e.message.split('\n')[0]}`);
    }
  }

  console.log(out.join('\n'));
  await browser.close();
})();
