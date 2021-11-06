import { RESERVED_PROPS } from './constants'

/**
 * Converts camelCase primitives to PascalCase.
 */
export const toPascalCase = (str) => str.charAt(0).toUpperCase() + str.substring(1)

/**
 * Prunes keys from an object.
 */
export const pruneKeys = (obj, ...keys) => {
  const keysToRemove = new Set(keys.flat())

  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keysToRemove.has(key)))
}

/**
 * Safely mutates an OGL element, respecting special JSX syntax.
 */
export const applyProps = (instance, newProps, oldProps = {}) => {
  // Filter identical props and reserved keys
  const identical = Object.keys(newProps).filter((key) => newProps[key] === oldProps[key])
  const props = pruneKeys(newProps, [...identical, ...RESERVED_PROPS])

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
        if (target && !target.set) {
          // We're modifying the first of the chain instead of element.
          // Remove the key from the chain and target it instead.
          key = chain.shift()
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
          target.set(value)
        }
      } else {
        root[key] = value
      }
    })
  }
}

/**
 * Shallow checks objects.
 */
export const checkShallow = (a, b) => {
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
export const diffProps = (instance, newProps, oldProps = {}) => {
  // Prune reserved props
  newProps = pruneKeys(newProps, RESERVED_PROPS)
  oldProps = pruneKeys(oldProps, RESERVED_PROPS)

  const changedProps = []

  // Sort through props
  Object.entries(newProps).forEach(([key, value]) => {
    // Skip primitives
    if (instance.isPrimitive && key === 'object') return
    // Skip if props match
    if (checkShallow(value, oldProps[key])) return

    // Add pierced props
    if (key.includes('-')) changedProps.push([key, value, false, key.split('-')])
  })

  return changedProps
}
