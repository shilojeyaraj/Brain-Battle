import { retry, CircuitBreaker } from './retry'

describe('retry', () => {
  it('returns result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok')
    const result = await retry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and succeeds', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const result = await retry(fn, { initialDelay: 1, maxDelay: 1, maxAttempts: 3 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  }, 10000)

  it('throws after maxAttempts exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'))

    await expect(
      retry(fn, { maxAttempts: 2, initialDelay: 1, maxDelay: 1 })
    ).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(2)
  }, 10000)

  it('throws immediately for non-retryable errors', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fatal'))
    const retryable = (err: any) => err.message !== 'fatal'

    await expect(
      retry(fn, { retryable, maxAttempts: 3 })
    ).rejects.toThrow('fatal')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('uses default options when none provided', async () => {
    const fn = jest.fn().mockResolvedValue(42)
    const result = await retry(fn)
    expect(result).toBe(42)
  })
})

describe('CircuitBreaker', () => {
  it('starts in closed state', () => {
    const cb = new CircuitBreaker()
    expect(cb.getState()).toBe('closed')
  })

  it('allows execution in closed state', async () => {
    const cb = new CircuitBreaker()
    const result = await cb.execute(async () => 'ok')
    expect(result).toBe('ok')
  })

  it('opens after threshold failures', async () => {
    const cb = new CircuitBreaker(3, 60000, 30000)

    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(async () => { throw new Error('fail') })).rejects.toThrow()
    }

    expect(cb.getState()).toBe('open')
  })

  it('rejects immediately when open', async () => {
    const cb = new CircuitBreaker(1, 60000, 30000)
    await expect(cb.execute(async () => { throw new Error('fail') })).rejects.toThrow()

    expect(cb.getState()).toBe('open')
    await expect(cb.execute(async () => 'ok')).rejects.toThrow('Circuit breaker is open')
  })

  it('transitions to half-open after reset timeout', async () => {
    const cb = new CircuitBreaker(1, 60000, 100)

    await expect(cb.execute(async () => { throw new Error('fail') })).rejects.toThrow()
    expect(cb.getState()).toBe('open')

    await new Promise(r => setTimeout(r, 150))

    const result = await cb.execute(async () => 'recovered')
    expect(result).toBe('recovered')
    expect(cb.getState()).toBe('closed')
  })

  it('reset() restores closed state', async () => {
    const cb = new CircuitBreaker(1)
    await expect(cb.execute(async () => { throw new Error('fail') })).rejects.toThrow()
    expect(cb.getState()).toBe('open')

    cb.reset()
    expect(cb.getState()).toBe('closed')
  })
})
