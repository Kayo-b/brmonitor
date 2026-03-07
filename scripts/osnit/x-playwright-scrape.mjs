#!/usr/bin/env node
/**
 * Local X scraper using Playwright.
 *
 * Usage:
 *   node scripts/osnit/x-playwright-scrape.mjs --account Osinttechnical --query "..." --query "..."
 *
 * Optional env vars:
 *   X_USERNAME / OSNIT_X_USERNAME
 *   X_PASSWORD / OSNIT_X_PASSWORD
 *   X_EMAIL    / OSNIT_X_EMAIL
 *   OSNIT_X_HEADLESS=true|false
 */

function parseArgs(argv) {
  const out = { account: 'Osinttechnical', queries: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--account' && argv[i + 1]) {
      out.account = String(argv[++i]).replace(/^@/, '');
      continue;
    }
    if (a === '--query' && argv[i + 1]) {
      out.queries.push(String(argv[++i]));
      continue;
    }
  }
  return out;
}

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    if (mod?.chromium) return mod;
  } catch {}
  try {
    const mod = await import('@playwright/test');
    if (mod?.chromium) return mod;
  } catch {}
  throw new Error('Playwright is not installed. Run npm install and npx playwright install chromium');
}

async function maybeLogin(page) {
  const username = process.env.OSNIT_X_USERNAME || process.env.X_USERNAME || '';
  const password = process.env.OSNIT_X_PASSWORD || process.env.X_PASSWORD || '';
  const email = process.env.OSNIT_X_EMAIL || process.env.X_EMAIL || '';
  if (!username || !password) return false;

  await page.goto('https://x.com/i/flow/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);

  const userInput = page.locator('input[autocomplete="username"], input[name="text"]').first();
  if (await userInput.count()) {
    await userInput.fill(username);
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(1500);

  const emailInput = page.locator('input[name="text"]').first();
  if (email && await emailInput.count()) {
    const labelText = (await page.content()).toLowerCase();
    if (labelText.includes('phone or email') || labelText.includes('confirm')) {
      await emailInput.fill(email);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
  }

  const passInput = page.locator('input[name="password"]').first();
  if (await passInput.count()) {
    await passInput.fill(password);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
  }
  return true;
}

async function extractItems(page, sourceName, sourceHandle) {
  await page.waitForTimeout(2200);
  return page.evaluate(({ sourceName, sourceHandle }) => {
    const rows = [];
    const seen = new Set();
    const articles = Array.from(document.querySelectorAll('article')).slice(0, 30);
    for (const article of articles) {
      const text = (article.innerText || '').trim();
      if (!text) continue;

      const statusLink = article.querySelector('a[href*="/status/"]');
      const href = statusLink?.getAttribute('href') || '';
      const url = href ? new URL(href, 'https://x.com').toString() : '';
      if (!url || seen.has(url)) continue;
      seen.add(url);

      const timeEl = article.querySelector('time');
      const dt = timeEl?.getAttribute('datetime') || '';
      const title = text.length > 180 ? `${text.slice(0, 179)}...` : text;
      rows.push({
        sourceType: 'x',
        sourceName,
        sourceHandle,
        url,
        title,
        text,
        publishedAt: dt ? new Date(dt).getTime() : Date.now(),
        ingestedAt: Date.now(),
        highTrustReference: /osinttechnical/i.test(sourceHandle || sourceName),
      });
    }
    return rows;
  }, { sourceName, sourceHandle });
}

async function scrape() {
  const { account, queries } = parseArgs(process.argv);
  const playwright = await loadPlaywright();
  const headless = (process.env.OSNIT_X_HEADLESS || 'true').toLowerCase() !== 'false';
  const browser = await playwright.chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    await maybeLogin(page);
    const items = [];

    await page.goto(`https://x.com/${account}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    items.push(...await extractItems(page, `@${account}`, account));

    for (const query of queries.slice(0, 10)) {
      const url = `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      items.push(...await extractItems(page, `Query: ${query}`, 'search'));
    }

    const dedup = new Map();
    for (const item of items) {
      if (!item?.url) continue;
      if (!dedup.has(item.url)) dedup.set(item.url, item);
    }

    process.stdout.write(JSON.stringify({ items: [...dedup.values()] }));
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

scrape().catch((error) => {
  process.stderr.write(`${error?.message || String(error)}\n`);
  process.stdout.write(JSON.stringify({ items: [] }));
  process.exit(0);
});
