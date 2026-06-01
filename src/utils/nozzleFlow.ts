import {
  areaMachRatio,
  pressureRatio,
  temperatureRatio,
  densityRatio,
  velocity,
  staticPressure,
  stagnationDensity,
} from './gasDynamics'
import { machAtStation, solveMachFromAreaRatio } from './quasi1d'
import { shockMachDownstream, shockTotalPressureRatio } from './shockRelations'
import type { NozzleGeometry } from './nozzleGeometry'

export type NozzleState =
  | 'underexpanded'
  | 'ideally-expanded'
  | 'overexpanded'
  | 'internal-shock'
  | 'unstarted'

export type ColormapVariable = 'mach' | 'pressure' | 'temperature' | 'density' | 'velocity'

export interface FlowInputs {
  Me: number
  pb: number
  p0: number
  T0: number
  gamma: number
  R: number
  geometry: NozzleGeometry
}

export interface FlowSolution {
  x: number[]
  Mach: number[]
  pOverP0: number[]
  TOverT0: number[]
  rhoOverRho0: number[]
  U: number[]
  state: NozzleState
  pe: number
  pb: number
  Te: number
  rhoe: number
  Ue: number
  AeOverAt: number
  shockIndex: number | null
  shockX: number | null
  p0Local: number[]
}

const IDEAL_TOL = 0.03

export function classifyExpansion(pe: number, pb: number): NozzleState {
  const rel = Math.abs(pb - pe) / pe
  if (pb < pe * (1 - IDEAL_TOL)) return 'underexpanded'
  if (rel < IDEAL_TOL) return 'ideally-expanded'
  return 'overexpanded'
}

function buildIsentropicSolution(
  geom: NozzleGeometry,
  p0: number,
  T0: number,
  gamma: number,
  R: number,
): Omit<FlowSolution, 'state' | 'pe' | 'pb' | 'Te' | 'rhoe' | 'Ue' | 'shockIndex' | 'shockX'> {
  const { x, areaRatio, throatIndex } = geom
  const n = x.length
  const Mach: number[] = []
  const pOverP0: number[] = []
  const TOverT0: number[] = []
  const rhoOverRho0: number[] = []
  const U: number[] = []
  const p0Local = Array(n).fill(p0)

  for (let i = 0; i < n; i++) {
    const supersonic = i > throatIndex
    const isThroat = i === throatIndex
    const M = machAtStation(areaRatio[i], gamma, isThroat, supersonic)
    Mach.push(M)
    pOverP0.push(pressureRatio(M, gamma))
    TOverT0.push(temperatureRatio(M, gamma))
    rhoOverRho0.push(densityRatio(M, gamma))
    const T = T0 * TOverT0[i]
    U.push(velocity(M, T, gamma, R))
  }

  return { x, Mach, pOverP0, TOverT0, rhoOverRho0, U, AeOverAt: geom.AeOverAt, p0Local }
}

function exitConditions(
  Me: number,
  p0: number,
  T0: number,
  gamma: number,
  R: number,
) {
  const pe = staticPressure(p0, Me, gamma)
  const Te = T0 * temperatureRatio(Me, gamma)
  const rho0 = stagnationDensity(p0, T0, R)
  const rhoe = rho0 * densityRatio(Me, gamma)
  const Ue = velocity(Me, Te, gamma, R)
  return { pe, Te, rhoe, Ue }
}

/** Exit static pressure with normal shock at index shockIdx */
function exitPressureWithShock(
  geom: NozzleGeometry,
  shockIdx: number,
  p0: number,
  gamma: number,
): number {
  const { areaRatio } = geom
  const M1 = machAtStation(areaRatio[shockIdx], gamma, false, true)
  const p02Ratio = shockTotalPressureRatio(M1, gamma)
  const p0After = p0 * p02Ratio

  const MExit = solveMachFromAreaRatio(areaRatio[areaRatio.length - 1], gamma, false)
  return p0After * pressureRatio(MExit, gamma)
}

