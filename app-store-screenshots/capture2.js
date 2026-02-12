const puppeteer = require('puppeteer');
const path = require('path');

const WIDTH = 430;
const HEIGHT = 932;
const SCALE = 3;
const BASE = 'https://loverescue.app';
const OUT = __dirname;

async function dismissModals(page) {
  try {
    const btns = await page.$$('button');
    for (const btn of btns) {
      const text = await btn.evaluate(el => el.textContent);
      if (text.includes('I Understand') || text.includes('Accept') || text.includes('Decline')) {
        await btn.click();
        await new Promise(r => setTimeout(r, 500));
      }
    }
  } catch {}
}

async function capture() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');

  // Login with demo account
  console.log('Logging in...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  await dismissModals(page);
  await new Promise(r => setTimeout(r, 500));

  await page.type('input[type="email"], input[name="email"]', 'demo@loverescue.app', { delay: 30 });
  await page.type('input[type="password"], input[name="password"]', 'Demo2026!', { delay: 30 });
  
  // Check "Remember me"
  try {
    const checkbox = await page.$('input[type="checkbox"]');
    if (checkbox) {
      const checked = await checkbox.evaluate(el => el.checked);
      if (!checked) await checkbox.click();
    }
  } catch {}

  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));
  await dismissModals(page);
  await new Promise(r => setTimeout(r, 1000));
  await dismissModals(page);
  await new Promise(r => setTimeout(r, 500));

  // 1: Dashboard
  console.log('1. Dashboard...');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await dismissModals(page);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, 'ss-01-dashboard.png'), fullPage: false });

  // 2: Assessments
  console.log('2. Assessments...');
  await page.goto(`${BASE}/assessments`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT, 'ss-02-assessments.png'), fullPage: false });

  // 3: Strategies
  console.log('3. Strategies...');
  await page.goto(`${BASE}/strategies`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT, 'ss-03-strategies.png'), fullPage: false });

  // 4: Daily Log
  console.log('4. Daily Log...');
  await page.goto(`${BASE}/daily`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT, 'ss-04-daily-log.png'), fullPage: false });

  // 5: Settings
  console.log('5. Settings...');
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT, 'ss-05-settings.png'), fullPage: false });

  await browser.close();
  console.log('Done!');
}

capture().catch(console.error);
