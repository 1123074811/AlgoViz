export interface JavaEntryPoint {
  className: string
  packageName: string
  sourceFile: string
}

export function resolveJavaEntryPoint(code: string): JavaEntryPoint | null {
  if (!/\bpublic\s+static\s+void\s+main\s*\(\s*String\s*(?:\[\s*\]\s*[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*\s*\[\s*\]|\.\.\.\s*[A-Za-z_$][\w$]*)\s*\)/.test(code)) {
    return null
  }

  const type = code.match(/\bpublic\s+(?:(?:final|abstract|strictfp)\s+)*(?:class|enum|interface)\s+([A-Za-z_$][\w$]*)/)
    ?? code.match(/\b(?:class|enum|interface)\s+([A-Za-z_$][\w$]*)/)
  if (!type) return null

  const packageName = code.match(/\bpackage\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*;/)?.[1] ?? ''
  return {
    className: packageName ? `${packageName}.${type[1]}` : type[1],
    packageName,
    sourceFile: `${type[1]}.java`,
  }
}