/** Bisection search for shock position matching pb */
function findShockIndex(
  geom: NozzleGeometry,
  pb: number,
  p0: number,
  gamma: number,
): number | null {
  const { throatIndex } = geom
  const n = geom.x.length
  let lo = throatIndex + 1
  let hi = n - 2
  if (lo >= hi) return null

  const pAt = (idx: number) => exitPressureWithShock(geom, idx, p0, gamma)
  const pLo = pAt(lo)
  const pHi = pAt(hi)

  // Need pb between shock-near-throat and shock-near-exit pressures
  if (pb < Math.min(pLo, pHi) || pb > Math.max(pLo, pHi) + 1e-6) return null

  let bestIdx = lo
  let bestErr = Infinity

  for (let iter = 0; iter < 60; iter++) {
    const mid = Math.floor((lo + hi) / 2)
    const pMid = pAt(mid)
    const err = Math.abs(pMid - pb)
    if (err < bestErr) {
      bestErr = err
      bestIdx = mid
    }
    if (pMid < pb) {
      // Move shock upstream (earlier) → higher exit p typically when pb increases?
      // For diverging nozzle, shock closer to exit → lower pe; closer to throat → higher pe
      hi = mid
    } else {
      lo = mid + 1
    }
    if (hi - lo <= 1) break
  }

  if (bestErr / pb > 0.15) return null
  return bestIdx
}

function buildShockSolution(
  geom: NozzleGeometry,
  shockIdx: number,
  p0: number,
  T0: number,
  gamma: number,
  R: number,
): Omit<FlowSolution, 'state' | 'pe' | 'pb' | 'Te' | 'rhoe' | 'Ue'> {
  const { x, areaRatio, throatIndex } = geom
  const n = x.length
  const Mach: number[] = []
  const pOverP0: number[] = []
  const TOverT0: number[] = []
  const rhoOverRho0: number[] = []
  const U: number[] = []
  const p0Local: number[] = []

  let p0After = p0

  for (let i = 0; i < n; i++) {
    if (i < shockIdx) {
      const supersonic = i > throatIndex
      const isThroat = i === throatIndex
      const M = machAtStation(areaRatio[i], gamma, isThroat, supersonic)
      Mach.push(M)
      p0Local.push(p0)
      pOverP0.push(pressureRatio(M, gamma))
      TOverT0.push(temperatureRatio(M, gamma))
      rhoOverRho0.push(densityRatio(M, gamma))
    } else if (i === shockIdx) {
      const M1 = machAtStation(areaRatio[i], gamma, false, true)
      const M2 = shockMachDownstream(M1, gamma)
      p0After = p0 * shockTotalPressureRatio(M1, gamma)
      Mach.push(M2)
      p0Local.push(p0After)
      pOverP0.push(pressureRatio(M2, gamma) * (p0After / p0))
      TOverT0.push(temperatureRatio(M2, gamma))
      rhoOverRho0.push(densityRatio(M2, gamma))
    } else {
      const M = solveMachFromAreaRatio(areaRatio[i], gamma, false)
      Mach.push(M)
      p0Local.push(p0After)
      pOverP0.push(pressureRatio(M, gamma) * (p0After / p0))
      TOverT0.push(temperatureRatio(M, gamma))
      rhoOverRho0.push(densityRatio(M, gamma))
    }
    const T = T0 * TOverT0[i]
    U.push(velocity(Mach[i], T, gamma, R))
  }

  return {
    x,
    Mach,
    pOverP0,
    TOverT0,
    rhoOverRho0,
    U,
    AeOverAt: geom.AeOverAt,
    p0Local,
    shockIndex: shockIdx,
    shockX: x[shockIdx],
  }
}

