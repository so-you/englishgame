export function normalizeDisplayText(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ')
}

export function normalizeMatchText(value: string): string {
  return normalizeDisplayText(value).toLocaleLowerCase('en')
}

export function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0]
    previous[0] = leftIndex

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex]
      const insertion = previous[rightIndex - 1] + 1
      const deletion = above + 1
      const substitution =
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)

      previous[rightIndex] = Math.min(insertion, deletion, substitution)
      diagonal = above
    }
  }

  return previous[right.length]
}
