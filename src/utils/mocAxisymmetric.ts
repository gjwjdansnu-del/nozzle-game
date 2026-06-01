/**
 * Axisymmetric minimum-length nozzle MOC (cylindrical coordinates, r = wall radius).
 * Same mesh topology as 2D planar; K± = θ ± ν with source S± = sin θ / (r M cos(θ±μ)).
 * Sources applied during forward marching (predictor–corrector), not as a post-pass.
 */

import { areaMachRatio } from './gasDynamics'
import {
  countMOCPoints,
  findXY,
  initMOCMesh,
  type CharacteristicSegment,
  type InternalPoint,
  type MOCInputs,
  type MOCResult,
} from './moc2d'
import {
  machAngle,
  machFromPrandtlMeyer,
  prandtlMeyerNu,
} from './prandtlMeyer'

export { countMOCPoints, type MOCInputs, type MOCResult }

const ICOR = 4
/** Under-relax axisymmetric source increments for stability. */
const SOURCE_RELAX = 0.1

function axisymSMinus(theta: number, mu: number, M: number, r: number): number {
  if (r < 1e-9) return 0
  const c = Math.cos(theta - mu)
  if (Math.abs(c) < 1e-8) return 0
  return Math.sin(theta) / (r * M * c)
}

function axisymSPlus(theta: number, mu: number, M: number, r: number): number {
  if (r < 1e-9) return 0
  const c = Math.cos(theta + mu)
  if (Math.abs(c) < 1e-8) return 0
  return Math.sin(theta) / (r * M * c)
}

function angleDivs(maxAngle: number, nLines: number): number[] {
  const d = maxAngle / (nLines - 1)
  return Array.from({ length: nLines }, (_, i) => d * i)
}

function clampNu(nu: number, nuMax: number): number {
  return Math.max(0, Math.min(nu, nuMax))
}

function applyKState(p: InternalPoint, gamma: number, nuMax: number): void {
  p.nu = clampNu(0.5 * (p.Kminus - p.Kplus), nuMax)
  p.theta = 0.5 * (p.Kminus + p.Kplus)
  p.M = machFromPrandtlMeyer(p.nu, gamma)
  p.mu = machAngle(p.M)
  p.Kminus = p.theta + p.nu
  p.Kplus = p.theta - p.nu
}

