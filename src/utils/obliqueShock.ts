import { shockPressureRatio } from './shockRelations'

const DEG = 180 / Math.PI

/**
 * Oblique shock angle β (degrees, measured from upstream flow direction)
 * for given upstream Mach and static pressure ratio p2/p1 across the shock.
 * Returns null if p2/p1 < 1 (no compression shock).
 */
export function obliqueShockAngleDeg(
  M1: number,
  gamma: number,
  pressureRatio: number,
): number | null {
  if (pressureRatio < 1 || M1 <= 1) return null

  const pMax = shockPressureRatio(M1, gamma)
  if (pressureRatio >= pMax - 1e-9) return 90

  const mu = Math.asin(1 / M1)
  let lo = mu + 1e-5
  let hi = Math.PI / 2 - 1e-6

  const pAt = (beta: number) => {
    const mn1 = M1 * Math.sin(beta)
    if (mn1 <= 1) return 1
    return 1 + ((2 * gamma) / (gamma + 1)) * (mn1 * mn1 - 1)
  }

  if (pAt(lo) > pressureRatio) return mu * DEG
  if (pAt(hi) < pressureRatio) return 90

  for (let i = 0; i < 80; i++) {
    const mid = 0.5 * (lo + hi)
    const pMid = pAt(mid)
    if (Math.abs(pMid - pressureRatio) < 1e-8) return mid * DEG
    if (pMid < pressureRatio) lo = mid
    else hi = mid
  }
  return 0.5 * (lo + hi) * DEG
}

/** 0 = Mach angle, 1 = normal (90°) shock at the lip */
export function lipShockNormalFraction(
  M1: number,
  gamma: number,
  pbOverPe: number,
): number {
  if (pbOverPe <= 1) return 0
  const beta = obliqueShockAngleDeg(M1, gamma, pbOverPe)
  if (beta == null) return 0
  const muDeg = Math.asin(1 / M1) * DEG
  if (beta >= 89.9) return 1
  return (beta - muDeg) / (90 - muDeg)
}
