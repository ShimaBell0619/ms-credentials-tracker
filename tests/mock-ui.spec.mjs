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

test('transcript share URL import requires confirmation and persists matched credentials locally', async ({ page }) => {
  let requestedUrl = null;
  await page.route('https://func.example.test/api/transcript', async (route) => {
    requestedUrl = (await route.request().postDataJSON()).url;
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        content: JSON.stringify({
          certificationData: {
            activeCertifications: [
              {
                name: 'Azure Administrator Associate',
                certificationNumber: 'BFC4DD-8BDAB2',
                dateEarned: '2026-03-14T00:00:00Z',
                expiration: '2027-03-15T00:00:00Z',
              },
            ],
            passedExams: [
              {
                examTitle: 'Microsoft Azure Administrator',
                examNumber: 'AZ-104',
                examDateTaken: '2026-03-14T00:00:00Z',
              },
            ],
          },
          appliedSkillsData: { appliedSkillsCredentials: [] },
        }),
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: '資格を取り込む' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '資格情報を取り込む' })).toBeVisible();

  await dialog.getByLabel('Transcript 共有URL').fill(
    'https://learn.microsoft.com/ja-jp/users/12345678/transcript/exampletoken?utm_source=test',
  );
  await dialog.getByRole('button', { name: '共有URLから読み込む' }).click();

  await expect(dialog.getByRole('heading', { name: '解析結果' })).toBeVisible();
  expect(requestedUrl).toBe(
    'https://learn.microsoft.com/ja-jp/users/12345678/transcript/exampletoken',
  );
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

test('transcript share URL import reports API failures', async ({ page }) => {
  await page.route('https://func.example.test/api/transcript', async (route) => {
    await route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: '{"error":"upstreamFailure"}',
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: '資格を取り込む' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Transcript 共有URL').fill(
    'https://learn.microsoft.com/users/example/transcript/exampletoken',
  );
  await dialog.getByRole('button', { name: '共有URLから読み込む' }).click();

  await expect(dialog.getByRole('alert')).toContainText('HTTP 502');
  await expect(dialog.getByRole('heading', { name: '解析結果' })).toHaveCount(0);
});
