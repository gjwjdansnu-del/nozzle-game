import type { MOCGeometryType } from './mocNozzle'

export interface ContourPoint {
  x: number
  y: number
}

export interface NozzleCsvMeta {
  geometryType: MOCGeometryType
  label: string
  Me?: number
  version?: string
}

function escapeCsvCell(v: number): string {
  const s = v.toExponential(10)
  return s
}

/** Upper-wall meridional contour CSV (x, y or r in metres). */
export function contourToCsv(
  points: ContourPoint[],
  meta?: NozzleCsvMeta,
): string {
  const lines: string[] = []
  if (meta) {
    lines.push(`# ${meta.label}`)
    lines.push(`# geometry=${meta.geometryType}`)
    if (meta.Me != null) lines.push(`# Me=${meta.Me}`)
    if (meta.version) lines.push(`# app=${meta.version}`)
    lines.push(`# units: x_m, ${meta.geometryType === 'planar' ? 'y_m' : 'r_m'}`)
  }
  const yHeader = meta?.geometryType === 'planar' ? 'y_m' : 'r_m'
  lines.push(`x_m,${yHeader}`)
  for (const p of points) {
    lines.push(`${escapeCsvCell(p.x)},${escapeCsvCell(p.y)}`)
  }
  return lines.join('\n')
}

export function wallArraysToContour(wallX: number[], wallY: number[]): ContourPoint[] {
  return wallX.map((x, i) => ({ x, y: wallY[i] }))
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
