export interface Diagnostic {
  severity: 'error' | 'warning'
  type: string
  message: string
  line: number
  column?: number
  context?: string
}

export interface CompilationResult {
  success: boolean
  errors: Diagnostic[]
  warnings: Diagnostic[]
}

function diag(severity: 'error' | 'warning', type: string, message: string, line: number, column?: number, context?: string): Diagnostic {
  return { severity, type, message, line, column, context }
}

/**
 * True if the line contains a ':' at bracket depth 0 outside strings/comments.
 * This is Python's block colon — it may sit mid-line for inline compound
 * statements (e.g. `for x in xs: do()` or `if not a: return a`), so checking
 * for a trailing colon alone produces false "missing colon" errors.
 */
/** Remove a trailing Python `# ...` comment (outside strings) and trailing space. */
function stripTrailingPyComment(line: string): string {
  let sq = false, dq = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (sq) { if (ch === "'" && line[i - 1] !== '\\') sq = false; continue }
    if (dq) { if (ch === '"' && line[i - 1] !== '\\') dq = false; continue }
    if (ch === "'") { sq = true; continue }
    if (ch === '"') { dq = true; continue }
    if (ch === '#') return line.slice(0, i).trimEnd()
  }
  return line.trimEnd()
}

function hasTopLevelColon(line: string): boolean {
  let depth = 0, sq = false, dq = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (sq) { if (ch === "'" && line[i - 1] !== '\\') sq = false; continue }
    if (dq) { if (ch === '"' && line[i - 1] !== '\\') dq = false; continue }
    if (ch === "'") { sq = true; continue }
    if (ch === '"') { dq = true; continue }
    if (ch === '#') break
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    else if (ch === ':' && depth === 0) return true
  }
  return false
}

