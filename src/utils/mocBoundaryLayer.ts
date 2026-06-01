/**
 * Displacement-thickness boundary-layer correction on MOC wall contour.
 * Edenfield (1968) and linear Me correlation (AeroMOC / Liu 2003).
 */

import { staticPressure, staticTemperature, velocity } from './gasDynamics'
import type { MOCResult } from './moc2d'
import { machFromPrandtlMeyer } from './prandtlMeyer'
import { sutherlandViscosity } from './sutherland'

export type BLMethod = 'edenfield' | 'linear'

export interface BoundaryLayerOptions {
  method: BLMethod
  /** BL origin x [m]; points with x < x0 keep inviscid radius. */
  x0: number
  p0: number
  T0: number
  gamma: number
  R: number
  Me: number
  /** Wall temperature [K]; null = adiabatic (recovery temperature). */
  tw?: number | null
}

export interface BoundaryLayerResult {
  wallX: number[]
  wallY: number[]
  delta: number[]
  x0: number
  method: BLMethod
}

function prandtlRecovery(gamma: number): number {
  return Math.pow(gamma / (gamma + 1), 1 / 3)
}

/** Edenfield δ along wall (AeroMOC blc_edenfield). */
export function displacementEdenfield(
  x: number,
  x0: number,
  p: number,
  M: number,
  TStatic: number,
  T0: number,
  gamma: number,
  R: number,
  tw: number | null,
): number {
  if (x <= x0) return 0
  const dx = x - x0
  const rRec = prandtlRecovery(gamma)
  const tAd = TStatic + rRec * (T0 - TStatic)
  const tWall = tw ?? tAd
  const tRef = 0.5 * (tWall + TStatic) + 0.22 * (tAd - TStatic)
  const muRef = sutherlandViscosity(tRef)
  const rhoRef = p / (R * tRef)
  const Ue = velocity(M, TStatic, gamma, R)
  const ReRef = (rhoRef * Ue * dx) / muRef
  if (ReRef <= 0) return 0
  return 0.42 * dx * Math.pow(ReRef, -0.2775)
}

/** Linear δ ≈ (x-x0) tan β(Me) (Liu 2003 polynomial in AeroMOC). */
export function displacementLinear(x: number, x0: number, Me: number): number {
  if (x <= x0) return 0
  const a0 = -7.16665
  const a1 = 6.694431
  const a2 = -2.209718
  const a3 = 0.3385411
  const a4 = -0.023611065
  const a5 = 0.00060763751
  const betaDeg =
    a0 + a1 * Me + a2 * Me ** 2 + a3 * Me ** 3 + a4 * Me ** 4 + a5 * Me ** 5
  return (x - x0) * Math.tan((betaDeg * Math.PI) / 180)
}

export function applyBoundaryLayerCorrection(
  moc: MOCResult,
  opts: BoundaryLayerOptions,
): BoundaryLayerResult {
  const { method, x0, p0, T0, gamma, R, Me, tw = null } = opts

  const n = moc.wallX.length
  const wallX = [...moc.wallX]
  const wallY = [...moc.wallY]
  const delta = new Array<number>(n)

  for (let i = 0; i < n; i++) {
    const x = wallX[i]
    const theta = moc.wallTheta[i] ?? 0
    const nu = moc.wallNu[i] ?? 0
    const M = machFromPrandtlMeyer(nu, gamma)
    const TStatic = staticTemperature(T0, M, gamma)
    const p = staticPressure(p0, M, gamma)

    let d = 0
    if (method === 'edenfield') {
      d = displacementEdenfield(x, x0, p, M, TStatic, T0, gamma, R, tw)
    } else {
      d = displacementLinear(x, x0, Me)
    }
    delta[i] = d

    // Outward displacement along normal defined by local flow angle (AeroMOC convention)
    wallX[i] = x - d * Math.sin(theta)
    wallY[i] = moc.wallY[i] + d * Math.cos(theta)
  }

  return { wallX, wallY, delta, x0, method }
}

/** Default BL origin: throat centerline x or 0. */
export function defaultBoundaryLayerOrigin(moc: MOCResult): number {
  if (moc.centerlineX.length > 0) return moc.centerlineX[0]
  if (moc.wallX.length > 0) return Math.min(...moc.wallX)
  return 0
}
