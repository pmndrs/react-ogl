import * as React from 'react'

/**
 * An SSR-friendly useLayoutEffect.
 */
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect
