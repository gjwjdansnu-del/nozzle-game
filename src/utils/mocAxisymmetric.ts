/**
 * Axisymmetric minimum-length nozzle MOC (cylindrical r, half-meridional plane).
 * Isentropic K± = θ ± ν with axisymmetric source terms (NASA TM X-2228 / AeroMOC).
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

/** Hall / Kliegel–Levine cylindrical throat (AeroMOC GEOM=1). */
export function klThroatAxisymmetric(
  x: number,
  y: number,
  gamma: number,
  RS: number,
): { theta: number; M: number } {
  const G = gamma
  const z = x * Math.sqrt(RS / (G + 1))
  const u1 = 0.5 * y * y - 1 / 6 + z
  const v1 = (y ** 3) / 6 - y / 6 + y * z
  const u2 =
    ((y + 6) * y ** 4) / 18 -
    ((2 * G + 9) * y * y) / 18 +
    (G + 30) / 270 +
    z * (y * y - 0.5) -
    ((2 * G - 3) * z * z) / 6
  const v2 =
    ((22 * G + 75) * y ** 5) / 360 -
    ((5 * G + 21) * y ** 3) / 54 +
    ((34 * G + 195) * y) / 1080 +
    (z / 9) * ((2 * G + 12) * y ** 3 - (2 * G + 9) * y) +
    y * z * z
  const u3 =
    ((362 * G * G + 1449 * G + 3177) * y ** 6) / 12960 -
    ((194 * G * G + 837 * G + 1665) * y ** 4) / 2592 +
    ((854 * G * G + 3687 * G + 6759) * y * y) / 12960 -
    (782 * G * G + 5523 + 2 * G * 2887) / 272160 +
    z *
      (((26 * G * G + 27 * G + 237) * y ** 4) / 288 -
        ((26 * G * G + 51 * G + 189) * y * y) / 144 +
        (134 * G * G + 429 * G + 1743) / 4320) +
    z * z * (-((5 * G * y * y) / 4) + (7 * G - 18) / 36) +
    (z ** 3 * (2 * G * G - 33 * G + 9)) / 72
  const v3 =
    ((6574 * G * G + 26481 * G + 40059) * y ** 7) / 181440 -
    ((2254 * G * G + 10113 * G + 16479) * y ** 5) / 25920 +
    ((5026 * G * G + 25551 * G + 46377) * y ** 3) / 77760 -
    ((7570 * G * G + 45927 * G + 98757) * y) / 544320 +
    z *
      (((362 * G * G + 1449 * G + 3177) * y ** 5) / 2160 -
        ((194 * G * G + 837 * G + 1665) * y ** 3) / 648 +
        ((854 * G * G + 3687 * G + 6759) * y) / 6480) +
    z * z *
      (((26 * G * G + 27 * G + 237) * y ** 3) / 144 -
        (26 * G * G + 51 * G + 189) / 144) +
    z ** 3 * (-(5 * G * y) / 6)

  let U = 1 + u1 / RS + u2 / (RS * RS) + u3 / RS ** 3
  let V = Math.sqrt((G + 1) / RS) * (v1 / RS + v2 / (RS * RS) + v3 / RS ** 3)
  if (Math.abs(V) < 1e-5) V = 0
  let theta = Math.atan2(V, U)
  if (Math.abs(theta) < 1e-5) theta = 0
  const M = Math.sqrt(U * U + V * V)
  return { theta, M }
}

function findThroatCenterline(
  rt: number,
  gamma: number,
  targetM = 1.01,
): { x: number; M: number; nu: number; mu: number; theta: number } {
  let lo = 1e-10 * rt
  let hi = 3 * rt
  for (let k = 0; k < 64; k++) {
    const mid = 0.5 * (lo + hi)
    const { M } = klThroatAxisymmetric(mid, 0, gamma, rt)
    if (M < targetM) lo = mid
    else hi = mid
  }
  const x = 0.5 * (lo + hi)
  const { theta, M } = klThroatAxisymmetric(x, 0, gamma, rt)
  const nu = prandtlMeyerNu(M, gamma)
  const mu = machAngle(M)
  return { x, M, nu, mu, theta }
}

function axisymSMinus(theta: number, mu: number, M: number, r: number): number {
  if (r < 1e-12) return 0
  const c = Math.cos(theta - mu)
  if (Math.abs(c) < 1e-8) return 0
  return Math.sin(theta) / (r * M * c)
}

function axisymSPlus(theta: number, mu: number, M: number, r: number): number {
  if (r < 1e-12) return 0
  const c = Math.cos(theta + mu)
  if (Math.abs(c) < 1e-8) return 0
  return Math.sin(theta) / (r * M * c)
}

