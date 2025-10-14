import { renderHook, act } from '@testing-library/react'
import { useDebounce, useDebouncedCallback } from '@/hooks/use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    expect(result.current).toBe('initial')

    // Update value
    rerender({ value: 'updated', delay: 500 })

    // Value should not change immediately
    expect(result.current).toBe('initial')

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Value should be updated after delay
    expect(result.current).toBe('updated')
  })

  it('should cancel previous timeout on rapid updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    rerender({ value: 'first', delay: 500 })

    act(() => {
      jest.advanceTimersByTime(250)
    })

    // Update again before timeout completes
    rerender({ value: 'second', delay: 500 })

    act(() => {
      jest.advanceTimersByTime(250)
    })

    // Should still be initial (neither timeout completed)
    expect(result.current).toBe('initial')

    act(() => {
      jest.advanceTimersByTime(250)
    })

    // Should be 'second' now (only the last timeout completed)
    expect(result.current).toBe('second')
  })

  it('should work with different delays', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 1000 } }
    )

    rerender({ value: 'updated', delay: 1000 })

    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('initial')

    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('updated')
  })

  it('should work with numbers', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 500 } }
    )

    expect(result.current).toBe(0)

    rerender({ value: 42, delay: 500 })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current).toBe(42)
  })

  it('should work with objects', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: { name: 'initial' }, delay: 500 } }
    )

    expect(result.current).toEqual({ name: 'initial' })

    rerender({ value: { name: 'updated' }, delay: 500 })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current).toEqual({ name: 'updated' })
  })
})

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should debounce callback execution', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    // Call the debounced function
    act(() => {
      result.current('test')
    })

    // Callback should not be called immediately
    expect(callback).not.toHaveBeenCalled()

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Callback should be called now
    expect(callback).toHaveBeenCalledWith('test')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should cancel previous timeout on rapid calls', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    // Call multiple times rapidly
    act(() => {
      result.current('first')
    })

    act(() => {
      jest.advanceTimersByTime(250)
    })

    act(() => {
      result.current('second')
    })

    act(() => {
      jest.advanceTimersByTime(250)
    })

    // Callback should not be called yet
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(250)
    })

    // Callback should be called only once with the last argument
    expect(callback).toHaveBeenCalledWith('second')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should work with multiple arguments', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('arg1', 'arg2', 'arg3')
    })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
  })

  it('should work with different delays', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 1000))

    act(() => {
      result.current('test')
    })

    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(callback).toHaveBeenCalledWith('test')
  })
})
