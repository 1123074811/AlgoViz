export type DetectedCodeLanguage = 'python' | 'javascript' | 'cpp' | 'java'

const DEFAULT_LANGUAGE: DetectedCodeLanguage = 'python'

export function detectCodeLanguage(code: string): DetectedCodeLanguage {
  const text = code.trim()
  if (!text) return DEFAULT_LANGUAGE

  const scores: Record<DetectedCodeLanguage, number> = {
    python: 0,
    javascript: 0,
    cpp: 0,
    java: 0,
  }

  if (/#include\s*<|using\s+namespace\s+std|std::|\bvector\s*<|\bqueue\s*<|\bpriority_queue\s*<|\bcout\s*<<|\bcin\s*>>|\bnullptr\b|TreeNode\s*\*/.test(text)) scores.cpp += 8
  if (/\bclass\s+Solution\b|\bpublic\s+(?:class|int|boolean|void|double|String)|\bprivate\s+(?:int|boolean|void|double|String)|\bnew\s+(?:LinkedList|ArrayList|HashMap|HashSet|PriorityQueue)|\bSystem\.out\b|\bimport\s+java\./.test(text)) scores.java += 8
  if (/\bfunction\b|\bconst\b|\blet\b|=>|\bconsole\.log\b|\bmodule\.exports\b|\bexport\s+default\b|\bimport\s+.*\s+from\s+['"]/.test(text)) scores.javascript += 7
  if (/^\s*(?:def|class)\s+\w+.*:/m.test(text)) scores.python += 8

  if (/\bpublic:\b|\bprivate:\b|\bprotected:\b/.test(text)) scores.cpp += 4
  if (/\bpublic\s+(?:int|boolean|bool|void|double)\s+\w+\s*\(/.test(text)) scores.java += 4
  if (/\bbool\s+\w+\s*\(/.test(text)) scores.cpp += 3
  if (/\bboolean\s+\w+\s*\(/.test(text)) scores.java += 3

  if (/(?:\bNone\b|\bself\b|\belif\b|\bfrom\s+\w+\s+import\b|^\s*#.*$)/m.test(text)) scores.python += 3
  if (/\bnull\b|\btrue\b|\bfalse\b/.test(text)) {
    scores.javascript += 1
    scores.java += 1
  }
  if (/[{};]/.test(text)) {
    scores.java += 1
    scores.cpp += 1
    scores.javascript += 1
  }
  if (/:\s*\n\s+/.test(text) && !/[{};]/.test(text)) scores.python += 2

  return (Object.entries(scores) as Array<[DetectedCodeLanguage, number]>)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? DEFAULT_LANGUAGE
}

export function getCodeLanguageLabel(language: DetectedCodeLanguage): string {
  switch (language) {
    case 'python': return 'Python'
    case 'javascript': return 'JavaScript'
    case 'cpp': return 'C++'
    case 'java': return 'Java'
  }
}
