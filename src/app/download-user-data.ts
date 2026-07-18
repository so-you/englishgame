import type { UserDataExport } from '../infra/indexeddb/export-data'

export function downloadUserData(data: UserDataExport): void {
  const date = new Date(data.exportedAt).toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `english-roguelike-data-${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
