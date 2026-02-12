const puppeteer = require('puppeteer');
const path = require('path');

const WIDTH = 430;
const HEIGHT = 932;
const SCALE = 3; // 1290 x 2796

const BASE = 'https://loverescue.app';
const OUT = __dirname;

async function dismissModals(page) {
  // Dismiss cookie consent
  try {
    const cookie = await page.$('button:has-text("Accept")');
    if (cookie) await cookie.click();
  } catch {}
  // Dismiss disclaimer
  try {
    const btns = await page.$$('button');
    for (const btn of btns) {
      const text = await btn.evaluate(el => el.textContent);
      if (text.includes('I Understand') || text.includes('Accept')) {
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

  // Screenshot 1: Landing page (hero)
  console.log('1. Landing...');
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await dismissModals(page);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '01-landing.png'), fullPage: false });

  // Login
  console.log('Logging in...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));
  await dismissModals(page);
  
  try {
    await page.type('input[type="email"], input[name="email"]', 'cohenjmc84@gmail.com', { delay: 30 });
    await page.type('input[type="password"], input[name="password"]', 'demo12345', { delay: 30 });
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 4000));
    await dismissModals(page);
    await new Promise(r => setTimeout(r, 1000));
  } catch (e) {
    console.log('Login attempt:', e.message);
  }

  // Screenshot 2: Dashboard
  console.log('2. Dashboard...');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await dismissModals(page);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '02-dashboard.png'), fullPage: false });

  // Screenshot 3: Assessments
  console.log('3. Assessments...');
  await page.goto(`${BASE}/assessments`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await dismissModals(page);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '03-assessments.png'), fullPage: false });

  // Screenshot 4: Strategies
  console.log('4. Strategies...');
  await page.goto(`${BASE}/strategies`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await dismissModals(page);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '04-strategies.png'), fullPage: false });

  // Screenshot 5: Daily Log
  console.log('5. Daily Log...');
  await page.goto(`${BASE}/daily`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await dismissModals(page);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '05-daily-log.png'), fullPage: false });

  // Screenshot 6: Settings/Profile
  console.log('6. Settings...');
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await dismissModals(page);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '06-settings.png'), fullPage: false });

  await browser.close();
  console.log('Done! Screenshots in:', OUT);
}

capture().catch(console.error);
