import { useLayoutEffect, useEffect, Component } from 'react'

/**
 * An SSR-friendly useLayoutEffect.
 */
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Used to block rendering via its `set` prop. Useful for suspenseful effects.
 */
export const Block = ({ set }) => {
  useIsomorphicLayoutEffect(() => {
    set(new Promise(() => null))
    return () => set(false)
  }, [])

  return null
}

/**
 * Generic error boundary. Calls its `set` prop on error.
 */
export class ErrorBoundary extends Component {
  state = { error: false }
  static getDerivedStateFromError = () => ({ error: true })
  componentDidCatch(error) {
    this.props.set(error)
  }
  render() {
    return this.state.error ? null : this.props.children
  }
}
