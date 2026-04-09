export const serializeTags = (tags?: string[]) => (tags && tags.length > 0 ? tags.join(',') : null)

export const deserializeTags = (value: string | null | undefined) => {
  if (!value) return []

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}
