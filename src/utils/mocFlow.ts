import {
  densityRatio,
  pressureRatio,
  staticPressure,
  temperatureRatio,
  velocity,
} from './gasDynamics'
import type { MOCResult } from './moc2d'
import { prandtlMeyerNu } from './prandtlMeyer'
import {
  mocMassFlow,
  resampleMOCAxialForGeometry,
  type MOCGeometryType,
} from './mocNozzle'

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
  Te: number
  Ue: number
  mdot: number
  mdotLabel: string
  nuExit: number
}

export function computeMOCFlowProperties(
  moc: MOCResult,
  inputs: {
    Me: number
    ht: number
    p0: number
    T0: number
    gamma: number
    R: number
    geometryType: MOCGeometryType
    nSamples?: number
  },
): MOCFlowDerived {
  const { Me, ht, p0, T0, gamma, R, geometryType, nSamples = 300 } = inputs
  const axial = resampleMOCAxialForGeometry(moc, nSamples, geometryType)

  const pOverP0 = axial.M.map((M) => pressureRatio(M, gamma))
  const TOverT0 = axial.M.map((M) => temperatureRatio(M, gamma))
  const rhoOverRho0 = axial.M.map((M) => densityRatio(M, gamma))
  const U = axial.M.map((M, i) => velocity(M, T0 * TOverT0[i], gamma, R))

  const pe = staticPressure(p0, Me, gamma)
  const Te = T0 * temperatureRatio(Me, gamma)
  const Ue = velocity(Me, Te, gamma, R)
  const { value: mdot, label: mdotLabel } = mocMassFlow(ht, p0, T0, gamma, R, geometryType)

  return {
    ...axial,
    Mach: axial.M,
    pOverP0,
    TOverT0,
    rhoOverRho0,
    U,
    pe,
    Te,
    Ue,
    mdot,
    mdotLabel,
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
