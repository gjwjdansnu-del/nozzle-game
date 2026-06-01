/**
 * MOC nozzle facade: 2D planar vs axisymmetric post-processing on the same
 * meridional (x–r) minimum-length characteristic mesh.
 */

import { areaMachRatio } from './gasDynamics'
import { chokedMassFlow } from './gasDynamics'
import {
  generateMinimumLengthMOCNozzle,
  resampleMOCAxial,
  type MOCInputs,
  type MOCResult,
} from './moc2d'

export type MOCGeometryType = 'planar' | 'axisymmetric'

export interface MOCNozzleInputs extends MOCInputs {
  geometryType: MOCGeometryType
}

export function geometricAreaRatio(
  rWall: number,
  rThroat: number,
  geometryType: MOCGeometryType,
): number {
  const ratio = rWall / rThroat
  return geometryType === 'planar' ? ratio : ratio * ratio
}

export function generateMOCNozzle(inputs: MOCNozzleInputs): MOCResult {
  const base = generateMinimumLengthMOCNozzle(inputs)
  const rt = inputs.ht
  const re = base.he
  const AeOverAtGeometric = geometricAreaRatio(re, rt, inputs.geometryType)
  const AeOverAtIdeal = areaMachRatio(inputs.Me, inputs.gamma)

  return {
    ...base,
    geometryType: inputs.geometryType,
    AeOverAtGeometric,
    AeOverAtIdeal,
  }
}

export function mocMassFlow(
  rt: number,
  p0: number,
  T0: number,
  gamma: number,
  R: number,
  geometryType: MOCGeometryType,
): { value: number; label: string } {
  if (geometryType === 'planar') {
    return {
      value: chokedMassFlow(rt, p0, T0, gamma, R),
      label: 'ṁ per unit depth',
    }
  }
  const At = Math.PI * rt * rt
  return {
    value: chokedMassFlow(At, p0, T0, gamma, R),
    label: 'ṁ (total)',
  }
}

export { resampleMOCAxial }

export function resampleMOCAxialForGeometry(
  result: MOCResult,
  nSamples: number,
  geometryType: MOCGeometryType,
) {
  const axial = resampleMOCAxial(result, nSamples, geometryType)
  return axial
}