function angleDivs(maxAngle: number, nLines: number): number[] {
  const d = maxAngle / (nLines - 1)
  return Array.from({ length: nLines }, (_, i) => d * i)
}

function solveInterior(
  top: InternalPoint,
  prv: InternalPoint,
  p: InternalPoint,
  gamma: number,
): void {
  let x = 0.5 * (top.x + prv.x)
  let r = Math.max(0.5 * (top.y + prv.y), 0)

  for (let iter = 0; iter <= ICOR; iter++) {
    const avg = iter > 0
    const thetaT = avg ? 0.5 * (top.theta + p.theta) : top.theta
    const muT = avg ? 0.5 * (top.mu + p.mu) : top.mu
    const MT = avg ? 0.5 * (top.M + p.M) : top.M
    const rT = avg ? 0.5 * (top.y + r) : top.y

    const thetaP = avg ? 0.5 * (prv.theta + p.theta) : prv.theta
    const muP = avg ? 0.5 * (prv.mu + p.mu) : prv.mu
    const MP = avg ? 0.5 * (prv.M + p.M) : prv.M
    const rP = avg ? 0.5 * (prv.y + r) : prv.y

    const sm = axisymSMinus(thetaT, muT, MT, rT)
    const sp = axisymSPlus(thetaP, muP, MP, rP)

    p.Kminus = top.Kminus + sm * (x - top.x)
    p.Kplus = prv.Kplus + sp * (x - prv.x)
    p.theta = 0.5 * (p.Kminus + p.Kplus)
    p.nu = 0.5 * (p.Kminus - p.Kplus)
    p.M = machFromPrandtlMeyer(p.nu, gamma)
    p.mu = machAngle(p.M)

    const cNeg = 0.5 * (top.theta - top.mu + p.theta - p.mu)
    const cPos = 0.5 * (prv.theta + prv.mu + p.theta + p.mu)
    ;[x, r] = findXY([top.x, top.y], [prv.x, prv.y], cNeg, cPos)
    r = Math.max(r, 0)
  }

  p.x = x
  p.y = r
}

function solveCenterline(
  top: InternalPoint,
  cnt: InternalPoint,
  p: InternalPoint,
  gamma: number,
): void {
  const lm0 = Math.tan(top.theta - top.mu)
  let x =
    Math.abs(lm0) > 1e-12 ? top.x - top.y / lm0 : top.x + 0.01 * (top.y || 1)

  for (let iter = 0; iter <= ICOR; iter++) {
    const avg = iter > 0
    const thetaT = avg ? 0.5 * (top.theta + p.theta) : top.theta
    const muT = avg ? 0.5 * (top.mu + p.mu) : top.mu
    const MT = avg ? 0.5 * (top.M + p.M) : top.M
    const rT = avg ? 0.5 * top.y : top.y

    const sm = axisymSMinus(thetaT, muT, MT, rT)
    p.Kminus = top.Kminus + sm * (x - top.x)
    p.theta = 0
    p.nu = p.Kminus
    p.M = machFromPrandtlMeyer(p.nu, gamma)
    p.mu = machAngle(p.M)
    p.Kplus = p.theta - p.nu

    const cNeg = 0.5 * (top.theta - top.mu + p.theta - p.mu)
    const cPos = 0
    ;[x] = findXY([top.x, top.y], [cnt.x, 0], cNeg, cPos)
  }

  p.x = x
  p.y = 0
}

function solveWall(
  top: InternalPoint,
  prv: InternalPoint,
  p: InternalPoint,
  thetaWall: number,
): void {
  p.theta = thetaWall
  p.nu = prv.nu
  p.M = prv.M
  p.mu = prv.mu
  p.Kminus = p.theta + p.nu
  p.Kplus = p.theta - p.nu

  let x = 0.5 * (top.x + prv.x)
  let r = Math.max(0.5 * (top.y + prv.y), 0)

  for (let iter = 0; iter <= ICOR; iter++) {
    const avg = iter > 0
    const thetaT = avg ? 0.5 * (top.theta + p.theta) : top.theta
    const muT = avg ? 0.5 * (top.mu + p.mu) : top.mu
    const MT = avg ? 0.5 * (top.M + p.M) : top.M
    const rT = avg ? 0.5 * (top.y + r) : top.y

    const thetaP = avg ? 0.5 * (prv.theta + p.theta) : prv.theta
    const muP = avg ? 0.5 * (prv.mu + p.mu) : prv.mu
    const MP = avg ? 0.5 * (prv.M + p.M) : prv.M
    const rP = avg ? 0.5 * (prv.y + r) : prv.y

    const sm = axisymSMinus(thetaT, muT, MT, rT)
    const sp = axisymSPlus(thetaP, muP, MP, rP)
    p.Kminus = top.Kminus + sm * (x - top.x)
    p.Kplus = prv.Kplus + sp * (x - prv.x)

    p.theta = thetaWall
    p.nu = prv.nu
    p.M = prv.M
    p.mu = prv.mu
    p.Kminus = p.theta + p.nu
    p.Kplus = p.theta - p.nu

    const cNeg = 0.5 * (top.theta + p.theta)
    const cPos = 0.5 * (prv.theta + prv.mu + p.theta + p.mu)
    ;[x, r] = findXY([top.x, top.y], [prv.x, prv.y], cNeg, cPos)
    r = Math.max(r, 0)
  }

  p.x = x
  p.y = r
}

