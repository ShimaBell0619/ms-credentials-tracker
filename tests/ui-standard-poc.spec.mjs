import { expect, test } from '@playwright/test';

async function openTranscriptDialog(page) {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: '資格を取り込む' });
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return { trigger, dialog };
}

test('Base UI dialog preserves Escape dismissal and focus return', async ({ page }) => {
  const { trigger, dialog } = await openTranscriptDialog(page);

  await page.keyboard.press('Escape');

  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('Base UI dialog supports outside dismissal', async ({ page }) => {
  const { dialog } = await openTranscriptDialog(page);
  const backdrop = page.locator('.dialog-backdrop');
  await expect(backdrop).toBeVisible();

  await backdrop.click({ position: { x: 8, y: 8 } });

  await expect(dialog).toBeHidden();
});

test('reduced motion removes non-essential dialog transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { dialog } = await openTranscriptDialog(page);
  const popup = page.locator('.dialog-popup');

  await expect(dialog).toBeVisible();
  const transitionDuration = await popup.evaluate((element) =>
    getComputedStyle(element).transitionDuration,
  );
  expect(transitionDuration).toBe('0s');
});

test('runtime semantic tokens are exposed through the product theme', async ({ page }) => {
  await page.goto('/');

  const tokens = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      background: styles.getPropertyValue('--app-color-background').trim(),
      focus: styles.getPropertyValue('--app-color-focus').trim(),
      action: styles.getPropertyValue('--app-color-action').trim(),
      statusNeutral: styles.getPropertyValue('--app-color-status-neutral').trim(),
    };
  });

  expect(tokens.background).toMatch(/^oklch\(/);
  expect(tokens.focus).toMatch(/^oklch\(/);
  expect(tokens.action).toMatch(/^oklch\(/);
  expect(tokens.statusNeutral).toMatch(/^oklch\(/);
});
