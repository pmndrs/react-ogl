import { useLayoutEffect, useEffect } from 'react'

/**
 * An SSR-friendly useLayoutEffect.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect
