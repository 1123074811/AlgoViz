export type AIErrorStage =
  | 'config' | 'request' | 'response' | 'json_extract'
  | 'json_parse' | 'schema_validation' | 'repair' | 'render_compatibility'

export type AIErrorSeverity = 'info' | 'warning' | 'error'

export interface AIValidationIssue {
  path: string
  code: string
  message: string
  suggestion?: string
  severity: AIErrorSeverity
  recoverable: boolean
}

export interface AIErrorReport {
  stage: AIErrorStage
  title: string
  message: string
  issues: AIValidationIssue[]
  suggestions: string[]
  canRetry: boolean
  rawResponse?: string
}

export interface AIRepairAttempt {
  type: 'local' | 'ai'
  success: boolean
  issuesBefore: number
  issuesAfter?: number
}

// Error templates for common scenarios
export const ERROR_TEMPLATES: Record<string, Omit<AIErrorReport, 'issues' | 'rawResponse'>> = {
  missingConfig: {
    stage: 'config',
    title: '缺少 API 配置',
    message: '请先在设置页面配置 API Key、Base URL 和模型名称。',
    suggestions: [
      '点击右上角设置进入 API 配置页面。',
      '确认 Base URL 使用 OpenAI 兼容的 /chat/completions 服务。',
    ],
    canRetry: false,
  },
  authFailed: {
    stage: 'request',
    title: '认证失败',
    message: 'API Key 无效、已过期，或当前模型不允许访问。',
    suggestions: [
      '检查 API Key 是否复制完整。',
      '确认账号余额和模型权限。',
      '重新保存设置后再试。',
    ],
    canRetry: false,
  },
  corsError: {
    stage: 'request',
    title: '网络请求被浏览器阻止 (CORS/连接重置)',
    message: '浏览器无法完成 API 请求。常见原因：CORS 跨域阻止、代理/VPN 拦截、防火墙断开连接。',
    suggestions: [
      '如果 F12 Network 显示 "ERR_CONNECTION_RESET"：关闭代理/VPN 后重试（最常见原因）。',
      '如果 F12 Network 显示 CORS 错误：OpenAI 官方 API 需后端代理；DeepSeek 等国内服务通常支持直连。',
      '尝试切换 Base URL：国内服务（如 api.deepseek.com）通常比海外服务更稳定。',
      '如使用公司/学校网络，可能是防火墙拦截了 HTTPS 请求。',
      '打开浏览器 F12→Console/Network 标签查看具体错误类型。',
    ],
    canRetry: false,
  },
  emptyResponse: {
    stage: 'response',
    title: 'AI 返回了空响应',
    message: '模型没有生成任何内容。',
    suggestions: ['点击重试尝试再次请求。', '检查模型是否可用。'],
    canRetry: true,
  },
  jsonParseFailed: {
    stage: 'json_parse',
    title: 'AI 返回内容不是合法 JSON',
    message: '模型返回了说明文字、不完整 JSON 或语法错误。',
    suggestions: [
      '系统将尝试自动请求模型修复格式。',
      '如果多次失败，请降低代码复杂度或减少输入规模。',
      '可以查看原始响应定位问题。',
    ],
    canRetry: true,
  },
  jsonExtractFailed: {
    stage: 'json_extract',
    title: '无法从响应中提取 JSON',
    message: 'AI 响应中未找到有效的 JSON 对象。',
    suggestions: [
      '检查 AI 是否返回了纯文本而非 JSON。',
      '尝试简化代码或调整 Prompt。',
    ],
    canRetry: true,
  },
  schemaFailed: {
    stage: 'schema_validation',
    title: 'AnimationScript 结构不符合规范',
    message: 'AI 返回了 JSON，但字段结构不能被当前动画引擎安全播放。',
    suggestions: [
      '检查错误路径对应的字段。',
      '图、树、矩阵数据需要使用指定结构。',
      '可以点击"自动修复格式"重新请求 AI 输出规范 JSON。',
    ],
    canRetry: true,
  },
  renderIncompatible: {
    stage: 'render_compatibility',
    title: '动画脚本暂不支持当前渲染结构',
    message: '脚本通过了基础校验，但当前渲染器无法完整表达该结构。',
    suggestions: [
      '尝试改用更简单的输入结构。',
      '检查 initialState.type 是否与算法类型一致。',
    ],
    canRetry: false,
  },
}
