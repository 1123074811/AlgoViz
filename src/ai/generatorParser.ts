import type { RendererType } from '@/types/animation'
import { parseInputData } from './input'

export interface ParsedGenerator {
  algorithm: string
  type: RendererType
  body: string
  /** AI-suggested sample input, used to auto-fill an empty input box. Prefer LeetCode assignment format. */
  sampleInput?: string
  /** AI-provided time/space complexity (e.g. "O(n)"), shown on the algorithm card. */
  timeComplexity?: string
  spaceComplexity?: string
  /** AI-declared expected return value of the ORIGINAL code on @sample input (raw text, parsed lazily by verify.ts). */
  expectedResult?: string
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
  const timeMatch = code.match(/\/\/\s*@time\s+(.+)/)
  const spaceMatch = code.match(/\/\/\s*@space\s+(.+)/)
  const expectMatch = code.match(/\/\/\s*@expect\s+(.+)/)
  const timeComplexity = timeMatch ? timeMatch[1].trim() : undefined
  const spaceComplexity = spaceMatch ? spaceMatch[1].trim() : undefined
  const expectedResult = expectMatch ? expectMatch[1].trim() : undefined

  const algorithm = algoMatch ? algoMatch[1] : 'custom'
  const typeStr = typeMatch ? typeMatch[1] : 'array'
  const type = (VALID_TYPES as string[]).includes(typeStr) ? (typeStr as RendererType) : 'array'

  // @sample is only kept if it parses as valid user input (LeetCode assignment or JSON).
  let sampleInput: string | undefined
  if (sampleMatch) {
    const candidate = sampleMatch[1].trim()
    if (parseInputData(candidate).valid) {
      sampleInput = candidate
    }
  }

  // Body = code minus the directive comment lines.
  const body = code
    .split('\n')
    .filter(line => !/^\s*\/\/\s*@(algorithm|type|sample|time|space|expect)\b/.test(line))
    .join('\n')
    .trim()

  if (!body) return { success: false, error: '生成器代码体为空' }

  // Light sanity check: must reference the builder.
  if (!/\bb\s*\./.test(body)) {
    return { success: false, error: '生成器未调用构建器 b（输出格式不符）' }
  }

  return { success: true, generator: { algorithm, type, body, sampleInput, timeComplexity, spaceComplexity, expectedResult } }
}
