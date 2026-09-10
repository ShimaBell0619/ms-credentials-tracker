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

async function openDataAndIntegrationsDialog(page) {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'データと連携' });
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'データと連携' });
  await expect(dialog).toBeVisible();
  return { trigger, dialog };
}

test('Base UI dialog preserves Escape dismissal and focus return', async ({ page }) => {
  const { trigger, dialog } = await openTranscriptDialog(page);

  await page.keyboard.press('Escape');

  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('Data and integrations dialog preserves Escape dismissal and focus return', async ({ page }) => {
  const { trigger, dialog } = await openDataAndIntegrationsDialog(page);

  await page.keyboard.press('Escape');

  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('Google Calendar dialog restores focus to the utility entry after close', async ({ page }) => {
  const { trigger, dialog: dataDialog } = await openDataAndIntegrationsDialog(page);
  await dataDialog.getByRole('button', { name: 'Googleカレンダー' }).click();
  const calendarDialog = page.getByRole('dialog', { name: 'Googleカレンダー同期' });
  await expect(calendarDialog).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(calendarDialog).toBeHidden();
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
