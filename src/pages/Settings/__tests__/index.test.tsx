import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mock the AI client so "test connection" never hits the network ---
const testApiConnection = vi.fn()
vi.mock('@/ai/client', () => ({
  testApiConnection: (...args: unknown[]) => testApiConnection(...args),
}))

// --- Mock i18n: passthrough t() returns the key, stable for assertions ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh', changeLanguage: vi.fn() },
  }),
}))

import Settings from '../index'

const STORAGE_KEY = 'algoviz-api-config'

// --- Per-test in-memory localStorage ---
let store: Record<string, string>
let realLocalStorage: PropertyDescriptor | undefined

function makeLocalStorage(): Storage {
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v)
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      store = {}
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length
    },
  } as Storage
}

beforeEach(() => {
  store = {}
  realLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeLocalStorage(),
    configurable: true,
    writable: true,
  })
  testApiConnection.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  if (realLocalStorage) {
    Object.defineProperty(globalThis, 'localStorage', realLocalStorage)
  } else {
    // @ts-expect-error cleanup when no original descriptor existed
    delete globalThis.localStorage
  }
})

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  )
}

// Helpers to find the three text inputs by their structural position.
// apiKey is a password input; baseUrl + model are the text inputs (in order).
function getApiKeyInput(): HTMLInputElement {
  const el = document.querySelector('input[type="password"], input[type="text"]')
  // first input overall is the apiKey field (password unless revealed)
  const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[]
  return (el as HTMLInputElement) ?? inputs[0]
}

function getAllInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll('input')) as HTMLInputElement[]
}

