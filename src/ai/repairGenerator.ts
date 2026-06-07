import { getApiConfig, analyzeCodeGenerator } from './client'
import type { AlgorithmCategory } from './categories'
import type { QualityIssue } from './quality/types'

/**
 * 带质量问题清单回发 AI，请其在保持算法逻辑前提下修复生成器。
 * 返回新的生成器源码，或 null（无配置/失败）。
 *
 * Task 0：复用 analyzeCodeGenerator 的请求通道（把"已有生成器 + 问题清单"作为代码再分析）。
 * 合并阶段 WS1 可改为直连专用 repair system prompt。
 */
export async function repairGenerator(args: {
  body: string
  language: string
  category: AlgorithmCategory
  issues: QualityIssue[]
  signal?: AbortSignal
}): Promise<{ body: string } | null> {
  const config = getApiConfig()
  if (!config) return null
  const issueList = args.issues
    .map(i => `- [${i.code}] ${i.message} → ${i.hint}`)
    .join('\n')
  const res = await analyzeCodeGenerator(
    {
      code:
        `/* 请修复以下可视化生成器：保持算法逻辑不变，仅按"问题清单"修正，使动画清晰表达算法。\n` +
        `算法类别：${args.category}\n问题清单：\n${issueList}\n*/\n${args.body}`,
      language: args.language,
      inputData: '',
      algorithmName: 'repair',
    },
    { signal: args.signal },
  )
  if (res.success && res.generator) return { body: res.generator.body }
  return null
}