function solveFanPoint(
  corner: [number, number],
  prv: InternalPoint,
  p: InternalPoint,
  cNeg: number,
): void {
  let x = 0.5 * (corner[0] + prv.x)
  let r = Math.max(0.5 * (corner[1] + prv.y), 0)

  for (let iter = 0; iter <= ICOR; iter++) {
    const avg = iter > 0
    const thetaP = avg ? 0.5 * (prv.theta + p.theta) : prv.theta
    const muP = avg ? 0.5 * (prv.mu + p.mu) : prv.mu
    const MP = avg ? 0.5 * (prv.M + p.M) : prv.M
    const rP = avg ? 0.5 * (prv.y + r) : prv.y
    const rLoc = Math.max(r, 1e-12)

    const sp = axisymSPlus(thetaP, muP, MP, rP)
    const sm = axisymSMinus(p.theta, p.mu, p.M, rLoc)

    p.Kplus = prv.Kplus + sp * (x - prv.x)
    p.Kminus = p.theta + p.nu

    const cPos = 0.5 * (prv.theta + prv.mu + p.theta + p.mu)
    ;[x, r] = findXY(corner, [prv.x, prv.y], cNeg, cPos)
    r = Math.max(r, 0)

    if (iter === ICOR) {
      p.Kminus = p.theta + p.nu + sm * (x - corner[0]) * 0.25
    }
  }

  p.x = x
  p.y = r
}

function runMOCAxisymmetric(inputs: MOCInputs): InternalPoint[] {
  const { Me, nLines, ht, gamma } = inputs
  const nPoints = countMOCPoints(nLines)
  const pts = initMOCMesh(nPoints, nLines)

  const nuExit = prandtlMeyerNu(Me, gamma)
  const thetaMax = 0.5 * nuExit
  const flowAngDivs = angleDivs(thetaMax, nLines)

  const yThroatCorner: [number, number] = [0, ht]
  const throat = findThroatCenterline(ht, gamma)

  const p0 = pts[0]
  p0.theta = throat.theta
  p0.M = throat.M
  p0.nu = throat.nu
  p0.mu = throat.mu
  p0.Kminus = p0.theta + p0.nu
  p0.Kplus = p0.theta - p0.nu
  p0.x = throat.x
  p0.y = 0
  p0.parentTop = null
  p0.parentPrev = null

  for (let i = 1; i <= nLines; i++) {
    const p = pts[i]
    const prv = pts[i - 1]

    p.theta = p.onWall ? prv.theta : flowAngDivs[i]
    p.nu = p.onWall ? prv.nu : flowAngDivs[i]
    p.M = machFromPrandtlMeyer(p.nu, gamma)
    p.mu = machAngle(p.M)
    p.Kminus = p.theta + p.nu
    p.Kplus = p.theta - p.nu

    const cNeg = p.onWall ? thetaMax : p.theta - p.mu
    solveFanPoint(yThroatCorner, prv, p, cNeg)
    p.parentTop = -1
    p.parentPrev = i - 1
  }

  let j = 0
  for (let i = nLines + 1; i < nPoints; i++) {
    const p = pts[i]
    const prv = pts[i - 1]
    const topIdx = i - (nLines - j)
    const cntIdx = topIdx - 1
    const top = pts[topIdx]
    const cnt = pts[cntIdx]

    if (p.onCenterline) {
      solveCenterline(top, cnt, p, gamma)
      p.parentTop = topIdx
      p.parentPrev = cntIdx
    } else if (!p.onWall) {
      solveInterior(top, prv, p, gamma)
      p.parentTop = topIdx
      p.parentPrev = i - 1
    } else {
      solveWall(top, prv, p, prv.theta)
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
