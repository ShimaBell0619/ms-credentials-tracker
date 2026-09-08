import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow', width: 320, height: 800 },
];

for (const viewport of viewports) {
  test(`${viewport.name}: mock UI renders without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '資格の更新予定' })).toBeVisible();
    await expect(page.getByText('サンプル基準日')).toBeVisible();
    await expect(page.getByText('Mock data')).toBeVisible();
    await expect(page.getByRole('button', { name: '資格を取り込む' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '資格一覧' })).toBeVisible();

    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  });
}

test('status meaning is available as text', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('更新可能').first()).toBeVisible();
  await expect(page.getByText('有効').first()).toBeVisible();
  await expect(page.getByText('期限なし')).toBeVisible();
});

test('keyboard focus is visible on the skip link', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: '本文へ移動' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
});

test('transcript paste import requires confirmation and persists matched credentials locally', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '資格を取り込む' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '資格情報を取り込む' })).toBeVisible();

  const transcript = `
    Active certifications
    Certification title Certification number Earned on Expires on
    Microsoft Certified: Azure Administrator Associate BFC4DD-8BDAB2 Mar 14, 2026 Mar 15, 2027

    Passed exams
    Exam title Exam number Passed date
    Microsoft Azure Administrator AZ-104 Mar 14, 2026
  `;

  await dialog.getByLabel('Transcript テキスト').fill(transcript);
  await dialog.getByRole('button', { name: '解析する' }).click();

  await expect(dialog.getByRole('heading', { name: '解析結果' })).toBeVisible();
  await expect(dialog.locator('.candidate-title strong')).toHaveText(
    'Microsoft Certified: Azure Administrator Associate',
  );
  await expect(dialog.locator('.candidate-list dd').filter({ hasText: '照合済み' })).toBeVisible();
  await expect(dialog.locator('.exam-results strong')).toHaveText('AZ-104');

  const beforeConfirm = await page.evaluate(() =>
    window.localStorage.getItem('ms-credentials-tracker:credentials:v1'),
  );
  expect(beforeConfirm).toBeNull();

  await dialog.getByRole('button', { name: '確認して保存' }).click();
  await expect(dialog.getByText('1件をブラウザに保存しました。')).toBeVisible();
  await expect(page.locator('.saved-count')).toContainText('1');

  await page.reload();
  await expect(page.locator('.saved-count')).toContainText('1');
});
