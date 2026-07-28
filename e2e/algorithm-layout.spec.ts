import { expect, test } from '@playwright/test'

async function openSkipList(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '浏览算法库' }).click()
  const search = page.getByPlaceholder('搜索算法...')
  await page.waitForTimeout(250)
  if (!await search.isVisible()) await page.locator('aside button').first().click()
  await expect(search).toBeVisible()
  await search.fill('跳表')
  await page.getByRole('button', { name: '跳表' }).click()
  await expect(page.locator('button[title="播放"], button[title="Play"]')).toBeEnabled({ timeout: 30_000 })
  const canvas = page.getByTestId('scene-canvas')
  await expect(canvas).toBeVisible()
  await expect(canvas.locator('title').filter({ hasText: 'sl_' })).not.toHaveCount(0)
  return canvas
}

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['compact', { width: 1024, height: 768 }],
] as const) {
  test(`跳表布局在 ${name} 视口无重叠回归`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const canvas = await openSkipList(page)
    await expect(canvas).toHaveScreenshot(`skip-list-${name}.png`, {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    })
  })
}
