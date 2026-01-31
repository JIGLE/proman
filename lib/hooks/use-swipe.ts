import { useState, useCallback, useRef, TouchEvent } from 'react'

interface SwipeState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  deltaX: number
  deltaY: number
  isSwiping: boolean
  direction: 'left' | 'right' | 'up' | 'down' | null
}

interface UseSwipeOptions {
  threshold?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onSwipeStart?: () => void
  onSwipeEnd?: (direction: SwipeState['direction']) => void
  preventScroll?: boolean
}

interface UseSwipeReturn {
  handlers: {
    onTouchStart: (e: TouchEvent) => void
    onTouchMove: (e: TouchEvent) => void
    onTouchEnd: (e: TouchEvent) => void
  }
  state: SwipeState
  reset: () => void
}

const initialState: SwipeState = {
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  deltaX: 0,
  deltaY: 0,
  isSwiping: false,
  direction: null,
}

/**
 * Hook for handling swipe gestures on mobile
 * 
 * @example
 * const { handlers, state } = useSwipe({
 *   threshold: 50,
 *   onSwipeLeft: () => handleDelete(),
 *   onSwipeRight: () => handleEdit(),
 * })
 * 
 * return <div {...handlers}>Swipeable content</div>
 */
export function useSwipe(options: UseSwipeOptions = {}): UseSwipeReturn {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeEnd,
    preventScroll = false,
  } = options

  const [state, setState] = useState<SwipeState>(initialState)
  const stateRef = useRef<SwipeState>(initialState)

  const reset = useCallback(() => {
    setState(initialState)
    stateRef.current = initialState
  }, [])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    const newState: SwipeState = {
      ...initialState,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isSwiping: true,
    }
    setState(newState)
    stateRef.current = newState
    onSwipeStart?.()
  }, [onSwipeStart])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!stateRef.current.isSwiping) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - stateRef.current.startX
    const deltaY = touch.clientY - stateRef.current.startY

    // Determine direction based on larger delta
    let direction: SwipeState['direction'] = null
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left'
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
    }

    // Prevent page scroll if swiping horizontally
    if (preventScroll && Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault()
    }

    const newState: SwipeState = {
      ...stateRef.current,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX,
      deltaY,
      direction,
    }
    setState(newState)
    stateRef.current = newState
  }, [preventScroll])

  const handleTouchEnd = useCallback(() => {
    const { deltaX, deltaY, direction } = stateRef.current

    // Check if swipe exceeded threshold
    if (Math.abs(deltaX) >= threshold || Math.abs(deltaY) >= threshold) {
      switch (direction) {
        case 'left':
          onSwipeLeft?.()
          break
        case 'right':
          onSwipeRight?.()
          break
        case 'up':
          onSwipeUp?.()
          break
        case 'down':
          onSwipeDown?.()
          break
      }
    }

    onSwipeEnd?.(direction)
    reset()
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipeEnd, reset])

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    state,
    reset,
  }
}

/**
 * Hook for detecting if device is touch-capable
 */
export function useIsTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Hook for detecting mobile viewport
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  if (typeof window !== 'undefined') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useState(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < breakpoint)
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    })
  }

  return isMobile
}
