import { shockPressureRatio } from './shockRelations'

const DEG = 180 / Math.PI
const RAD = Math.PI / 180

function pressureAcrossObliqueShock(M1: number, gamma: number, beta: number): number {
  const mn1 = M1 * Math.sin(beta)
  if (mn1 <= 1) return 1
  return 1 + ((2 * gamma) / (gamma + 1)) * (mn1 * mn1 - 1)
}

/** β that maximizes p2/p1 for weak-shock branch limit */
function maxWeakShockBeta(M1: number, gamma: number): number {
  const mu = Math.asin(1 / M1)
  let betaMax = mu
  let pMax = 1
  const steps = 200
  const hi = Math.PI / 2 - 0.02
  for (let i = 0; i <= steps; i++) {
    const beta = mu + (i / steps) * (hi - mu)
    const p = pressureAcrossObliqueShock(M1, gamma, beta)
    if (p > pMax) {
      pMax = p
      betaMax = beta
    }
  }
  return betaMax
}

/**
 * Weak-branch oblique shock angle β (degrees) from upstream flow direction.
 * β → μ when pb ≈ pe; β → 90° when pb/pe reaches normal-shock limit.
 */
export function obliqueShockAngleDeg(
  M1: number,
  gamma: number,
  pressureRatioTarget: number,
): number | null {
  if (pressureRatioTarget < 1 || M1 <= 1) return null

  const pNormal = shockPressureRatio(M1, gamma)
  if (pressureRatioTarget >= pNormal - 1e-9) return 90

  const mu = Math.asin(1 / M1)
  const betaMax = maxWeakShockBeta(M1, gamma)
  const pWeakMax = pressureAcrossObliqueShock(M1, gamma, betaMax)

  if (pressureRatioTarget >= pWeakMax - 1e-9) {
    // Between weak-max and normal: use strong-side β (closer to 90°)
    let lo = betaMax
    let hi = Math.PI / 2 - 1e-6
    for (let i = 0; i < 80; i++) {
      const mid = 0.5 * (lo + hi)
      const pMid = pressureAcrossObliqueShock(M1, gamma, mid)
      if (Math.abs(pMid - pressureRatioTarget) < 1e-8) return mid * DEG
      if (pMid < pressureRatioTarget) hi = mid
      else lo = mid
    }
    return 0.5 * (lo + hi) * DEG
  }

  let lo = mu + 1e-6
  let hi = betaMax
  for (let i = 0; i < 80; i++) {
    const mid = 0.5 * (lo + hi)
    const pMid = pressureAcrossObliqueShock(M1, gamma, mid)
    if (Math.abs(pMid - pressureRatioTarget) < 1e-8) return mid * DEG
    if (pMid < pressureRatioTarget) lo = mid
    else hi = mid
  }
  return 0.5 * (lo + hi) * DEG
}

export function obliqueShockAngleRad(
  M1: number,
  gamma: number,
  pbOverPe: number,
): number | null {
  const deg = obliqueShockAngleDeg(M1, gamma, pbOverPe)
  return deg == null ? null : deg * RAD
}

/** @deprecated use obliqueShockAngleRad for drawing */
export function lipShockNormalFraction(
  M1: number,
  gamma: number,
  pbOverPe: number,
): number {
  const beta = obliqueShockAngleDeg(M1, gamma, pbOverPe)
  if (beta == null) return 0
  const muDeg = Math.asin(1 / M1) * DEG
  if (beta >= 89.9) return 1
  return (beta - muDeg) / (90 - muDeg)
}
