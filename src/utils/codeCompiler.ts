export interface CompilationResult {
  success: boolean
  error?: {
    type: 'SyntaxError' | 'IndentationError' | 'CompilationError'
    message: string
    line: number
    column?: number
    context?: string
  }
}

export function compileAndValidateCode(code: string, language: string): CompilationResult {
  if (!code || code.trim() === '') {
    return {
      success: false,
      error: {
        type: 'CompilationError',
        message: '代码不能为空 / Code cannot be empty',
        line: 1
      }
    }
  }

  const lines = code.split('\n')

  // 1. Bracket Matching Check (Generic for all languages)
  const bracketStack: { char: string; line: number; col: number }[] = []
  const matches: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
  const openings = new Set(['(', '[', '{'])
  const closings = new Set([')', ']', '}'])

  let insideSingleQuote = false
  let insideDoubleQuote = false
  let insideComment = false
  let insideBlockComment = false

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l]
    // Skip checking string literals and comments
    for (let c = 0; c < line.length; c++) {
      const char = line[c]
      const nextChar = line[c + 1]

      // Handle comments
      if (insideComment) continue
      if (insideBlockComment) {
        if (char === '*' && nextChar === '/') {
          insideBlockComment = false
          c++
        }
        continue
      }

      if (char === '/' && nextChar === '/' && !insideSingleQuote && !insideDoubleQuote) {
        break // line comment
      }
      if (char === '#' && language === 'python' && !insideSingleQuote && !insideDoubleQuote) {
        break // python line comment
      }
      if (char === '/' && nextChar === '*' && !insideSingleQuote && !insideDoubleQuote) {
        insideBlockComment = true
        c++
        continue
      }

      // Handle quotes
      if (char === "'" && !insideDoubleQuote) {
        if (c > 0 && line[c - 1] === '\\') {
          // escaped quote, do nothing
        } else {
          insideSingleQuote = !insideSingleQuote
        }
        continue
      }
      if (char === '"' && !insideSingleQuote) {
        if (c > 0 && line[c - 1] === '\\') {
          // escaped quote, do nothing
        } else {
          insideDoubleQuote = !insideDoubleQuote
        }
        continue
      }

      if (insideSingleQuote || insideDoubleQuote) continue

      // Bracket matching
      if (openings.has(char)) {
        bracketStack.push({ char, line: l + 1, col: c + 1 })
      } else if (closings.has(char)) {
        const top = bracketStack.pop()
        if (!top || top.char !== matches[char]) {
          return {
            success: false,
            error: {
              type: 'SyntaxError',
              message: top 
                ? `括号不匹配：期望匹配 '${matches[char]}'，但实际发现了 '${top.char}'`
                : `多余的闭括号 '${char}'`,
              line: l + 1,
              column: c + 1,
              context: line.trim()
            }
          }
        }
      }
    }
    insideComment = false // resets on newline
  }

  if (bracketStack.length > 0) {
    const top = bracketStack[bracketStack.length - 1]
    return {
      success: false,
      error: {
        type: 'SyntaxError',
        message: `未闭合的括号 '${top.char}'`,
        line: top.line,
        column: top.col,
        context: lines[top.line - 1]?.trim()
      }
    }
  }

  // 2. JavaScript Specific Compilation Check
  if (language === 'javascript' || language === 'js') {
    try {
      new Function(code)
    } catch (err: any) {
      // Find line number if available
      let lineNum = 1
      const stack = err.stack || ''
      const match = stack.match(/<anonymous>:(\d+):/)
      if (match) {
        lineNum = parseInt(match[1]) - 2 // new Function wrapper shifts line by 2
      } else {
        // Try other stack/message pattern
        const messageMatch = err.message.match(/line (\d+)/i)
        if (messageMatch) lineNum = parseInt(messageMatch[1])
      }
      if (lineNum < 1 || lineNum > lines.length) lineNum = 1

      return {
        success: false,
        error: {
          type: 'SyntaxError',
          message: `JavaScript 编译错误：${err.message}`,
          line: lineNum,
          context: lines[lineNum - 1]?.trim()
        }
      }
    }
  }

  // 3. Python Specific Compilation Check (Indentation, Block Structure, and Colons)
  if (language === 'python' || language === 'py') {
    const indentStack: number[] = [0]
    
    for (let i = 0; i < lines.length; i++) {
      const origLine = lines[i]
      const line = origLine.trim()
      
      // Skip empty or purely comment lines
      if (line === '' || line.startsWith('#')) continue

      // Calculate indentation (number of spaces)
      let spaces = 0
      for (let c = 0; c < origLine.length; c++) {
        if (origLine[c] === ' ') spaces++
        else if (origLine[c] === '\t') spaces += 4 // normalize tab to 4 spaces
        else break
      }

      const prevLineIdx = getPreviousNonEmptyLineIdx(lines, i)
      if (prevLineIdx !== -1) {
        const prevLine = lines[prevLineIdx].trim()
        // If previous line ends with a colon, this line MUST have greater indentation
        if (prevLine.endsWith(':')) {
          if (spaces <= indentStack[indentStack.length - 1]) {
            return {
              success: false,
              error: {
                type: 'IndentationError',
                message: `缩进不匹配：在冒号 ':' 声明的代码块后期望增加缩进量 (Expected indented block after ':' statement)`,
                line: i + 1,
                context: origLine
              }
            }
          }
          indentStack.push(spaces)
        } else {
          // Indentation must match one of the outer blocks
          if (spaces < indentStack[indentStack.length - 1]) {
            // Unindent to outer block
            while (indentStack.length > 0 && indentStack[indentStack.length - 1] > spaces) {
              indentStack.pop()
            }
            if (indentStack[indentStack.length - 1] !== spaces) {
              return {
                success: false,
                error: {
                  type: 'IndentationError',
                  message: `缩进对齐错误：退回缩进时不匹配任何外层代码块 (Unindent does not match any outer indentation level)`,
                  line: i + 1,
                  context: origLine
                }
              }
            }
          } else if (spaces > indentStack[indentStack.length - 1]) {
            return {
              success: false,
              error: {
                type: 'IndentationError',
                message: `意外的多余缩进 (Unexpected indentation)`,
                line: i + 1,
                context: origLine
              }
            }
          }
        }
      }

      // Check common python keyword colons
      const blockKeywords = ['def ', 'class ', 'if ', 'elif ', 'while ', 'for ', 'try:', 'except ', 'else:']
      const matchedKeyword = blockKeywords.find(kw => line.startsWith(kw))
      if (matchedKeyword && !line.endsWith(':') && !line.includes('#')) {
        return {
          success: false,
          error: {
            type: 'SyntaxError',
            message: `语法错误：语句 '${matchedKeyword.trim()}' 代码块声明末尾缺少冒号 ':'`,
            line: i + 1,
            context: origLine
          }
        }
      }
    }
  }

  // 4. C++ & Java Specific Semicolon and Syntax Check
  if (language === 'cpp' || language === 'java') {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Skip empty, comment, or preprocessor lines
      if (line === '' || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || line.startsWith('#') || line.startsWith('import ') || line.startsWith('package ')) {
        continue
      }

      // Check statements that do NOT end with block opening/closing or preprocessors
      const noSemicolonNeededEnds = ['{', '}', ';', ':', ',']
      const lastChar = line[line.length - 1]
      
      if (!noSemicolonNeededEnds.includes(lastChar)) {
        // Also check if it's a loop, condition, function signature, or class declaration
        const keywords = ['if', 'else', 'for', 'while', 'class', 'struct', 'public', 'private', 'protected', 'void', 'int', 'double', 'float', 'bool', 'char']
        const isHeader = keywords.some(kw => line.startsWith(kw)) && (line.includes('(') || line.includes('class') || line.includes('struct') || line.startsWith('else'))
        
        if (!isHeader && !line.endsWith('\\')) {
          // Lookahead to make sure the next line doesn't start with '{' or carry the statement
          const nextIdx = getNextNonEmptyLineIdx(lines, i)
          let shouldHaveSemicolon = true
          if (nextIdx !== -1) {
            const nextLine = lines[nextIdx].trim()
            if (nextLine.startsWith('{') || nextLine.startsWith('else')) {
              shouldHaveSemicolon = false
            }
          }
          if (shouldHaveSemicolon) {
            return {
              success: false,
              error: {
                type: 'CompilationError',
                message: `编译错误：语句末尾缺少分号 ';' (Expected ';' at end of statement)`,
                line: i + 1,
                context: lines[i]
              }
            }
          }
        }
      }
    }
  }

  return { success: true }
}

function getPreviousNonEmptyLineIdx(lines: string[], currentIdx: number): number {
  for (let i = currentIdx - 1; i >= 0; i--) {
    if (lines[i].trim() !== '' && !lines[i].trim().startsWith('#') && !lines[i].trim().startsWith('//')) {
      return i
    }
  }
  return -1
}

function getNextNonEmptyLineIdx(lines: string[], currentIdx: number): number {
  for (let i = currentIdx + 1; i < lines.length; i++) {
    if (lines[i].trim() !== '') {
      return i
    }
  }
  return -1
}