function runMOCAxisymmetric(inputs: MOCInputs): InternalPoint[] {
  const { Me, nLines, ht, gamma } = inputs
  const nPoints = countMOCPoints(nLines)
  const pts = initMOCMesh(nPoints, nLines)
  const nuMax = prandtlMeyerNu(Me, gamma) * 1.01

  const nuExit = prandtlMeyerNu(Me, gamma)
  const thetaMax = 0.5 * nuExit
  const flowAngDivs = angleDivs(thetaMax, nLines)

  const yThroatCorner: [number, number] = [0, ht]

  // Point 0 — same sonic throat as 2D planar (KL series needs RS ~ 1, not physical meters)
  const p0 = pts[0]
  p0.theta = 0
  p0.nu = 0
  p0.M = 1.01
  p0.mu = machAngle(p0.M)
  p0.Kminus = p0.theta + p0.nu
  p0.Kplus = p0.theta - p0.nu
  p0.x = ht / Math.tan(p0.mu - p0.theta)
  p0.y = 0
  p0.parentTop = null
  p0.parentPrev = null

  // First C- fan from throat corner
  for (let i = 1; i <= nLines; i++) {
    const p = pts[i]
    const prv = pts[i - 1]

    if (!p.onWall) {
      p.theta = flowAngDivs[i]
      p.nu = flowAngDivs[i]
      p.M = machFromPrandtlMeyer(p.nu, gamma)
      p.mu = machAngle(p.M)
      p.Kminus = p.theta + p.nu
      p.Kplus = p.theta - p.nu
    } else {
      p.theta = prv.theta
      p.nu = prv.nu
      p.M = prv.M
      p.mu = prv.mu
      p.Kminus = p.theta + p.nu
      p.Kplus = p.theta - p.nu
    }

    const cNegBase = p.onWall ? thetaMax : p.theta - p.mu
    let x = prv.x
    let r = Math.max(prv.y, 1e-9)

    for (let iter = 0; iter <= ICOR; iter++) {
      let cNeg = cNegBase
      let cPos = 0.5 * (prv.theta + prv.mu + p.theta + p.mu)
      if (iter > 0) {
        const rLoc = Math.max(r, 1e-9)
        const sp = axisymSPlus(
          0.5 * (prv.theta + p.theta),
          0.5 * (prv.mu + p.mu),
          0.5 * (prv.M + p.M),
          Math.max(0.5 * (prv.y + r), 1e-9),
        )
        const sm = axisymSMinus(p.theta, p.mu, p.M, rLoc)
        cPos += SOURCE_RELAX * sp * (x - prv.x)
        cNeg += SOURCE_RELAX * sm * (x - yThroatCorner[0])
      }
      ;[x, r] = findXY(yThroatCorner, [prv.x, prv.y], cNeg, cPos)
      r = Math.max(r, 0)
    }

    p.x = x
    p.y = r
    p.parentTop = -1
    p.parentPrev = i - 1
  }

  // Remaining mesh
  let j = 0
  for (let i = nLines + 1; i < nPoints; i++) {
    const p = pts[i]
    const prv = pts[i - 1]
    const topIdx = i - (nLines - j)
    const cntIdx = topIdx - 1
    const top = pts[topIdx]
    const cnt = pts[cntIdx]

    if (p.onCenterline) {
      let x = top.x - top.y / Math.tan(top.theta - top.mu)

      for (let iter = 0; iter <= ICOR; iter++) {
        if (iter === 0) {
          p.Kminus = top.Kminus
        } else {
          const sm = axisymSMinus(
            0.5 * top.theta,
            0.5 * top.mu,
            top.M,
            Math.max(0.5 * top.y, 1e-9),
          )
          p.Kminus = top.Kminus + SOURCE_RELAX * sm * (x - top.x)
        }
        p.theta = 0
        p.nu = clampNu(p.Kminus, nuMax)
        p.M = machFromPrandtlMeyer(p.nu, gamma)
        p.mu = machAngle(p.M)
        p.Kplus = p.theta - p.nu

        const cNeg = 0.5 * (top.theta - top.mu + p.theta - p.mu)
        ;[x] = findXY([top.x, top.y], [cnt.x, cnt.y], cNeg, 0)
      }

      p.x = x
      p.y = 0
      p.parentTop = topIdx
      p.parentPrev = cntIdx
    } else if (!p.onWall) {
      let x = 0.5 * (top.x + prv.x)
      let r = Math.max(0.5 * (top.y + prv.y), 1e-9)

      for (let iter = 0; iter <= ICOR; iter++) {
        if (iter === 0) {
          p.Kminus = top.Kminus
          p.Kplus = prv.Kplus
        } else {
          const sm = axisymSMinus(
            0.5 * (top.theta + p.theta),
            0.5 * (top.mu + p.mu),
            0.5 * (top.M + p.M),
            Math.max(0.5 * (top.y + r), 1e-9),
          )
          const sp = axisymSPlus(
            0.5 * (prv.theta + p.theta),
            0.5 * (prv.mu + p.mu),
            0.5 * (prv.M + p.M),
            Math.max(0.5 * (prv.y + r), 1e-9),
          )
          p.Kminus = top.Kminus + SOURCE_RELAX * sm * (x - top.x)
          p.Kplus = prv.Kplus + SOURCE_RELAX * sp * (x - prv.x)
        }
        applyKState(p, gamma, nuMax)

        const cNeg = 0.5 * (top.theta - top.mu + p.theta - p.mu)
        const cPos = 0.5 * (prv.theta + prv.mu + p.theta + p.mu)
        ;[x, r] = findXY([top.x, top.y], [prv.x, prv.y], cNeg, cPos)
        r = Math.max(r, 0)
      }

      p.x = x
      p.y = r
      p.parentTop = topIdx
      p.parentPrev = i - 1
    } else {
      p.theta = prv.theta
      p.nu = prv.nu
      p.M = prv.M
      p.mu = prv.mu
      p.Kminus = p.theta + p.nu
      p.Kplus = p.theta - p.nu

      let x = 0.5 * (top.x + prv.x)
      let r = Math.max(0.5 * (top.y + prv.y), 1e-9)

      for (let iter = 0; iter <= ICOR; iter++) {
        let cNeg = 0.5 * (top.theta + p.theta)
        let cPos = 0.5 * (prv.theta + prv.mu + p.theta + p.mu)
        if (iter > 0) {
          const sm = axisymSMinus(
            0.5 * (top.theta + p.theta),
            0.5 * (top.mu + p.mu),
            0.5 * (top.M + p.M),
            Math.max(0.5 * (top.y + r), 1e-9),
          )
          const sp = axisymSPlus(
            0.5 * (prv.theta + p.theta),
            0.5 * (prv.mu + p.mu),
            0.5 * (prv.M + p.M),
            Math.max(0.5 * (prv.y + r), 1e-9),
          )
          cNeg += SOURCE_RELAX * sm * (x - top.x)
          cPos += SOURCE_RELAX * sp * (x - prv.x)
        }
        ;[x, r] = findXY([top.x, top.y], [prv.x, prv.y], cNeg, cPos)
        r = Math.max(r, 0)
      }

      p.x = x
      p.y = r
      p.parentTop = topIdx
      p.parentPrev = i - 1
      j += 1
    }
  }

  return pts
}

