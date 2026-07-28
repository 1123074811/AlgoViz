import { test, expect } from '@playwright/test'

test('首页展示产品入口和算法分类', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/AlgoViz/i)
  await expect(page.getByRole('heading', { name: 'AlgoViz' })).toBeVisible()
  await expect(page.getByRole('button', { name: '浏览算法库' })).toBeVisible()
  await expect(page.getByRole('button', { name: /排序算法/ })).toBeVisible()
})

test('选择算法后可以单步播放', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '浏览算法库' }).click()
  await expect(page).toHaveURL(/\/visualizer$/)

  await page.getByPlaceholder('搜索算法...').fill('冒泡')
  await page.getByRole('button', { name: /冒泡排序/ }).click()

  const progress = page.locator('input[aria-label="进度"], input[aria-label="Progress"]')
  const play = page.locator('button[title="播放"], button[title="Play"]')
  const next = page.locator('button[title="下一步"], button[title="Next"]')
  await expect(play).toBeEnabled({ timeout: 15_000 })
  await expect(progress).toHaveValue('0')
  await next.click()
  await expect(progress).toHaveValue('1')
})

test('设置页可以切换服务商预设', async ({ page }) => {
  await page.goto('/settings')

  await expect(page.getByLabel('API Key')).toBeVisible()
  await page.getByRole('button', { name: 'OpenAI' }).click()
  await expect(page.getByLabel('Base URL')).toHaveValue('https://api.openai.com/v1')
  await expect(page.getByLabel('模型')).toHaveValue('gpt-5.4-mini')
})

test('Playground 加载代码编辑器', async ({ page }) => {
  await page.goto('/playground')

  await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTitle('根据当前代码自动识别语言，用于编辑器高亮、代码检查和 AI 分析')).toContainText('自动识别')
})
