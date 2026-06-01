export const BAR_TO_PA = 1e5

export function barToPa(bar: number): number {
  return bar * BAR_TO_PA
}

export function paToBar(pa: number): number {
  return pa / BAR_TO_PA
}

export function mmToM(mm: number): number {
  return mm * 1e-3
}

export function mToMm(m: number): number {
  return m * 1e3
}

export function formatBar(pa: number, digits = 2): string {
  return `${paToBar(pa).toFixed(digits)} bar`
}

export function formatPa(pa: number): string {
  if (pa >= 1e6) return `${(pa / 1e6).toFixed(2)} MPa`
  if (pa >= 1e3) return `${(pa / 1e3).toFixed(1)} kPa`
  return `${pa.toFixed(0)} Pa`
}

export function formatMm(m: number, digits = 1): string {
  return `${mToMm(m).toFixed(digits)} mm`
}

export function formatMdot(mdot: number): string {
  return `${mdot.toFixed(4)} kg/s`
}
