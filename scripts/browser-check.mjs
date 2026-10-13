import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const checks = [];

for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  checks.push({
    page: viewport.name,
    title: await page.title(),
    heading: await page.locator('h1').first().innerText(),
    horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    consoleErrors,
  });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  checks.push({
    page: `${viewport.name}-login`,
    heading: await page.locator('h1').first().innerText(),
    horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    consoleErrors,
  });
  await page.close();
}

const apiChecks = await Promise.all([
  ['meetings-unauthenticated', '/api/meetings', 401],
  ['connection-details-missing-input', '/api/connection-details', 400],
  ['invalid-invite', '/api/invites/not-a-real-invite', 404],
].map(async ([name, path, expected]) => {
  const response = await fetch(`http://localhost:3000${path}`);
  return { name, status: response.status, expected, pass: response.status === expected };
}));

console.log(JSON.stringify({ checks, apiChecks }, null, 2));
await browser.close();
