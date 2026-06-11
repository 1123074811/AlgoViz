import { useCallback, useState } from 'react'

/** 代码编辑器按作用域（算法 + 操作 + 语言）保存用户编辑状态。 */
export function useCodeScope(args: {
  scopeKey: string
  defaultCode: string
}) {
  const [codeByScope, setCodeByScope] = useState<Record<string, string>>({})
  const code = codeByScope[args.scopeKey] ?? args.defaultCode
  const setCode = useCallback((nextValue: string) => {
    setCodeByScope((prev) =>
      prev[args.scopeKey] === nextValue ? prev : { ...prev, [args.scopeKey]: nextValue }
    )
  }, [args.scopeKey])
  const isCodeDirty = codeByScope[args.scopeKey] !== undefined && codeByScope[args.scopeKey] !== args.defaultCode
  return { code, setCode, isCodeDirty }
}
