import type { RendererType } from '@/types/animation'

export interface ParsedGenerator {
  algorithm: string
  type: RendererType
  body: string
  /** AI-suggested sample input (raw JSON string), used to auto-fill an empty input box. */
  sampleInput?: string
}

export interface GeneratorParseResult {
  success: boolean
  generator?: ParsedGenerator
  error?: string
}

const VALID_TYPES: RendererType[] = ['array', 'graph', 'tree', 'linked_list', 'matrix']

/** Parse the AI's generator response: a ```js block with @algorithm/@type directives. */
export function parseGeneratorResponse(raw: string): GeneratorParseResult {
  // Extract the js code block, or fall back to the whole response.
  const blockMatch = raw.match(/```(?:js|javascript)?\s*([\s\S]*?)```/)
  const code = (blockMatch ? blockMatch[1] : raw).trim()
  if (!code) return { success: false, error: '响应为空，未找到生成器代码' }

  const algoMatch = code.match(/\/\/\s*@algorithm\s+([A-Za-z0-9_]+)/)
  const typeMatch = code.match(/\/\/\s*@type\s+([A-Za-z_]+)/)
  const sampleMatch = code.match(/\/\/\s*@sample\s+(.+)/)

  const algorithm = algoMatch ? algoMatch[1] : 'custom'
  const typeStr = typeMatch ? typeMatch[1] : 'array'
  const type = (VALID_TYPES as string[]).includes(typeStr) ? (typeStr as RendererType) : 'array'

  // @sample is only kept if it parses as valid JSON.
  let sampleInput: string | undefined
  if (sampleMatch) {
    const candidate = sampleMatch[1].trim()
    try {
      JSON.parse(candidate)
      sampleInput = candidate
    } catch {
      sampleInput = undefined
    }
  }

  // Body = code minus the directive comment lines.
  const body = code
    .split('\n')
    .filter(line => !/^\s*\/\/\s*@(algorithm|type|sample)\b/.test(line))
    .join('\n')
    .trim()

  if (!body) return { success: false, error: '生成器代码体为空' }

  // Light sanity check: must reference the builder.
  if (!/\bb\s*\./.test(body)) {
    return { success: false, error: '生成器未调用构建器 b（输出格式不符）' }
  }

  return { success: true, generator: { algorithm, type, body, sampleInput } }
}
