export type GeometryType = 'planar' | 'axisymmetric'

export interface NozzleGeometry {
  x: number[]
  areaRatio: number[]
  yWall: number[]
  throatIndex: number
  throatX: number
  AeOverAt: number
}

/** Smooth cosine blend from a0 at t=0 to a1 at t=1 */
function cosineBlend(t: number, a0: number, a1: number): number {
  const s = 0.5 * (1 - Math.cos(Math.PI * t))
  return a0 + (a1 - a0) * s
}

/**
 * Generate quasi-1D nozzle geometry.
 * Throat at 40% length; inlet Ai/At default 2; exit from Ae/At.
 */
export function generateNozzleGeometry(
  L: number,
  nPoints: number,
  AeOverAt: number,
  AiOverAt = 2.0,
  throatFraction = 0.4,
  geometryType: GeometryType = 'planar',
): NozzleGeometry {
  const x: number[] = []
  const areaRatio: number[] = []
  const n = Math.max(nPoints, 3)
  const xThroat = throatFraction * L
  let throatIndex = 0

  for (let i = 0; i < n; i++) {
    const xi = (i / (n - 1)) * L
    x.push(xi)

    let ar: number
    if (xi <= xThroat) {
      const t = xThroat > 0 ? xi / xThroat : 0
      ar = cosineBlend(t, AiOverAt, 1)
    } else {
      const t = L > xThroat ? (xi - xThroat) / (L - xThroat) : 1
      ar = cosineBlend(t, 1, AeOverAt)
    }
    areaRatio.push(ar)

    if (Math.abs(xi - xThroat) < L / n) throatIndex = i
  }

  const yWall = areaRatio.map((ar) =>
    geometryType === 'planar' ? 0.5 * ar : 0.5 * Math.sqrt(ar),
  )

  return {
    x,
    areaRatio,
    yWall,
    throatIndex,
    throatX: xThroat,
    AeOverAt,
  }
}

/** Throat area from diameter (planar height or axisymmetric diameter) */
export function throatArea(
  throatSizeMm: number,
  geometryType: GeometryType,
): number {
  const d = throatSizeMm * 1e-3
  if (geometryType === 'planar') {
    return d // height ht, unit depth → area = ht * 1
  }
  const r = d / 2
  return Math.PI * r * r
}

/** Exit area from Ae/At and throat area */
export function exitArea(At: number, AeOverAt: number): number {
  return At * AeOverAt
}
