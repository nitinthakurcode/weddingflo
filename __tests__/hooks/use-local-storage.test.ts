import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '@/hooks/use-local-storage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('should return initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    const [value] = result.current
    expect(value).toBe('initial')
  })

  it('should store and retrieve value from localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    act(() => {
      const [, setValue] = result.current
      setValue('new value')
    })

    const [value] = result.current
    expect(value).toBe('new value')
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('new value'))
  })

  it('should update value using function', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 5))

    act(() => {
      const [, setValue] = result.current
      setValue((prev) => prev + 10)
    })

    const [value] = result.current
    expect(value).toBe(15)
  })

  it('should work with objects', () => {
    const initialObject = { name: 'John', age: 30 }
    const { result } = renderHook(() => useLocalStorage('test-key', initialObject))

    act(() => {
      const [, setValue] = result.current
      setValue({ name: 'Jane', age: 25 })
    })

    const [value] = result.current
    expect(value).toEqual({ name: 'Jane', age: 25 })
  })

  it('should work with arrays', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', [1, 2, 3]))

    act(() => {
      const [, setValue] = result.current
      setValue([4, 5, 6])
    })

    const [value] = result.current
    expect(value).toEqual([4, 5, 6])
  })

  it('should remove value from localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    act(() => {
      const [, setValue] = result.current
      setValue('stored value')
    })

    expect(localStorage.getItem('test-key')).not.toBeNull()

    act(() => {
      const [, , removeValue] = result.current
      removeValue()
    })

    const [value] = result.current
    expect(value).toBe('initial')
    expect(localStorage.getItem('test-key')).toBeNull()
  })

  it('should handle invalid JSON in localStorage', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    localStorage.setItem('test-key', 'invalid json{')

    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'))

    const [value] = result.current
    expect(value).toBe('fallback')
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should sync with existing localStorage value on mount', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'))

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    const [value] = result.current
    expect(value).toBe('stored')
  })

  it('should handle storage errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage error')
    })

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    act(() => {
      const [, setValue] = result.current
      setValue('new value')
    })

    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
    setItemSpy.mockRestore()
  })

  it('should handle multiple instances with same key', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('shared-key', 'value1'))
    const { result: result2 } = renderHook(() => useLocalStorage('shared-key', 'value2'))

    // Both should read the same initial localStorage value (or default to their initial values)
    // Since localStorage is empty, they'll use their initial values
    expect(result1.current[0]).toBe('value1')
    expect(result2.current[0]).toBe('value2')

    // Update from first instance
    act(() => {
      const [, setValue] = result1.current
      setValue('updated')
    })

    // First instance should be updated
    expect(result1.current[0]).toBe('updated')
    expect(localStorage.getItem('shared-key')).toBe(JSON.stringify('updated'))
  })

  it('should work with boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', false))

    expect(result.current[0]).toBe(false)

    act(() => {
      const [, setValue] = result.current
      setValue(true)
    })

    expect(result.current[0]).toBe(true)
  })

  it('should work with null values', () => {
    const { result } = renderHook(() => useLocalStorage<string | null>('test-key', null))

    expect(result.current[0]).toBe(null)

    act(() => {
      const [, setValue] = result.current
      setValue('not null')
    })

    expect(result.current[0]).toBe('not null')
  })

  it('should persist complex nested objects', () => {
    const complexObject = {
      user: {
        name: 'John',
        settings: {
          theme: 'dark',
          notifications: ['email', 'push'],
        },
      },
    }

    const { result } = renderHook(() => useLocalStorage('test-key', complexObject))

    act(() => {
      const [, setValue] = result.current
      setValue({
        user: {
          name: 'Jane',
          settings: {
            theme: 'light',
            notifications: ['email'],
          },
        },
      })
    })

    expect(result.current[0]).toEqual({
      user: {
        name: 'Jane',
        settings: {
          theme: 'light',
          notifications: ['email'],
        },
      },
    })
  })
})
