import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/icons'
import Header from '@/components/Layout/Header'

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed'

/** Latest model pricing (USD per 1M tokens), updated May 2026 */
const MODEL_PRICING: Record<string, { input: number; output: number; label: string }> = {
  'gpt-5.5':         { input: 5.0,  output: 30,  label: 'GPT-5.5' },
  'gpt-5.4':         { input: 2.5,  output: 15,  label: 'GPT-5.4' },
  'gpt-5.4-mini':    { input: 0.75, output: 4.5, label: 'GPT-5.4 Mini' },
  'gpt-5.4-nano':    { input: 0.20, output: 1.25,label: 'GPT-5.4 Nano' },
  'claude-opus-4-7':   { input: 5.0,  output: 25,  label: 'Claude Opus 4.7' },
  'claude-sonnet-4-6': { input: 3.0,  output: 15,  label: 'Claude Sonnet 4.6' },
  'claude-haiku-4-5':  { input: 1.0,  output: 5.0, label: 'Claude Haiku 4.5' },
  'gemini-3.1-pro':  { input: 2.0,  output: 12,  label: 'Gemini 3.1 Pro' },
  'gemini-2.5-flash':{ input: 0.30, output: 2.5, label: 'Gemini 2.5 Flash' },
  'deepseek-v4-pro':   { input: 0.44, output: 0.87, label: 'DeepSeek V4 Pro' },
  'deepseek-v4-flash': { input: 0.14, output: 0.28, label: 'DeepSeek V4 Flash' },
  'deepseek-v3.2':     { input: 0.26, output: 0.38, label: 'DeepSeek V3.2' },
}

const ESTIMATED_SYSTEM_PROMPT_TOKENS = 800
const ESTIMATED_PER_STEP_TOKENS = 80
const ESTIMATED_OVERHEAD_TOKENS = 200

export default function Settings() {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [model, setModel] = useState('deepseek-v4-pro')
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
    <div className="h-full flex flex-col bg-surface">
      <Header />
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          {t('settings.subtitle')}
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
                { url: 'https://api.anthropic.com/v1', label: 'Anthropic' },
                { url: 'https://generativelanguage.googleapis.com/v1beta/openai', label: 'Gemini' },
                { url: 'https://api.deepseek.com/v1', label: 'DeepSeek' },
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
              {t('settings.tokenEstimate')}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-surface text-center">
                <div className="text-[10px] text-slate-400 mb-0.5">{t('settings.inputTokens')}</div>
                <div className="text-lg font-code font-semibold text-slate-700">
                  ~{tokenEstimate.inputTokens.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface text-center">
                <div className="text-[10px] text-slate-400 mb-0.5">{t('settings.outputTokens')}</div>
                <div className="text-lg font-code font-semibold text-slate-700">
                  ~{tokenEstimate.outputTokens.toLocaleString()}
                </div>
              </div>
            </div>
            {tokenEstimate.cost !== null && (
              <div className="mt-3 p-3 rounded-lg bg-primary-50 text-center">
                <span className="text-[10px] text-slate-500">
                  {tokenEstimate.label} · {t('settings.estimatedCost')}
                </span>
                <div className="text-sm font-code font-semibold text-primary">
                  ${tokenEstimate.cost.toFixed(4)}
                </div>
              </div>
            )}
            {tokenEstimate.cost === null && (
              <div className="mt-3 text-[10px] text-slate-400 text-center">
                {t('settings.unrecognizedModel')}
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
    </div>
  )
}
