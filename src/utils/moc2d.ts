/**
 * 2D planar minimum-length nozzle MOC (ported from nategphillips/moc educational reference).
 * Half-nozzle in upper wall (y ≥ 0); centerline at y = 0.
 */

import { areaMachRatio } from './gasDynamics'
import {
  machAngle,
  machFromPrandtlMeyer,
  prandtlMeyerNu,
} from './prandtlMeyer'

export type MOCPointType = 'throat' | 'interior' | 'centerline' | 'wall'

export interface MOCPoint {
  x: number
  y: number
  theta: number
  nu: number
  M: number
  mu: number
  Kplus: number
  Kminus: number
  type: MOCPointType
  index: number
  onCenterline: boolean
  onWall: boolean
}

export interface MOCInputs {
  Me: number
  nLines: number
  ht: number
  gamma: number
}

export interface CharacteristicSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface MOCResult {
  geometryType?: 'planar' | 'axisymmetric'
  points: MOCPoint[]
  wallX: number[]
  wallY: number[]
  wallTheta: number[]
  wallNu: number[]
  wallMu: number[]
  centerlineX: number[]
  centerlineY: number[]
  centerlineM: number[]
  centerlineTheta: number[]
  centerlineNu: number[]
  centerlineMu: number[]
  L: number
  he: number
  thetaMax: number
  nuExit: number
  AeOverAtGeometric: number
  AeOverAtIdeal: number
  cPlusSegments: CharacteristicSegment[]
  cMinusSegments: CharacteristicSegment[]
}

interface InternalPoint {
  index: number
  x: number
  y: number
  theta: number
  nu: number
  M: number
  mu: number
  Kplus: number
  Kminus: number
  onCenterline: boolean
  onWall: boolean
  parentTop: number | null
  parentPrev: number | null
}

export function countMOCPoints(nLines: number): number {
  return nLines + (nLines * (nLines + 1)) / 2
}

function findXY(
  xyTop: [number, number],
  xyBot: [number, number],
  cNeg: number,
  cPos: number,
): [number, number] {
  const tNeg = Math.tan(cNeg)
  const tPos = Math.tan(cPos)
  const denom = tNeg - tPos
  if (Math.abs(denom) < 1e-14) return [xyTop[0], xyTop[1]]
  const x =
    (xyTop[0] * tNeg - xyBot[0] * tPos + xyBot[1] - xyTop[1]) / denom
  const y =
    (tNeg * tPos * (xyTop[0] - xyBot[0]) + tNeg * xyBot[1] - tPos * xyTop[1]) /
    denom
  return [x, y]
}

function angleDivs(maxAngle: number, nLines: number): number[] {
  const d = maxAngle / (nLines - 1)
  return Array.from({ length: nLines }, (_, i) => d * i)
}

function initMOCMesh(nPoints: number, nLines: number): InternalPoint[] {
  const pts: InternalPoint[] = []
  let j = nLines
  let k = 0

  for (let i = 0; i < nPoints; i++) {
    const onWall = i === j + k
    if (onWall) {
      k += 1
      j += nLines - k
    }
    pts.push({
      index: i,
      x: 0,
      y: 0,
      theta: 0,
      nu: 0,
      M: 1,
      mu: Math.PI / 2,
      Kplus: 0,
      Kminus: 0,
      onCenterline: false,
      onWall,
      parentTop: null,
      parentPrev: null,
    })
  }

  pts[0].onCenterline = true
  for (let i = 1; i < nPoints; i++) {
    if (pts[i - 1].onWall) pts[i].onCenterline = true
  }
  return pts
}