/** Unstarted: subsonic everywhere, throat not choked visually */
function buildUnstartedSolution(
  geom: NozzleGeometry,
  p0: number,
  T0: number,
  gamma: number,
  R: number,
  pb: number,
): Omit<FlowSolution, 'state' | 'pe' | 'pb' | 'Te' | 'rhoe' | 'Ue' | 'shockIndex' | 'shockX'> {
  const { x, areaRatio } = geom
  const n = x.length
  const Mach: number[] = []
  const pOverP0: number[] = []
  const TOverT0: number[] = []
  const rhoOverRho0: number[] = []
  const U: number[] = []
  const p0Local = Array(n).fill(p0)

  // Cap Mach below 1 everywhere using max area ratio as subsonic limit
  const maxAR = Math.max(...areaRatio)
  const MMax = Math.min(0.85, solveMachFromAreaRatio(maxAR, gamma, false))

  for (let i = 0; i < n; i++) {
    const M = Math.min(
      solveMachFromAreaRatio(areaRatio[i], gamma, false),
      MMax * (areaRatio[i] / maxAR),
    )
    Mach.push(Math.max(M, 0.01))
    pOverP0.push(pressureRatio(Mach[i], gamma))
    TOverT0.push(temperatureRatio(Mach[i], gamma))
    rhoOverRho0.push(densityRatio(Mach[i], gamma))
    U.push(velocity(Mach[i], T0 * TOverT0[i], gamma, R))
  }

  // Adjust last point pressure toward pb qualitatively
  const pTarget = pb / p0
  pOverP0[n - 1] = Math.min(pOverP0[n - 1], pTarget)

  return { x, Mach, pOverP0, TOverT0, rhoOverRho0, U, AeOverAt: geom.AeOverAt, p0Local }
}

export function solveNozzleFlow(inputs: FlowInputs): FlowSolution {
  const { Me, pb, p0, T0, gamma, R, geometry } = inputs
  const { pe, Te, rhoe, Ue } = exitConditions(Me, p0, T0, gamma, R)

  // Unstarted threshold: pb close to or above inlet stagnation pressure
  const pInlet = p0 * pressureRatio(
    solveMachFromAreaRatio(geometry.areaRatio[0], gamma, false),
    gamma,
  )
  if (pb >= p0 * 0.92 || pb > pInlet * 0.98) {
    const base = buildUnstartedSolution(geometry, p0, T0, gamma, R, pb)
    return {
      ...base,
      state: 'unstarted',
      pe,
      pb,
      Te,
      rhoe,
      Ue,
      shockIndex: null,
      shockX: null,
    }
  }

  const baseIso = buildIsentropicSolution(geometry, p0, T0, gamma, R)
  let state = classifyExpansion(pe, pb)

  if (state === 'overexpanded' || pb > pe) {
    const shockIdx = findShockIndex(geometry, pb, p0, gamma)
    if (shockIdx !== null && pb > pe * (1 + IDEAL_TOL)) {
      const shockSol = buildShockSolution(geometry, shockIdx, p0, T0, gamma, R)
      const pExit = staticPressure(
        p0 * shockTotalPressureRatio(
          machAtStation(geometry.areaRatio[shockIdx], gamma, false, true),
          gamma,
        ),
        shockSol.Mach[shockSol.Mach.length - 1],
        gamma,
      )
      return {
        ...shockSol,
        state: 'internal-shock',
        pe: pExit,
        pb,
        Te: T0 * shockSol.TOverT0[shockSol.TOverT0.length - 1],
        rhoe: stagnationDensity(p0, T0, R) * shockSol.rhoOverRho0[shockSol.rhoOverRho0.length - 1],
        Ue: shockSol.U[shockSol.U.length - 1],
        shockIndex: shockIdx,
        shockX: geometry.x[shockIdx],
      }
    }
  }

  if (state === 'overexpanded' && pb > pe) {
    // Keep isentropic field; external shocks handle visualization
  }

  return {
    ...baseIso,
    state,
    pe,
    pb,
    Te,
    rhoe,
    Ue,
    shockIndex: null,
    shockX: null,
  }
}

export function colormapValue(
  sol: FlowSolution,
  variable: ColormapVariable,
  i: number,
): number {
  switch (variable) {
    case 'mach':
      return sol.Mach[i]
    case 'pressure':
      return sol.pOverP0[i]
    case 'temperature':
      return sol.TOverT0[i]
    case 'density':
      return sol.rhoOverRho0[i]
    case 'velocity':
      return sol.U[i]
  }
}

export function colormapRange(variable: ColormapVariable, sol: FlowSolution): [number, number] {
  const vals = sol.x.map((_, i) => colormapValue(sol, variable, i))
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  if (max - min < 1e-12) return [min, min + 1]
  return [min, max]
}

/** Design exit area ratio from Me */
export function exitAreaRatioFromMach(Me: number, gamma: number): number {
  return areaMachRatio(Me, gamma)
}

/** Pressure mismatch ratio for jet visualization (0 = matched) */
export function pressureMismatch(pe: number, pb: number): number {
  if (pe <= 0) return 0
  return (pb - pe) / pe
}