export function compileAndValidateCode(code: string, language: string): CompilationResult {
  const errors: Diagnostic[] = []
  const warnings: Diagnostic[] = []

  if (!code || code.trim() === '') {
    errors.push(diag('error', 'CompilationError', '代码不能为空 / Code cannot be empty', 1))
    return { success: false, errors, warnings }
  }

  const lines = code.split('\n')

  // ====================================
  // 1. Generic: Bracket Matching
  // ====================================
  const bracketStack: { char: string; line: number; col: number }[] = []
  const matches: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
  const openings = new Set(['(', '[', '{'])
  const closings = new Set([')', ']', '}'])
  let insideSingleQuote = false, insideDoubleQuote = false, insideBlockComment = false
  // `//` and `/* */` are comments in C-like languages but operators in Python
  // (floor division), so only treat them as comments outside Python.
  const isPython = language === 'python' || language === 'py'

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l]
    for (let c = 0; c < line.length; c++) {
      const char = line[c], nextChar = line[c + 1]

      if (insideBlockComment) {
        if (char === '*' && nextChar === '/') { insideBlockComment = false; c++ }
        continue
      }
      if (!isPython && char === '/' && nextChar === '/' && !insideSingleQuote && !insideDoubleQuote) break
      if (isPython && char === '#' && !insideSingleQuote && !insideDoubleQuote) break
      if (!isPython && char === '/' && nextChar === '*' && !insideSingleQuote && !insideDoubleQuote) { insideBlockComment = true; c++; continue }

      if (char === "'" && !insideDoubleQuote) { if (!(c > 0 && line[c - 1] === '\\')) insideSingleQuote = !insideSingleQuote; continue }
      if (char === '"' && !insideSingleQuote) { if (!(c > 0 && line[c - 1] === '\\')) insideDoubleQuote = !insideDoubleQuote; continue }
      if (insideSingleQuote || insideDoubleQuote) continue

      if (openings.has(char)) {
        bracketStack.push({ char, line: l + 1, col: c + 1 })
      } else if (closings.has(char)) {
        const top = bracketStack.pop()
        if (!top || top.char !== matches[char]) {
          errors.push(diag('error', 'SyntaxError',
            top ? `括号不匹配：期望 '${matches[char]}'，实际为 '${top.char}'` : `多余的闭括号 '${char}'`,
            l + 1, c + 1, line.trim()))
        }
      }
    }
  }
  for (const top of bracketStack) {
    errors.push(diag('error', 'SyntaxError', `未闭合的括号 '${top.char}'`, top.line, top.col, lines[top.line - 1]?.trim()))
  }

  // ====================================
  // 2. Generic: Suspicious patterns (warnings)
  // ====================================
  for (let l = 0; l < lines.length; l++) {
    const raw = lines[l], line = raw.trim()
    if (line === '') continue

    // Tab warning
    if (raw.includes('\t') && (language === 'python' || language === 'py')) {
      warnings.push(diag('warning', 'StyleWarning', '建议使用空格代替制表符 (Tab) 进行缩进', l + 1))
    }

    // Trailing whitespace
    if (raw.length > 0 && (raw.endsWith(' ') || raw.endsWith('\t'))) {
      warnings.push(diag('warning', 'StyleWarning', '行末尾有多余空白字符', l + 1))
    }

    // Long line warning
    if (raw.length > 120) {
      warnings.push(diag('warning', 'StyleWarning', `代码行过长 (${raw.length} 字符)，建议不超过 120 字符`, l + 1))
    }
  }

  // ====================================
  // 3. JavaScript / TypeScript
  // ====================================
  if (language === 'javascript' || language === 'js' || language === 'typescript' || language === 'ts') {
    // Real parse via new Function (JS only, not TS)
    if (language === 'javascript' || language === 'js') {
      try { new Function(code) } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err))
        let lineNum = 1
        const stack = error.stack || ''
        const m = stack.match(/<anonymous>:(\d+):/)
        if (m) lineNum = Math.max(1, parseInt(m[1]) - 2)
        else { const mm = error.message.match(/line (\d+)/i); if (mm) lineNum = parseInt(mm[1]) }
        errors.push(diag('error', 'SyntaxError', `JavaScript 编译错误：${error.message}`, Math.min(lineNum, lines.length), undefined, lines[lineNum - 1]?.trim()))
      }
    }

    // JS/TS warnings
    for (let l = 0; l < lines.length; l++) {
      const line = lines[l].trim()
      if (line === '' || line.startsWith('//') || line.startsWith('/*')) continue

      if (/\bvar\s+\w/.test(line)) {
        warnings.push(diag('warning', 'StyleWarning', '建议使用 let 或 const 代替 var（var 有函数级作用域提升问题）', l + 1))
      }
      if (/\beval\s*\(/.test(line)) {
        warnings.push(diag('warning', 'SecurityWarning', 'eval() 存在安全风险，应避免使用', l + 1))
      }
      if (/\bwith\s*\(/.test(line)) {
        warnings.push(diag('warning', 'StyleWarning', 'with 语句在严格模式下被禁止，且容易引起作用域混淆', l + 1))
      }
      if (/==(?!=)/.test(line) && !/===/.test(line) && !/".*==/.test(line) && !/'.*==/.test(line)) {
        warnings.push(diag('warning', 'StyleWarning', '建议使用 === 代替 == 避免隐式类型转换', l + 1))
      }
      if (/\bdelete\s+(?!.*\[)/.test(line) && !/delete\s+obj\./.test(line)) {
        warnings.push(diag('warning', 'PerformanceWarning', 'delete 操作会使 V8 隐藏类失效，影响性能', l + 1))
      }
      if (/\bconsole\.(log|warn|error|debug)\s*\(/.test(line)) {
        warnings.push(diag('warning', 'StyleWarning', '生产代码中应移除 console 调试输出', l + 1))
      }
      // Unused variable detection (simple: declared with let/const but not used after)
      const declMatch = line.match(/\b(?:let|const)\s+(\w+)\s*[=;]/)
      if (declMatch) {
        const varName = declMatch[1]
        let usageCount = 0
        for (let k = l + 1; k < lines.length; k++) {
          if (new RegExp(`\\b${varName}\\b`).test(lines[k]) && !lines[k].trim().startsWith('//')) usageCount++
        }
        if (usageCount === 0) {
          warnings.push(diag('warning', 'StyleWarning', `变量 '${varName}' 声明后未使用`, l + 1))
        }
      }
    }

    // TypeScript-specific: type annotations checked (warn if using 'any')
    if (language === 'typescript' || language === 'ts') {
      for (let l = 0; l < lines.length; l++) {
        const line = lines[l].trim()
        if (/\bany\b/.test(line) && (line.includes(': any') || line.includes('<any>') || line.includes('as any'))) {
          warnings.push(diag('warning', 'TypeWarning', '使用 any 类型会失去 TypeScript 的类型安全检查', l + 1))
        }
      }
    }
  }

  // ====================================
  // 4. Python
  // ====================================
  if (language === 'python' || language === 'py') {
    const indentStack: number[] = [0]
    const definedVars = new Set<string>()
    const definedFuncs = new Set<string>()

    for (let i = 0; i < lines.length; i++) {
      const origLine = lines[i], line = origLine.trim()
      if (line === '' || line.startsWith('#')) continue

      let spaces = 0
      for (let c = 0; c < origLine.length; c++) {
        if (origLine[c] === ' ') spaces++
        else if (origLine[c] === '\t') spaces += 4
        else break
      }

      // Indentation validation
      const prevIdx = prevNonEmpty(lines, i)
      if (prevIdx !== -1) {
        // Strip trailing comments so `if x:  # note` is still seen as a block opener.
        const prevLine = stripTrailingPyComment(lines[prevIdx].trim())
        if (prevLine.endsWith(':')) {
          if (spaces <= indentStack[indentStack.length - 1]) {
            errors.push(diag('error', 'IndentationError', `冒号声明后期望增加缩进 (Expected indented block after ':')`, i + 1, undefined, origLine))
          }
          indentStack.push(spaces)
        } else if (spaces < indentStack[indentStack.length - 1]) {
          while (indentStack.length > 0 && indentStack[indentStack.length - 1] > spaces) indentStack.pop()
          if (indentStack[indentStack.length - 1] !== spaces) {
            errors.push(diag('error', 'IndentationError', `回退缩进时不匹配任何外层代码块`, i + 1, undefined, origLine))
          }
        } else if (spaces > indentStack[indentStack.length - 1]) {
          errors.push(diag('error', 'IndentationError', `意外的多余缩进 (Unexpected indentation)`, i + 1, undefined, origLine))
        }
      }

      // Colon requirement
      const blockKw = ['def ', 'class ', 'if ', 'elif ', 'while ', 'for ', 'try:', 'except ', 'else:']
      const matched = blockKw.find(kw => line.startsWith(kw))
      // A block colon may be mid-line (inline compound statement), so require a
      // top-level ':' anywhere rather than only at the end.
      if (matched && !hasTopLevelColon(line)) {
        errors.push(diag('error', 'SyntaxError', `'${matched.trim()}' 语句块末尾缺少冒号 ':'`, i + 1, undefined, origLine))
      }

      // Collect definitions
      const defMatch = line.match(/^def\s+(\w+)\s*\(/)
      if (defMatch) definedFuncs.add(defMatch[1])
      const assignMatch = line.match(/^(\w+)\s*=\s*/)
      if (assignMatch) definedVars.add(assignMatch[1])

      // Warnings
      if (/\bexcept\s*:/.test(line) && !/\bexcept\s+Exception/.test(line) && !/\bexcept\s+\(/.test(line)) {
        warnings.push(diag('warning', 'StyleWarning', '避免使用裸 except，应指定具体异常类型', i + 1))
      }
      if (/def\s+\w+\s*\(.*=\s*\[\]/.test(line) || /def\s+\w+\s*\(.*=\s*\{\}/.test(line)) {
        warnings.push(diag('warning', 'BugRisk', '可变对象作为默认参数会导致意外的状态共享', i + 1))
      }
      if (/\bprint\s/.test(line) && language !== 'python') {
        warnings.push(diag('warning', 'StyleWarning', '生产代码中应移除 print 调试输出', i + 1))
      }
      if (/\b(range\s*\(\s*len\s*\()/.test(line)) {
        warnings.push(diag('warning', 'StyleWarning', '建议使用 enumerate() 代替 range(len(...))', i + 1))
      }
      if (/\bopen\s*\(/.test(line) && !/\bwith\b/.test(line)) {
        warnings.push(diag('warning', 'ResourceWarning', '文件操作应使用 with 语句确保资源自动关闭', i + 1))
      }
    }

    // Check for undefined references (simple heuristic)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const callMatch = line.match(/(\w+)\s*\(/)
      if (callMatch && !['print', 'range', 'len', 'int', 'str', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'type', 'isinstance', 'super', 'sorted', 'reversed', 'enumerate', 'zip', 'map', 'filter', 'input', 'open', 'abs', 'min', 'max', 'sum', 'any', 'all'].includes(callMatch[1])) {
        if (!definedFuncs.has(callMatch[1]) && !callMatch[1].startsWith('_')) {
          warnings.push(diag('warning', 'UndefinedRef', `函数 '${callMatch[1]}' 可能未定义（非内置函数）`, i + 1))
        }
      }
    }
  }

  // ====================================
  // 5. C++ / Java
  // ====================================
  if (language === 'cpp' || language === 'java') {
    let insideCppJavaBlockComment = false
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i]
      const line = stripCppJavaComments(raw, insideCppJavaBlockComment)
      insideCppJavaBlockComment = line.insideBlockComment
      const codeLine = line.code.trim()
      if (codeLine === '' || codeLine.startsWith('#') || codeLine.startsWith('import ') || codeLine.startsWith('package ')) continue

      const noSemiEnds = ['{', '}', ';', ':', ',']
      if (!noSemiEnds.includes(codeLine[codeLine.length - 1])) {
        const kw = ['if', 'else', 'for', 'while', 'class', 'struct', 'public', 'private', 'protected', 'void', 'int', 'double', 'float', 'bool', 'char']
        const isHeader = kw.some(k => codeLine.startsWith(k)) && (codeLine.includes('(') || codeLine.includes('class') || codeLine.startsWith('else'))
        if (!isHeader && !codeLine.endsWith('\\')) {
          const nextIdx = nextNonEmpty(lines, i)
          let needSemi = true
          if (nextIdx !== -1 && (lines[nextIdx].trim().startsWith('{') || lines[nextIdx].trim().startsWith('else'))) needSemi = false
          if (needSemi) {
            errors.push(diag('error', 'CompilationError', `语句末尾缺少分号 ';'`, i + 1, undefined, raw))
          }
        }
      }

      // Warnings
      if (/\b(NULL|0)\b/.test(codeLine) && language === 'cpp') {
        warnings.push(diag('warning', 'StyleWarning', '建议使用 nullptr 代替 NULL 或 0（C++11 起）', i + 1))
      }
      if (/\busing namespace std\b/.test(codeLine)) {
        warnings.push(diag('warning', 'StyleWarning', '头文件中避免 using namespace std，应在 .cpp 中使用', i + 1))
      }
      if (/\b(scanf|printf|gets)\s*\(/.test(codeLine)) {
        warnings.push(diag('warning', 'SecurityWarning', `${codeLine.match(/(scanf|printf|gets)/)?.[1] || 'C 函数'}() 存在安全风险，建议使用 C++ 流或安全替代方案`, i + 1))
      }
      if (/\bnew\b(?!.*delete)/.test(codeLine)) {
        warnings.push(diag('warning', 'ResourceWarning', 'new 分配的内存需确保对应的 delete，建议使用智能指针', i + 1))
      }
    }
  }

  return { success: errors.length === 0, errors, warnings }
}

function prevNonEmpty(lines: string[], idx: number): number {
  for (let i = idx - 1; i >= 0; i--) {
    const t = lines[i].trim()
    if (t !== '' && !t.startsWith('#') && !t.startsWith('//')) return i
  }
  return -1
}

function nextNonEmpty(lines: string[], idx: number): number {
  for (let i = idx + 1; i < lines.length; i++) {
    if (lines[i].trim() !== '') return i
  }
  return -1
}

function stripCppJavaComments(raw: string, startsInsideBlockComment: boolean): { code: string; insideBlockComment: boolean } {
  let code = ''
  let insideBlockComment = startsInsideBlockComment
  let insideSingleQuote = false
  let insideDoubleQuote = false

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i]
    const next = raw[i + 1]

    if (insideBlockComment) {
      if (char === '*' && next === '/') {
        insideBlockComment = false
        i++
      }
      continue
    }

    if (!insideSingleQuote && !insideDoubleQuote && char === '/' && next === '/') break
    if (!insideSingleQuote && !insideDoubleQuote && char === '/' && next === '*') {
      insideBlockComment = true
      i++
      continue
    }

    code += char
    if (char === "'" && !insideDoubleQuote && raw[i - 1] !== '\\') insideSingleQuote = !insideSingleQuote
    if (char === '"' && !insideSingleQuote && raw[i - 1] !== '\\') insideDoubleQuote = !insideDoubleQuote
  }

  return { code, insideBlockComment }
}
