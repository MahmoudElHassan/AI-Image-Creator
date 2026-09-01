import { describe, expect, it } from 'vitest'
import {
  isDuplicateBrandError,
  mapSupabaseBrandsError,
  validateBrandName,
} from './brand-data'

describe('validateBrandName', () => {
  it('accepts trimmed names between 2 and 120 chars', () => {
    expect(validateBrandName('  Northwind  ')).toBe('Northwind')
  })

  it('rejects too-short names', () => {
    expect(validateBrandName('a')).toEqual({
      error: 'Brand name must be between 2 and 120 characters',
    })
  })
})

describe('isDuplicateBrandError', () => {
  it('detects postgres unique violation', () => {
    expect(isDuplicateBrandError({ code: '23505', message: 'duplicate key' })).toBe(true)
  })

  it('detects index name in message', () => {
    expect(
      isDuplicateBrandError({ message: 'uq_brands_owner_name_ci violated' }),
    ).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isDuplicateBrandError({ code: '42501' })).toBe(false)
  })
})

describe('mapSupabaseBrandsError', () => {
  it('maps missing relation to SCHEMA_ERROR', () => {
    const mapped = mapSupabaseBrandsError({
      code: '42P01',
      message: 'relation "brands" does not exist',
    })
    expect(mapped.code).toBe('SCHEMA_ERROR')
    expect(mapped.status).toBe(503)
  })

  it('maps permission denied to FORBIDDEN', () => {
    const mapped = mapSupabaseBrandsError({
      code: '42501',
      message: 'permission denied for table brands',
    })
    expect(mapped.code).toBe('FORBIDDEN')
    expect(mapped.status).toBe(403)
  })

  it('defaults to UNKNOWN', () => {
    const mapped = mapSupabaseBrandsError({ code: 'XX000', message: 'boom' })
    expect(mapped.code).toBe('UNKNOWN')
    expect(mapped.status).toBe(500)
  })
})