function buildCharacteristicSegments(pts: InternalPoint[]): {
  cPlus: CharacteristicSegment[]
  cMinus: CharacteristicSegment[]
} {
  const cPlus: CharacteristicSegment[] = []
  const cMinus: CharacteristicSegment[] = []

  for (const p of pts) {
    if (p.parentPrev != null && p.parentPrev >= 0) {
      const q = pts[p.parentPrev]
      cPlus.push({ x1: q.x, y1: q.y, x2: p.x, y2: p.y })
    }
    if (p.parentTop != null && p.parentTop >= 0) {
      const q = pts[p.parentTop]
      cMinus.push({ x1: q.x, y1: q.y, x2: p.x, y2: p.y })
    }
  }
  return { cPlus, cMinus }
}

function toPublicPoint(p: InternalPoint) {
  let type: 'throat' | 'interior' | 'centerline' | 'wall' = 'interior'
  if (p.index === 0) type = 'throat'
  else if (p.onWall) type = 'wall'
  else if (p.onCenterline) type = 'centerline'

  return {
    x: p.x,
    y: p.y,
    theta: p.theta,
    nu: p.nu,
    M: p.M,
    mu: p.mu,
    Kplus: p.Kplus,
    Kminus: p.Kminus,
    type,
    index: p.index,
    onCenterline: p.onCenterline,
    onWall: p.onWall,
  }
}

export function generateMinimumLengthAxisymmetricMOCNozzle(
  inputs: MOCInputs,
): MOCResult {
  const { Me, ht, gamma } = inputs
  const internal = runMOCAxisymmetric(inputs)

  const wallSorted = internal.filter((p) => p.onWall).sort((a, b) => a.x - b.x)
  const centSorted = internal.filter((p) => p.onCenterline).sort((a, b) => a.x - b.x)

  const wallX = wallSorted.map((p) => p.x)
  const wallY = wallSorted.map((p) => p.y)
  const wallTheta = wallSorted.map((p) => p.theta)
  const wallNu = wallSorted.map((p) => p.nu)
  const wallMu = wallSorted.map((p) => p.mu)

  const centerlineX = centSorted.map((p) => p.x)
  const centerlineY = centerlineX.map(() => 0)
  const centerlineM = centSorted.map((p) => p.M)
  const centerlineTheta = centSorted.map((p) => p.theta)
  const centerlineNu = centSorted.map((p) => p.nu)
  const centerlineMu = centSorted.map((p) => p.mu)

  const L = Math.max(...wallX, 0)
  const re = wallY[wallY.length - 1] ?? ht
  const nuExit = prandtlMeyerNu(Me, gamma)
  const thetaMax = 0.5 * nuExit
  const AeOverAtGeometric = (re / ht) * (re / ht)
  const AeOverAtIdeal = areaMachRatio(Me, gamma)

  const { cPlus, cMinus } = buildCharacteristicSegments(internal)

  return {
    geometryType: 'axisymmetric',
    points: internal.map(toPublicPoint),
    wallX,
    wallY,
    wallTheta,
    wallNu,
    wallMu,
    centerlineX,
    centerlineY,
    centerlineM,
    centerlineTheta,
    centerlineNu,
    centerlineMu,
    L,
    he: re,
    thetaMax,
    nuExit,
    AeOverAtGeometric,
    AeOverAtIdeal,
    cPlusSegments: cPlus,
    cMinusSegments: cMinus,
  }
}
