/** Area–Mach relation: A/A* for given Mach and gamma */
export function areaMachRatio(M: number, gamma: number): number {
  if (M <= 0) return Infinity
  const term = (2 / (gamma + 1)) * (1 + ((gamma - 1) / 2) * M * M)
  const exp = (gamma + 1) / (2 * (gamma - 1))
  return (1 / M) * Math.pow(term, exp)
}

/** Isentropic T/T0 */
export function temperatureRatio(M: number, gamma: number): number {
  return 1 / (1 + ((gamma - 1) / 2) * M * M)
}

/** Isentropic p/p0 */
export function pressureRatio(M: number, gamma: number): number {
  return Math.pow(1 + ((gamma - 1) / 2) * M * M, -gamma / (gamma - 1))
}

/** Isentropic rho/rho0 */
export function densityRatio(M: number, gamma: number): number {
  return Math.pow(1 + ((gamma - 1) / 2) * M * M, -1 / (gamma - 1))
}

/** Velocity U = M * sqrt(gamma * R * T) */
export function velocity(M: number, T: number, gamma: number, R: number): number {
  return M * Math.sqrt(gamma * R * T)
}

/** Choked mass flow through throat area At */
export function chokedMassFlow(
  At: number,
  p0: number,
  T0: number,
  gamma: number,
  R: number,
): number {
  const factor = Math.pow(2 / (gamma + 1), (gamma + 1) / (2 * (gamma - 1)))
  return At * p0 * Math.sqrt(gamma / (R * T0)) * factor
}

/** Static temperature from T0 and M */
export function staticTemperature(T0: number, M: number, gamma: number): number {
  return T0 * temperatureRatio(M, gamma)
}

/** Static pressure from p0 and M */
export function staticPressure(p0: number, M: number, gamma: number): number {
  return p0 * pressureRatio(M, gamma)
}

/** Static density from rho0 and M */
export function staticDensity(rho0: number, M: number, gamma: number): number {
  return rho0 * densityRatio(M, gamma)
}

/** Stagnation density rho0 = p0 / (R * T0) */
export function stagnationDensity(p0: number, T0: number, R: number): number {
  return p0 / (R * T0)
}

/** Invert isentropic p/p0 → Mach (subsonic branch by default). */
export function machFromPressureRatio(
  pr: number,
  gamma: number,
  supersonic = false,
): number {
  if (pr <= 0) return supersonic ? 1.001 : 1e-5
  if (pr >= 1) return supersonic ? 20 : 0.999

  const inner = Math.pow(pr, -((gamma - 1) / gamma)) - 1
  if (inner <= 0) return supersonic ? 1.001 : 1e-5

  const M = Math.sqrt(((2 / (gamma - 1)) * inner))
  if (supersonic) return Math.max(1.001, M)
  return Math.min(0.999, Math.max(1e-5, M))
}
