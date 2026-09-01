import { afterEach, describe, expect, it, vi } from 'vitest'
import { shouldUseNativeApi } from './api-route'

describe('shouldUseNativeApi', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is true on Vercel with loopback backend default', () => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('NEXT_SERVER_API_URL', 'http://127.0.0.1:8000')
    expect(shouldUseNativeApi()).toBe(true)
  })

  it('is false when not on Vercel', () => {
    vi.stubEnv('VERCEL', '')
    expect(shouldUseNativeApi()).toBe(false)
  })

  it('is false on Vercel when backend URL points off loopback', () => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('NEXT_SERVER_API_URL', 'https://api.example.com')
    expect(shouldUseNativeApi()).toBe(false)
  })
})
