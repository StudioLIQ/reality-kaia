import { describe, it, expect } from 'vitest'
import { computeDeadline } from '@/lib/status'

describe('computeDeadline', () => {
  it('returns 0 when no timestamps', () => {
    expect(computeDeadline({})).toBe(0)
  })

  it('uses openingTs + timeout when available', () => {
    const q = { openingTs: 1_000, timeoutSec: 3_600 }
    expect(computeDeadline(q)).toBe(4_600)
  })

  it('falls back to createdAt when openingTs is 0', () => {
    const q = { openingTs: 0, createdAt: 2_000, timeoutSec: 3_600 }
    expect(computeDeadline(q)).toBe(5_600)
  })

  it('falls back to createdTs or lastAnswerTs if present', () => {
    expect(computeDeadline({ openingTs: 0, createdTs: 3_000, timeout: 100 })).toBe(3_100)
    expect(computeDeadline({ openingTs: 0, lastAnswerTs: 4_000, timeoutSec: 200 })).toBe(4_200)
  })
})

