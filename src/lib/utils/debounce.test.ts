import { debounce, throttle } from './debounce'

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

describe('debounce', () => {
  it('delays function execution', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('resets timer on subsequent calls', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced()
    jest.advanceTimersByTime(50)
    debounced()
    jest.advanceTimersByTime(50)

    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('passes arguments to the original function', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced('hello', 42)
    jest.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('hello', 42)
  })

  it('uses the last call arguments when called multiple times', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')
    debounced('third')
    jest.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('third')
  })
})

describe('throttle', () => {
  it('executes immediately on first call', () => {
    const fn = jest.fn()
    const throttled = throttle(fn, 100)

    throttled()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ignores calls within the throttle window', () => {
    const fn = jest.fn()
    const throttled = throttle(fn, 100)

    throttled()
    throttled()
    throttled()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('allows execution after throttle window expires', () => {
    const fn = jest.fn()
    const throttled = throttle(fn, 100)

    throttled()
    jest.advanceTimersByTime(100)
    throttled()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('passes arguments correctly', () => {
    const fn = jest.fn()
    const throttled = throttle(fn, 100)

    throttled('arg1')
    expect(fn).toHaveBeenCalledWith('arg1')
  })
})
