export function resolveDemoDataEnabled(value: string | undefined, development = false) {
  if (value === undefined) return development
  return value.trim().toLowerCase() === 'true'
}

export const DEMO_DATA_ENABLED = resolveDemoDataEnabled(
  import.meta.env?.VITE_DEMO_DATA_ENABLED,
  import.meta.env?.DEV ?? false,
)
