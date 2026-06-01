/** Normal shock: downstream Mach from upstream Mach */
export function shockMachDownstream(M1: number, gamma: number): number {
  if (M1 <= 1) return M1
  const num = 1 + ((gamma - 1) / 2) * M1 * M1
  const den = gamma * M1 * M1 - (gamma - 1) / 2
  if (den <= 0) return 1
  return Math.sqrt(num / den)
}

/** Static pressure ratio p2/p1 across normal shock */
export function shockPressureRatio(M1: number, gamma: number): number {
  return 1 + (2 * gamma / (gamma + 1)) * (M1 * M1 - 1)
}

/** Total pressure ratio p02/p01 across normal shock */
export function shockTotalPressureRatio(M1: number, gamma: number): number {
  const M2 = shockMachDownstream(M1, gamma)
  const p21 = shockPressureRatio(M1, gamma)
  const term1 = 1 + ((gamma - 1) / 2) * M2 * M2
  const term2 = 1 + ((gamma - 1) / 2) * M1 * M1
  return p21 * Math.pow(term1 / term2, gamma / (gamma - 1))
}
