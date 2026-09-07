import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const reviewUrl = process.env.REVIEW_URL ?? 'http://127.0.0.1:4174/';
const reviewDir = process.env.REVIEW_DIR;

if (!reviewDir) {
  throw new Error('REVIEW_DIR is required');
}

await mkdir(reviewDir, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(reviewUrl, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(reviewDir, 'desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(reviewUrl, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(reviewDir, 'mobile.png'), fullPage: true });
} finally {
  await browser.close();
}