function toPublicPoint(p: InternalPoint): MOCPoint {
  let type: MOCPointType = 'interior'
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

function runMOC(inputs: MOCInputs): InternalPoint[] {
  const { Me, nLines, ht, gamma } = inputs
  const nPoints = countMOCPoints(nLines)
  const pts = initMOCMesh(nPoints, nLines)

  const nuExit = prandtlMeyerNu(Me, gamma)
  const thetaMax = 0.5 * nuExit
  const flowAngDivs = angleDivs(thetaMax, nLines)

  const xThroat = 0
  const yThroatCorner: [number, number] = [xThroat, ht]

  // Point 0 — centerline throat
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

  // First C- fan from throat corner through interior + first wall
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

      const cNeg = p.theta - p.mu
      const cPos = 0.5 * (prv.theta + prv.mu + p.theta + p.mu)
      const loc = findXY(yThroatCorner, [prv.x, prv.y], cNeg, cPos)
      p.x = loc[0]
      p.y = loc[1]
      p.parentTop = -1
      p.parentPrev = i - 1
    } else {
      p.theta = prv.theta
      p.nu = prv.nu
      p.M = prv.M
      p.mu = prv.mu
      p.Kminus = p.theta + p.nu
      p.Kplus = p.theta - p.nu

      const cNeg = thetaMax
      const cPos = 0.5 * (prv.theta + prv.mu + p.theta + p.mu)
      const loc = findXY(yThroatCorner, [prv.x, prv.y], cNeg, cPos)
      p.x = loc[0]
      p.y = loc[1]
      p.parentTop = -1
      p.parentPrev = i - 1
    }
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
      p.Kminus = top.Kminus
      p.theta = 0
      p.nu = p.Kminus - p.theta
      p.M = machFromPrandtlMeyer(p.nu, gamma)
      p.mu = machAngle(p.M)
      p.Kplus = p.theta - p.nu

      const cNeg = 0.5 * (top.theta - top.mu + p.theta - p.mu)
      const cPos = 0
      const loc = findXY([top.x, top.y], [cnt.x, cnt.y], cNeg, cPos)
      p.x = loc[0]
      p.y = 0
      p.parentTop = topIdx
      p.parentPrev = cntIdx
    } else if (!p.onWall) {
      p.Kminus = top.Kminus
      p.Kplus = prv.Kplus
      p.theta = 0.5 * (p.Kminus + p.Kplus)
      p.nu = 0.5 * (p.Kminus - p.Kplus)
      p.M = machFromPrandtlMeyer(p.nu, gamma)
      p.mu = machAngle(p.M)

      const cNeg = 0.5 * (top.theta - top.mu + p.theta - p.mu)
      const cPos = 0.5 * (prv.theta + prv.mu + p.theta + p.mu)
      const loc = findXY([top.x, top.y], [prv.x, prv.y], cNeg, cPos)
      p.x = loc[0]
      p.y = loc[1]
      p.parentTop = topIdx
      p.parentPrev = i - 1
    } else {
      p.theta = prv.theta
      p.nu = prv.nu
      p.M = prv.M
      p.mu = prv.mu
      p.Kminus = p.theta + p.nu
      p.Kplus = p.theta - p.nu

      const cNeg = 0.5 * (top.theta + p.theta)
      const cPos = 0.5 * (prv.theta + prv.mu + p.theta + p.mu)
      const loc = findXY([top.x, top.y], [prv.x, prv.y], cNeg, cPos)
      p.x = loc[0]
      p.y = loc[1]
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

/** Resample centerline / wall onto uniform x grid for plots */
export function resampleMOCAxial(
  result: MOCResult,
  nSamples: number,
  geometryType: 'planar' | 'axisymmetric' = result.geometryType ?? 'planar',
): {
  x: number[]
  M: number[]
  areaRatio: number[]
  yWall: number[]
  thetaWall: number[]
  nuWall: number[]
  muWall: number[]
} {
  const x = Array.from({ length: nSamples }, (_, i) => (i / (nSamples - 1)) * result.L)

  const interp = (xs: number[], ys: number[], xq: number) => {
    if (xq <= xs[0]) return ys[0]
    if (xq >= xs[xs.length - 1]) return ys[ys.length - 1]
    let k = 0
    while (k < xs.length - 1 && xs[k + 1] < xq) k++
    const t = (xq - xs[k]) / (xs[k + 1] - xs[k])
    return ys[k] + t * (ys[k + 1] - ys[k])
  }

  const M = x.map((xi) => interp(result.centerlineX, result.centerlineM, xi))
  const yWall = x.map((xi) => interp(result.wallX, result.wallY, xi))
  const thetaWall = x.map((xi) => interp(result.wallX, result.wallTheta, xi))
  const nuWall = x.map((xi) => interp(result.wallX, result.wallNu, xi))
  const muWall = x.map((xi) => interp(result.wallX, result.wallMu, xi))

  const rt = result.wallY[0] ?? 1
  const areaRatio = yWall.map((r) =>
    geometryType === 'planar' ? r / rt : (r / rt) * (r / rt),
  )

  return { x, M, areaRatio, yWall, thetaWall, nuWall, muWall }
}

export function generateMinimumLengthMOCNozzle(inputs: MOCInputs): MOCResult {
  const { Me, ht, gamma } = inputs
  const internal = runMOC(inputs)

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
  const he = wallY[wallY.length - 1] ?? ht
  const nuExit = prandtlMeyerNu(Me, gamma)
  const thetaMax = 0.5 * nuExit
  const AeOverAtGeometric = he / ht
  const AeOverAtIdeal = areaMachRatio(Me, gamma)

  const { cPlus, cMinus } = buildCharacteristicSegments(internal)

  return {
    geometryType: 'planar',
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
    he,
    thetaMax,
    nuExit,
    AeOverAtGeometric,
    AeOverAtIdeal,
    cPlusSegments: cPlus,
    cMinusSegments: cMinus,
  }
}