describe('Settings page', () => {
  it('renders the config form with its labelled fields and defaults', () => {
    renderSettings()

    // Section labels (i18n keys via passthrough t)
    expect(screen.getByText('settings.apiKey')).toBeTruthy()
    expect(screen.getByText('settings.baseUrl')).toBeTruthy()
    expect(screen.getByText('settings.model')).toBeTruthy()
    expect(screen.getByText('settings.title')).toBeTruthy()

    const inputs = getAllInputs()
    expect(inputs.length).toBe(3)

    // Defaults: empty apiKey, DeepSeek baseUrl + model
    const [apiKey, baseUrl, model] = inputs
    expect(apiKey.value).toBe('')
    expect(baseUrl.value).toBe('https://api.deepseek.com')
    expect(model.value).toBe('deepseek-v4-pro')
  })

  it('pre-fills fields from existing localStorage config', () => {
    store[STORAGE_KEY] = JSON.stringify({
      apiKey: 'sk-saved-123',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.4-mini',
    })

    renderSettings()

    const [apiKey, baseUrl, model] = getAllInputs()
    expect(apiKey.value).toBe('sk-saved-123')
    expect(baseUrl.value).toBe('https://api.openai.com/v1')
    expect(model.value).toBe('gpt-5.4-mini')
  })

  it('falls back to defaults when stored config is malformed JSON', () => {
    store[STORAGE_KEY] = '{not valid json'

    renderSettings()

    const [apiKey, baseUrl, model] = getAllInputs()
    expect(apiKey.value).toBe('')
    expect(baseUrl.value).toBe('https://api.deepseek.com')
    expect(model.value).toBe('deepseek-v4-pro')
  })

  it('typing into fields and blurring persists config to localStorage', () => {
    renderSettings()
    const [apiKey, baseUrl, model] = getAllInputs()

    fireEvent.change(apiKey, { target: { value: 'sk-typed-key' } })
    fireEvent.change(baseUrl, { target: { value: 'https://example.test/v1' } })
    fireEvent.change(model, { target: { value: 'gpt-5.5' } })
    fireEvent.blur(model)

    expect(store[STORAGE_KEY]).toBeTruthy()
    expect(JSON.parse(store[STORAGE_KEY])).toEqual({
      apiKey: 'sk-typed-key',
      baseUrl: 'https://example.test/v1',
      model: 'gpt-5.5',
    })
  })

  it('does NOT persist config when apiKey is empty (save guard)', () => {
    renderSettings()
    const [, baseUrl] = getAllInputs()

    // change baseUrl but leave apiKey empty, then blur to trigger saveConfig
    fireEvent.change(baseUrl, { target: { value: 'https://example.test/v1' } })
    fireEvent.blur(baseUrl)

    expect(STORAGE_KEY in store).toBe(false)
  })

  it('test-connection button is disabled when apiKey is empty', () => {
    renderSettings()
    const btn = screen.getByRole('button', {
      name: /settings\.testConnection/,
    }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('test-connection button enables once an apiKey is entered', () => {
    renderSettings()
    const [apiKey] = getAllInputs()
    fireEvent.change(apiKey, { target: { value: 'sk-abc' } })

    const btn = screen.getByRole('button', {
      name: /settings\.testConnection/,
    }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('successful test connection shows the connected status', async () => {
    testApiConnection.mockResolvedValue({ success: true, content: 'OK' })

    renderSettings()
    const [apiKey] = getAllInputs()
    fireEvent.change(apiKey, { target: { value: 'sk-abc' } })

    const btn = screen.getByRole('button', {
      name: /settings\.testConnection/,
    })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(screen.getByText('settings.connected')).toBeTruthy()
    })
    expect(testApiConnection).toHaveBeenCalledTimes(1)
    // config is passed through to the client
    expect(testApiConnection).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'sk-abc' }),
    )
    // no failure / testing indicator left over
    expect(screen.queryByText('settings.disconnected')).toBeNull()
  })

  it('test connection also persists the current config before testing', async () => {
    testApiConnection.mockResolvedValue({ success: true, content: 'OK' })

    renderSettings()
    const [apiKey, baseUrl, model] = getAllInputs()
    fireEvent.change(apiKey, { target: { value: 'sk-persist' } })
    fireEvent.change(baseUrl, { target: { value: 'https://p.test/v1' } })
    fireEvent.change(model, { target: { value: 'gpt-5.4' } })

    fireEvent.click(
      screen.getByRole('button', { name: /settings\.testConnection/ }),
    )

    await waitFor(() => {
      expect(screen.getByText('settings.connected')).toBeTruthy()
    })
    expect(JSON.parse(store[STORAGE_KEY])).toEqual({
      apiKey: 'sk-persist',
      baseUrl: 'https://p.test/v1',
      model: 'gpt-5.4',
    })
  })

  it('failed test connection shows the disconnected status', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    testApiConnection.mockResolvedValue({
      success: false,
      content: '',
      error: 'auth failed',
    })

    renderSettings()
    const [apiKey] = getAllInputs()
    fireEvent.change(apiKey, { target: { value: 'sk-bad' } })

    fireEvent.click(
      screen.getByRole('button', { name: /settings\.testConnection/ }),
    )

    await waitFor(() => {
      expect(screen.getByText('settings.disconnected')).toBeTruthy()
    })
    expect(screen.queryByText('settings.connected')).toBeNull()
    errSpy.mockRestore()
  })

  it('editing a field after a result resets status back to idle', async () => {
    testApiConnection.mockResolvedValue({ success: true, content: 'OK' })

    renderSettings()
    const [apiKey, baseUrl] = getAllInputs()
    fireEvent.change(apiKey, { target: { value: 'sk-abc' } })

    fireEvent.click(
      screen.getByRole('button', { name: /settings\.testConnection/ }),
    )
    await waitFor(() => {
      expect(screen.getByText('settings.connected')).toBeTruthy()
    })

    // Editing any field clears the connected status (back to idle label)
    fireEvent.change(baseUrl, { target: { value: 'https://changed.test' } })
    expect(screen.queryByText('settings.connected')).toBeNull()
    // idle status shows the default testConnection label (also on the button),
    // so there is at least one occurrence on screen.
    expect(screen.getAllByText('settings.testConnection').length).toBeGreaterThan(0)
  })

  it('preset provider buttons set base URL and model together', () => {
    renderSettings()

    fireEvent.click(screen.getByRole('button', { name: 'OpenAI' }))

    const [, baseUrl, model] = getAllInputs()
    expect(baseUrl.value).toBe('https://api.openai.com/v1')
    expect(model.value).toBe('gpt-5.4-mini')
  })

  it('toggling the show-key button reveals the apiKey value', () => {
    renderSettings()
    const apiKeyInput = getApiKeyInput()
    expect(apiKeyInput.getAttribute('type')).toBe('password')

    // The eye toggle is the <button> inside the apiKey input's relative wrapper
    // (NOT the page's first button, which belongs to the Header).
    const toggle = apiKeyInput.parentElement!.querySelector('button') as HTMLButtonElement
    fireEvent.click(toggle)

    const after = getAllInputs()[0]
    expect(after.getAttribute('type')).toBe('text')
  })

  it('shows estimated cost for a recognized model and a fallback note for an unknown one', () => {
    renderSettings()
    const [, , model] = getAllInputs()

    // Recognized default model -> estimated cost block present. The label text is
    // "<model> · settings.estimatedCost" in one span, so match a substring.
    const hasCost = (c: string) => c.includes('settings.estimatedCost')
    expect(screen.getAllByText(hasCost).length).toBeGreaterThan(0)
    expect(screen.queryByText('settings.unrecognizedModel')).toBeNull()

    // Unknown model -> fallback note replaces the cost block
    fireEvent.change(model, { target: { value: 'totally-unknown-model' } })
    expect(screen.getByText('settings.unrecognizedModel')).toBeTruthy()
    expect(screen.queryAllByText(hasCost).length).toBe(0)
  })
})
