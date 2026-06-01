/** Prandtl–Meyer function ν(M) [rad] */
export function prandtlMeyerNu(M: number, gamma: number): number {
  if (M <= 1) return 0
  const gp = gamma + 1
  const gm = gamma - 1
  const term = Math.sqrt(((M * M - 1) * gm) / gp)
  return Math.sqrt(gp / gm) * Math.atan(term) - Math.atan(Math.sqrt(M * M - 1))
}

/** Mach angle μ = arcsin(1/M) [rad] */
export function machAngle(M: number): number {
  if (M <= 1) return Math.PI / 2
  return Math.asin(1 / M)
}

/** Inverse ν(M) → M via bisection on [Mmin, Mmax] */
export function machFromPrandtlMeyer(
  nu: number,
  gamma: number,
  Mmin = 1.000001,
  Mmax = 50,
): number {
  if (nu <= 0) return Mmin

  const f = (M: number) => prandtlMeyerNu(M, gamma) - nu
  if (f(Mmax) < 0) return Mmax

  let lo = Mmin
  let hi = Mmax
  for (let i = 0; i < 80; i++) {
    const mid = 0.5 * (lo + hi)
    if (Math.abs(f(mid)) < 1e-10) return mid
    if (f(mid) > 0) hi = mid
    else lo = mid
  }
  return 0.5 * (lo + hi)
}

export function radToDeg(r: number): number {
  return (r * 180) / Math.PI
}
