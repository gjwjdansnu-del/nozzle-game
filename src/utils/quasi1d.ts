import { areaMachRatio } from './gasDynamics'

const SUBSONIC_MIN = 1e-5
const SUBSONIC_MAX = 0.999
const SUPERSONIC_MIN = 1.001
const SUPERSONIC_MAX = 20

/**
 * Solve A/At = areaMachRatio(M) for M using bisection.
 * @param areaRatio A(x)/A_throat (sonic throat area)
 * @param supersonic true → supersonic branch (M > 1)
 */
export function solveMachFromAreaRatio(
  areaRatio: number,
  gamma: number,
  supersonic: boolean,
): number {
  if (areaRatio <= 0) return supersonic ? SUPERSONIC_MIN : SUBSONIC_MIN

  const lo = supersonic ? SUPERSONIC_MIN : SUBSONIC_MIN
  const hi = supersonic ? SUPERSONIC_MAX : SUBSONIC_MAX

  const f = (M: number) => areaMachRatio(M, gamma) - areaRatio

  if (f(lo) * f(hi) > 0) {
    // Fallback: return boundary if no bracket (e.g. AR < 1 on subsonic)
    return supersonic ? SUPERSONIC_MIN : SUBSONIC_MAX
  }

  let a = lo
  let b = hi
  for (let i = 0; i < 80; i++) {
    const mid = 0.5 * (a + b)
    if (f(mid) === 0 || (b - a) < 1e-10) return mid
    if (f(a) * f(mid) <= 0) b = mid
    else a = mid
  }
  return 0.5 * (a + b)
}

export function machAtStation(
  areaRatio: number,
  gamma: number,
  isThroat: boolean,
  isSupersonicSection: boolean,
): number {
  if (isThroat) return 1
  return solveMachFromAreaRatio(areaRatio, gamma, isSupersonicSection)
}
