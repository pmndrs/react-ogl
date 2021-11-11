import { RESERVED_PROPS } from './constants'
import { Instance, InstanceProps } from './types'

/**
 * Converts camelCase primitives to PascalCase.
 */
export const toPascalCase = (str: string) => str.charAt(0).toUpperCase() + str.substring(1)

/**
 * Checks whether key/value pair is an attribute
 */
export const isAttribute = (key: string, value: any) =>
  !key.startsWith('attributes-') && value?.data && typeof value?.size === 'number'

/**
 * Filters keys from an object.
 */
export const filterKeys = (obj: any, prune = false, ...keys: string[]) => {
  const keysToSelect = new Set(keys.flat())

  return Object.fromEntries(Object.entries(obj).filter(([key]) => keysToSelect.has(key) === !prune))
}

/**
 * Safely mutates an OGL element, respecting special JSX syntax.
 */
export const applyProps = (instance: Instance, newProps: InstanceProps, oldProps: InstanceProps = {}) => {
  // Filter identical props and reserved keys
  const identical = Object.keys(newProps).filter((key) => newProps[key] === oldProps[key])
  const handlers = Object.keys(newProps).filter((key) => typeof newProps[key] === 'function' && key.startsWith('on'))
  const props = filterKeys(newProps, true, ...identical, ...handlers, ...RESERVED_PROPS)

  // Mutate our OGL element
  if (Object.keys(props).length) {
    Object.entries(props).forEach(([key, value]) => {
      let root = instance
      let target = root[key]

      // Set deeply nested properties using piercing.
      // <element prop1-prop2={...} /> => Element.prop1.prop2 = ...
      if (key.includes('-')) {
        // Build new target from chained props
        const chain = key.split('-')
        target = chain.reduce((acc, key) => acc[key], instance)

        // Switch root of target if atomic
        if (!target?.set) {
          // We're modifying the first of the chain instead of element.
          // Remove the key from the chain and target it instead.
          key = chain.pop()
          root = chain.reduce((acc, key) => acc[key], instance)
        }
      }

      // Prefer to use properties' copy and set methods
      // otherwise, mutate the property directly
      if (target?.set) {
        if (target.constructor.name === value.constructor.name) {
          target.copy(value)
        } else if (Array.isArray(value)) {
          target.set(...value)
        } else {
          // Support shorthand scalar syntax like scale={1}
          const scalar = new Array(target.length).fill(value)
          target.set(...scalar)
        }
      } else {
        root[key] = value
      }
    })
  }

  // Collect event handlers.
  if (handlers.length) {
    instance.__handlers = handlers.reduce((acc, key) => ({ ...acc, [key]: newProps[key] }), {})
  }
}

/**
 * Shallow checks objects.
 */
export const checkShallow = (a: any, b: any) => {
  // If comparing arrays, shallow compare
  if (Array.isArray(a)) {
    // Check if types match
    if (!Array.isArray(b)) return false

    // Shallow compare for match
    if (a == b) return true

    // Sort through keys
    if (a.every((v, i) => v === b[i])) return true
  }

  // Atomically compare
  if (a === b) return true

  return false
}

/**
 * Prepares a set of changes to be applied to the instance.
 */
export const diffProps = (instance: Instance, newProps: InstanceProps, oldProps: InstanceProps = {}) => {
  // Prune reserved props
  newProps = filterKeys(newProps, true, ...RESERVED_PROPS)
  oldProps = filterKeys(oldProps, true, ...RESERVED_PROPS)

  const changedProps: InstanceProps = {}

  // Sort through props
  Object.entries(newProps).forEach(([key, value]) => {
    // Skip primitives
    if (instance.isPrimitive && key === 'object') return
    // Skip if props match
    if (checkShallow(value, oldProps[key])) return

    // Props changed, add them
    changedProps[key] = value
  })

  return changedProps
}
