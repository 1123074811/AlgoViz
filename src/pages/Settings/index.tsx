import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/icons'

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed'

const MODEL_PRICING: Record<string, { input: number; output: number; label: string }> = {
  'gpt-4o': { input: 2.5, output: 10, label: 'GPT-4o' },
  'gpt-4o-mini': { input: 0.15, output: 0.6, label: 'GPT-4o Mini' },
  'gpt-4-turbo': { input: 10, output: 30, label: 'GPT-4 Turbo' },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5, label: 'GPT-3.5 Turbo' },
  'claude-3-opus': { input: 15, output: 75, label: 'Claude 3 Opus' },
  'claude-3.5-sonnet': { input: 3, output: 15, label: 'Claude 3.5 Sonnet' },
  'claude-3-haiku': { input: 0.25, output: 1.25, label: 'Claude 3 Haiku' },
  'deepseek-chat': { input: 0.14, output: 0.28, label: 'DeepSeek V3' },
}

// Rough token estimation: ~4 chars per token for English, ~1.5 for Chinese
const ESTIMATED_SYSTEM_PROMPT_TOKENS = 800
const ESTIMATED_PER_STEP_TOKENS = 80
const ESTIMATED_OVERHEAD_TOKENS = 200

export default function Settings() {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [model, setModel] = useState('gpt-4o')
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [showKey, setShowKey] = useState(false)
  const [responseTime, setResponseTime] = useState<number | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('algoviz-api-config')
    if (saved) {
      try {
        const config = JSON.parse(saved)
        if (config.apiKey) setApiKey(config.apiKey)
        if (config.baseUrl) setBaseUrl(config.baseUrl)
        if (config.model) setModel(config.model)
      } catch { /* ignore corrupt data */ }
    }
  }, [])

  const saveConfig = useCallback(() => {
    if (!apiKey.trim()) return
    localStorage.setItem(
      'algoviz-api-config',
      JSON.stringify({ apiKey, baseUrl, model })
    )
  }, [apiKey, baseUrl, model])

  const handleTestConnection = async () => {
    if (!apiKey.trim()) return
    setStatus('testing')
    setResponseTime(null)
    saveConfig()

    const start = performance.now()
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      })

      setResponseTime(Math.round(performance.now() - start))

      if (res.ok) {
        setStatus('connected')
      } else {
        const err = await res.json().catch(() => ({}))
        console.error('API error:', err)
        setStatus('failed')
      }
    } catch (e) {
      setResponseTime(Math.round(performance.now() - start))
      console.error('Connection failed:', e)
      setStatus('failed')
    }
  }

  const tokenEstimate = useMemo(() => {
    const steps = 40 // average steps
    const inputTokens = ESTIMATED_SYSTEM_PROMPT_TOKENS + ESTIMATED_OVERHEAD_TOKENS + 300 // ~300 for code
    const outputTokens = steps * ESTIMATED_PER_STEP_TOKENS
    const pricing = MODEL_PRICING[model]

    if (!pricing) {
      return { inputTokens, outputTokens, cost: null, label: model }
    }

    const costPerReq =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output

    return {
      inputTokens,
      outputTokens,
      cost: costPerReq,
      label: pricing.label,
    }
  }, [model])

  const statusIndicator = {
    idle: { color: 'bg-slate-300', label: '' },
    testing: { color: 'bg-yellow-400 animate-pulse', label: t('settings.testing') },
    connected: { color: 'bg-green-500', label: t('settings.connected') },
    failed: { color: 'bg-red-500', label: t('settings.disconnected') },
  }

  const current = statusIndicator[status]

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="max-w-2xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          配置你的 OpenAI 兼容 API，即可启用 AI 驱动的算法可视化分析
        </p>

        <div className="space-y-6">
          {/* API Key */}
          <div className="bg-white rounded-xl border border-border p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t('settings.apiKey')}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setStatus('idle')
                }}
                onBlur={saveConfig}
                placeholder={t('settings.apiKeyPlaceholder')}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-border
                           bg-white text-sm font-code outline-none
                           focus:border-primary focus:ring-1 focus:ring-primary-200
                           transition-colors"
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7
                           flex items-center justify-center rounded-md
                           text-muted hover:text-slate-600 hover:bg-slate-100
                           transition-colors cursor-pointer border-none bg-transparent"
              >
                <Icon name={showKey ? 'eye-off' : 'eye'} size={16} />
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div className="bg-white rounded-xl border border-border p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t('settings.baseUrl')}
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value)
                setStatus('idle')
              }}
              onBlur={saveConfig}
              className="w-full px-3 py-2 rounded-lg border border-border
                         bg-white text-sm font-code outline-none
                         focus:border-primary focus:ring-1 focus:ring-primary-200
                         transition-colors"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { url: 'https://api.openai.com/v1', label: 'OpenAI' },
                { url: 'https://api.deepseek.com/v1', label: 'DeepSeek' },
                { url: 'https://api.moonshot.cn/v1', label: 'Moonshot' },
              ].map((preset) => (
                <button
                  key={preset.url}
                  onClick={() => {
                    setBaseUrl(preset.url)
                    setStatus('idle')
                  }}
                  className={`text-[10px] px-2 py-1 rounded-md border cursor-pointer
                    transition-colors
                    ${baseUrl === preset.url
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-border bg-white text-slate-500 hover:border-slate-300'
                    }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div className="bg-white rounded-xl border border-border p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t('settings.model')}
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => {
                setModel(e.target.value)
                setStatus('idle')
              }}
              onBlur={saveConfig}
              placeholder={t('settings.modelPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-border
                         bg-white text-sm font-code outline-none
                         focus:border-primary focus:ring-1 focus:ring-primary-200
                         transition-colors"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(MODEL_PRICING).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => {
                    setModel(key)
                    setStatus('idle')
                  }}
                  className={`text-[10px] px-2 py-1 rounded-md border cursor-pointer
                    transition-colors
                    ${model === key
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-border bg-white text-slate-500 hover:border-slate-300'
                    }`}
                >
                  {info.label}
                </button>
              ))}
            </div>
          </div>

          {/* Token Usage Estimate */}
          <div className="bg-white rounded-xl border border-border p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Token 用量预估
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-surface text-center">
                <div className="text-[10px] text-slate-400 mb-0.5">输入 Token</div>
                <div className="text-lg font-code font-semibold text-slate-700">
                  ~{tokenEstimate.inputTokens.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface text-center">
                <div className="text-[10px] text-slate-400 mb-0.5">输出 Token</div>
                <div className="text-lg font-code font-semibold text-slate-700">
                  ~{tokenEstimate.outputTokens.toLocaleString()}
                </div>
              </div>
            </div>
            {tokenEstimate.cost !== null && (
              <div className="mt-3 p-3 rounded-lg bg-primary-50 text-center">
                <span className="text-[10px] text-slate-500">
                  {tokenEstimate.label} · 预估单次分析费用
                </span>
                <div className="text-sm font-code font-semibold text-primary">
                  ${tokenEstimate.cost.toFixed(4)}
                </div>
              </div>
            )}
            {tokenEstimate.cost === null && (
              <div className="mt-3 text-[10px] text-slate-400 text-center">
                未识别模型，无法预估费用。参考：GPT-4o 约 $0.003/次
              </div>
            )}
          </div>

          {/* Test Connection */}
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${current.color}`} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-600">
                    {current.label || t('settings.testConnection')}
                  </span>
                  {responseTime !== null && (
                    <span className="text-[10px] text-slate-400">
                      {responseTime}ms
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={status === 'testing' || !apiKey.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
                           hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors cursor-pointer border-none
                           flex items-center gap-2"
              >
                {status === 'testing' && (
                  <Icon name="loader2" size={14} className="animate-spin" />
                )}
                {status === 'testing'
                  ? t('settings.testing')
                  : t('settings.testConnection')}
              </button>
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-start gap-2 p-4 rounded-lg bg-warning-50 text-sm text-slate-600">
            <Icon name="alert-circle" size={16} className="text-warning shrink-0 mt-0.5" />
            <span>{t('settings.encryptionNote')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
