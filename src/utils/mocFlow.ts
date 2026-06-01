import {
  densityRatio,
  pressureRatio,
  staticPressure,
  temperatureRatio,
  velocity,
} from './gasDynamics'
import { classifyExpansion, type NozzleState } from './nozzleFlow'
import type { MOCResult } from './moc2d'
import { resampleMOCAxial } from './moc2d'
import { prandtlMeyerNu } from './prandtlMeyer'

export type MOCColormapVariable =
  | 'mach'
  | 'pressure'
  | 'temperature'
  | 'density'
  | 'velocity'

export interface MOCFlowDerived {
  x: number[]
  Mach: number[]
  areaRatio: number[]
  yWall: number[]
  thetaWall: number[]
  nuWall: number[]
  muWall: number[]
  pOverP0: number[]
  TOverT0: number[]
  rhoOverRho0: number[]
  U: number[]
  pe: number
  pb: number
  Te: number
  Ue: number
  state: NozzleState
  mdotPerDepth: number
  nuExit: number
}

export function mdotPerUnitDepth(
  ht: number,
  p0: number,
  T0: number,
  gamma: number,
  R: number,
): number {
  const factor = Math.pow(2 / (gamma + 1), (gamma + 1) / (2 * (gamma - 1)))
  return ht * p0 * Math.sqrt(gamma / (R * T0)) * factor
}

export function computeMOCFlowProperties(
  moc: MOCResult,
  inputs: {
    Me: number
    ht: number
    p0: number
    T0: number
    pb: number
    gamma: number
    R: number
    nSamples?: number
  },
): MOCFlowDerived {
  const { Me, ht, p0, T0, pb, gamma, R, nSamples = 300 } = inputs
  const axial = resampleMOCAxial(moc, nSamples)

  const pOverP0 = axial.M.map((M) => pressureRatio(M, gamma))
  const TOverT0 = axial.M.map((M) => temperatureRatio(M, gamma))
  const rhoOverRho0 = axial.M.map((M) => densityRatio(M, gamma))
  const U = axial.M.map((M, i) => velocity(M, T0 * TOverT0[i], gamma, R))

  const pe = staticPressure(p0, Me, gamma)
  const Te = T0 * temperatureRatio(Me, gamma)
  const Ue = velocity(Me, Te, gamma, R)
  const state = classifyExpansion(pe, pb)

  return {
    ...axial,
    Mach: axial.M,
    pOverP0,
    TOverT0,
    rhoOverRho0,
    U,
    pe,
    pb,
    Te,
    Ue,
    state,
    mdotPerDepth: mdotPerUnitDepth(ht, p0, T0, gamma, R),
    nuExit: prandtlMeyerNu(Me, gamma),
  }
}

export function mocColormapValue(
  flow: MOCFlowDerived,
  variable: MOCColormapVariable,
  i: number,
): number {
  switch (variable) {
    case 'mach':
      return flow.Mach[i]
    case 'pressure':
      return flow.pOverP0[i]
    case 'temperature':
      return flow.TOverT0[i]
    case 'density':
      return flow.rhoOverRho0[i]
    case 'velocity':
      return flow.U[i]
  }
}

export function mocColormapRange(
  flow: MOCFlowDerived,
  variable: MOCColormapVariable,
): [number, number] {
  const vals = flow.x.map((_, i) => mocColormapValue(flow, variable, i))
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  if (max - min < 1e-12) return [min, min + 1]
  return [min, max]
}
