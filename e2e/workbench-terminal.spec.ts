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

async function replaceEditorCode(
  page: import('@playwright/test').Page,
  editor: import('@playwright/test').Locator,
  code: string,
) {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate(value => navigator.clipboard.writeText(value), code)
  await editor.click({ position: { x: 120, y: 80 } })
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Control+V')
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
  await replaceEditorCode(
    page,
    editor,
    "async function main() {\n"
    + "  const n = Number(await readLine('n?'))\n"
    + "  writeLine('double=' + (n * 2))\n"
    + "  emitResult(n * 2)\n"
    + "}\n",
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

test('交互程序的合法 trace 增量生成动画并在 stdin 边界暂停', async ({ page }) => {
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
  await replaceEditorCode(
    page,
    editor,
    'async function main() {\n'
    + '  emitTrace({version: 1, kind: "init", initialState: {type: "array", data: [3, 1]}})\n'
    + '  emitTrace({version: 1, kind: "step", description: "创建数组", events: [{type: "array.create", values: [3, 1]}]})\n'
    + '  await readLine("continue?")\n'
    + '  emitTrace({version: 1, kind: "step", description: "交换", events: [{type: "array.swap", indices: [0, 1]}], stats: {swaps: 1}})\n'
    + '  emitResult([1, 3])\n'
    + '}\n',
  )

  const terminal = workspace.locator('section').filter({ hasText: 'TERMINAL · AlgoViz' })
  await terminal.getByRole('button', { name: '运行 Ctrl+Enter' }).click()
  const progress = page.locator('input[aria-label="进度"], input[aria-label="Progress"]')
  await expect(progress).toHaveValue('1')
  await expect(terminal).toContainText('continue?')
  await expect(page.getByText(/程序正在等待 stdin/)).toBeVisible()

  const stdin = terminal.locator('input')
  await stdin.fill('go')
  await stdin.press('Enter')

  await expect(progress).toHaveValue('2')
  await expect(terminal).toContainText('代码执行完成，生成 2 个动画步骤')
  await expect(terminal).not.toContainText('[trace:E_TRACE')
  expect(browserErrors).toEqual([])
})

test('非法 trace 显示编译诊断且不会生成动画步骤', async ({ page }) => {
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
  await replaceEditorCode(
    page,
    editor,
    'async function main() {\n'
    + '  emitTrace({version: 1, kind: "step", description: "越过初始化", events: [{type: "array.swap", indices: [0, 1]}]})\n'
    + '}\n',
  )

  const terminal = workspace.locator('section').filter({ hasText: 'TERMINAL · AlgoViz' })
  await terminal.getByRole('button', { name: '运行 Ctrl+Enter' }).click()
  await expect(terminal).toContainText('[trace:E_TRACE_INIT_REQUIRED]')
  await expect(terminal).toContainText('代码执行完成，但有 1 个 trace 编译错误')
  await expect(terminal).not.toContainText('生成 1 个动画步骤')
  expect(browserErrors).toEqual([])
})

test('C++ main 在浏览器 Clang/WASI 中严格读取 stdin 并生成 trace 动画', async ({ page }) => {
  test.setTimeout(120_000)
  const browserErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', error => browserErrors.push(error.message))

  await openAlgorithm(page, '冒泡', /冒泡排序/)
  const workspace = page.locator('#left-workspace-panel')
  await workspace.locator('select').first().selectOption('cpp')
  const editor = workspace.locator('.monaco-editor').first()
  await expect(editor).toBeVisible({ timeout: 15_000 })
  await replaceEditorCode(
    page,
    editor,
    String.raw`#include <algorithm>
#include <iostream>
#include <string>

int main() {
  int left;
  int right;
  std::cout << "nums?" << std::flush;
  std::cin >> left >> right;
  const std::string values = "[" + std::to_string(left) + "," + std::to_string(right) + "]";
  emit_trace("{\"version\":1,\"kind\":\"init\",\"initialState\":{\"type\":\"array\",\"data\":" + values + "}}");
  emit_trace("{\"version\":1,\"kind\":\"step\",\"description\":\"创建数组\",\"events\":[{\"type\":\"array.create\",\"values\":" + values + "}]}");
  if (left > right) {
    std::swap(left, right);
    emit_trace(R"({"version":1,"kind":"step","description":"交换","events":[{"type":"array.swap","indices":[0,1]}],"stats":{"swaps":1}})");
  }
  emit_result("[" + std::to_string(left) + "," + std::to_string(right) + "]");
  return 0;
}
`,
  )

  const terminal = workspace.locator('section').filter({ hasText: 'TERMINAL · AlgoViz' })
  await terminal.getByRole('button', { name: '运行 Ctrl+Enter' }).click()
  await expect(terminal).toContainText('nums?', { timeout: 90_000 })
  const stdin = terminal.locator('input')
  await expect(stdin).toBeVisible()
  await stdin.fill('3 1')
  await stdin.press('Enter')

  const progress = page.locator('input[aria-label="进度"], input[aria-label="Progress"]')
  await expect(progress).toHaveValue('2', { timeout: 30_000 })
  await expect(terminal).toContainText('代码执行完成，生成 2 个动画步骤')
  await expect(terminal).toContainText('[\n  1,\n  3\n]')
  await expect(terminal).not.toContainText('[trace:E_TRACE')
  expect(browserErrors).toEqual([])

  await replaceEditorCode(
    page,
    editor,
    'int main() {\n'
    + '  return 0\n'
    + '}\n',
  )
  await terminal.getByRole('button', { name: '运行 Ctrl+Enter' }).click()
  await expect(terminal).toContainText("expected ';' after return statement")
  await expect(terminal).toContainText('C++ 编译失败，Clang 退出码')
  await expect(progress).toHaveValue('2')
})

test('Python input 使用共享 stdin 连续暂停并复用浏览器运行时', async ({ page }) => {
  test.setTimeout(90_000)
  const browserErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', error => browserErrors.push(error.message))

  await openAlgorithm(page, '冒泡', /冒泡排序/)
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true)
  const workspace = page.locator('#left-workspace-panel')
  await workspace.locator('select').first().selectOption('python')

  const editor = workspace.locator('.monaco-editor').first()
  await expect(editor).toBeVisible({ timeout: 15_000 })
  await replaceEditorCode(
    page,
    editor,
    'name = input("name? ")\n'
    + 'count = int(input("count? "))\n'
    + 'print(f"hello {name}")\n'
    + 'emit_result({"name": name, "double": count * 2})',
  )

  const terminal = workspace.locator('section').filter({ hasText: 'TERMINAL · AlgoViz' })
  await expect(terminal.locator('textarea')).toHaveCount(0)

  const run = terminal.getByRole('button', { name: '运行 Ctrl+Enter' })
  await run.click()
  await expect(terminal).toContainText('name?', { timeout: 45_000 })
  let stdin = terminal.locator('input')
  await stdin.fill('Ada')
  await stdin.press('Enter')
  await expect(terminal).toContainText('count?')
  stdin = terminal.locator('input')
  await stdin.fill('7')
  await stdin.press('Enter')
  await expect(terminal).toContainText('hello Ada')
  await expect(terminal).toContainText('"double": 14')

  await run.click()
  await expect(terminal).toContainText('name?')
  stdin = terminal.locator('input')
  await stdin.fill('Lin')
  await stdin.press('Enter')
  await expect(terminal).toContainText('count?')
  stdin = terminal.locator('input')
  await stdin.fill('5')
  await stdin.press('Enter')
  await expect(terminal).toContainText('"double": 10')
  expect(browserErrors).toEqual([])
})
