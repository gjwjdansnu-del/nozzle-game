/** Dynamic viscosity (Pa·s) — Sutherland's law, air-like. */
export function sutherlandViscosity(T: number, TRef = 273.15, muRef = 1.716e-5, S = 110.4): number {
  if (T <= 0) return muRef
  return muRef * Math.pow(T / TRef, 1.5) * ((TRef + S) / (T + S))
}
