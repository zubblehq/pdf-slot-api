import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, jest } from 'bun:test'
import { useDevicePixelRatio } from '@/modules/pdf-editor/components/canvas/use-device-pixel-ratio'
import { stubGlobal, unstubAllGlobals } from './bun/stub-globals'

/**
 * PageCanvas sizes its backing store from devicePixelRatio. That value
 * changes whenever the user zooms the *browser* (Ctrl +/-) or drags the
 * window to a display with different scaling -- and a canvas painted for
 * the old ratio is then stretched to fit, blurring the page. The hook
 * must therefore re-render on ratio changes, not just read it once.
 */
describe('useDevicePixelRatio', () => {
  afterEach(() => unstubAllGlobals())

  it('reads the current ratio and re-renders when it changes', () => {
    let ratio = 1
    const listeners = new Set<() => void>()
    stubGlobal('devicePixelRatio', ratio)
    stubGlobal(
      'matchMedia',
      jest.fn(() => ({
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
      })),
    )

    const { result, unmount } = renderHook(() => useDevicePixelRatio())
    expect(result.current).toBe(1)
    expect(listeners.size).toBe(1)

    ratio = 2
    stubGlobal('devicePixelRatio', ratio)
    act(() => [...listeners].forEach((fn) => fn()))
    expect(result.current).toBe(2)
    // Re-subscribed for the new ratio's media query, old listener gone.
    expect(listeners.size).toBe(1)

    unmount()
    expect(listeners.size).toBe(0)
  })

  it('falls back to 1 without matchMedia (jsdom, old browsers)', () => {
    stubGlobal('devicePixelRatio', undefined)
    stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useDevicePixelRatio())
    expect(result.current).toBe(1)
  })
})
