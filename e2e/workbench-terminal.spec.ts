import { expect, test } from '@playwright/test'

async function openAlgorithm(page: import('@playwright/test').Page, query: string, name: RegExp) {
  await page.goto('/')
  await page.getByRole('button', { name: '浏览算法库' }).click()
  const search = page.getByPlaceholder('搜索算法...')
  await page.waitForTimeout(250)
  if (!await search.isVisible()) await page.locator('aside button').first().click()
  await expect(search).toBeVisible()
  await search.fill(query)
  await page.getByRole('button', { name }).click()
}

test('IDE 终端在输入完成前冻结动画，显式运行后提交 stdout', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', error => browserErrors.push(error.message))

  await openAlgorithm(page, '冒泡', /冒泡排序/)
  const terminal = page.locator('section').filter({ hasText: 'TERMINAL · AlgoViz' })
  const stdin = terminal.locator('textarea')
  const play = page.locator('button[title="播放"], button[title="Play"]')

  await expect(stdin).toBeVisible()
  await expect(play).toBeEnabled()

  await stdin.fill('nums = [9, 1')
  await expect(terminal).toContainText('[stdin:E_INPUT_SYNTAX]')
  await expect(page.getByText(/正在输入：动画已暂停/)).toBeVisible()
  await expect(play).toBeDisabled()

  await stdin.fill('nums = [9, 1, 5, 2]')
  await expect(terminal).toContainText('输入已修改，按 Ctrl+Enter 编译运行')
  await expect(play).toBeDisabled()

  await stdin.press('Control+Enter')
  await expect(terminal).toContainText('stdout>')
  await expect(terminal).toContainText('[\n  1,\n  2,\n  5,\n  9\n]')
  await expect(play).toBeEnabled()
  expect(browserErrors).toEqual([])
})

test('非法领域输入显示编译器式诊断且不会运行', async ({ page }) => {
  await openAlgorithm(page, '二分', /二分查找/)
  const terminal = page.locator('section').filter({ hasText: 'TERMINAL · AlgoViz' })
  const stdin = terminal.locator('textarea')
  const play = page.locator('button[title="播放"], button[title="Play"]')

  await stdin.fill('nums = [3, 1, 2], target = 1')
  await expect(terminal).toContainText('[stdin:E_INPUT_DOMAIN]')
  await expect(terminal).toContainText('二分查找输入必须按升序排列')
  await stdin.press('Control+Enter')
  await expect(terminal).not.toContainText('stdout>')
  await expect(play).toBeDisabled()
})

test('紧凑视口下 IDE 终端无横向溢出且可完成编译运行', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', error => browserErrors.push(error.message))

  await page.setViewportSize({ width: 1024, height: 768 })
  await openAlgorithm(page, '冒泡', /冒泡排序/)
  const terminal = page.locator('section').filter({ hasText: 'TERMINAL · AlgoViz' })
  const stdin = terminal.locator('textarea')

  await expect(terminal).toBeVisible()
  await expect(stdin).toBeVisible()
  const terminalBox = await terminal.boundingBox()
  expect(terminalBox).not.toBeNull()
  expect(terminalBox!.x).toBeGreaterThanOrEqual(0)
  expect(terminalBox!.x + terminalBox!.width).toBeLessThanOrEqual(1024)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024)

  await stdin.fill('nums = [8, 3')
  await expect(terminal).toContainText('[stdin:E_INPUT_SYNTAX]')
  await stdin.fill('nums = [8, 3, 5]')
  await stdin.press('Control+Enter')
  await expect(terminal).toContainText('stdout>')
  await expect(terminal).toContainText('[\n  3,\n  5,\n  8\n]')
  expect(browserErrors).toEqual([])
})

test('JavaScript main 只在 readLine 边界请求 stdin 并从同一会话续跑', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', error => browserErrors.push(error.message))

  await openAlgorithm(page, '冒泡', /冒泡排序/)
  const workspace = page.locator('#left-workspace-panel')
  await workspace.locator('select').first().selectOption('javascript')

  const editor = workspace.locator('.monaco-editor').first()
  await expect(editor).toBeVisible({ timeout: 15_000 })
  await editor.click({ position: { x: 120, y: 80 } })
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  // Monaco auto-closes the opening brace when this text is inserted.
  await page.keyboard.insertText(
    "async function main() {\n"
    + "  const n = Number(await readLine('n?'))\n"
    + "  writeLine('double=' + (n * 2))\n"
    + "  emitResult(n * 2)\n",
  )

  const terminal = workspace.locator('section').filter({ hasText: 'TERMINAL · AlgoViz' })
  await expect(terminal.locator('textarea')).toHaveCount(0)
  await terminal.getByRole('button', { name: '运行 Ctrl+Enter' }).click()
  await expect(terminal).toContainText('n?')

  const stdin = terminal.locator('input')
  await expect(stdin).toBeVisible()
  await stdin.fill('7')
  await stdin.press('Enter')

  await expect(terminal).toContainText('double=14')
  await expect(terminal).toContainText('result> 14')
  await expect(page.locator('button[title="播放"], button[title="Play"]')).toBeDisabled()
  expect(browserErrors).toEqual([])
})
