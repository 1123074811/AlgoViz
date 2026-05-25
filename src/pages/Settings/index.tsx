import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/icons'

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed'

export default function Settings() {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [model, setModel] = useState('gpt-4o')
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [showKey, setShowKey] = useState(false)

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
    saveConfig()

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

      if (res.ok) {
        setStatus('connected')
      } else {
        const err = await res.json().catch(() => ({}))
        console.error('API error:', err)
        setStatus('failed')
      }
    } catch (e) {
      console.error('Connection failed:', e)
      setStatus('failed')
    }
  }

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
          </div>

          {/* Test Connection */}
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${current.color}`} />
                <span className="text-sm font-medium text-slate-600">
                  {current.label || t('settings.testConnection')}
                </span>
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
