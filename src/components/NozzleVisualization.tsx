import type { FlowSolution } from '../utils/nozzleFlow'
import { colormapRange, colormapValue } from '../utils/nozzleFlow'
import type { ColormapVariable } from '../utils/nozzleFlow'
import type { NozzleGeometry } from '../utils/nozzleGeometry'
import { obliqueShockAngleDeg, obliqueShockAngleRad } from '../utils/obliqueShock'
import {
  PLOT_JET_WIDTH,
  PLOT_PAD_LEFT,
  PLOT_VIEW_WIDTH,
  axialToSvgX,
} from '../utils/plotLayout'

interface NozzleVisualizationProps {
  geometry: NozzleGeometry
  solution: FlowSolution
  colormap: ColormapVariable
  L: number
  Me: number
  gamma: number
}

function jetColor(kind: 'expansion' | 'ideal' | 'shock'): string {
  switch (kind) {
    case 'expansion':
      return '#fbbf24'
    case 'ideal':
      return '#34d399'
    case 'shock':
      return '#fb923c'
  }
}

function sampleColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  const r = Math.round(255 * clamped)
  const b = Math.round(255 * (1 - clamped))
  const g = Math.round(80 + 80 * (1 - Math.abs(clamped - 0.5) * 2))
  return `rgb(${r},${g},${b})`
}

const FAN_RAYS = 7

export function NozzleVisualization({
  geometry,
  solution,
  colormap,
  L,
  Me,
  gamma,
}: NozzleVisualizationProps) {
  const width = PLOT_VIEW_WIDTH
  const height = 280
  const padX = PLOT_PAD_LEFT
  const padY = 30
  const jetLen = PLOT_JET_WIDTH
  const plotH = height - padY * 2
  const yScale = (plotH * 0.42) / Math.max(...geometry.yWall, 0.01)

  const toX = (xi: number) => axialToSvgX(xi, L)
  const toY = (yi: number) => height / 2 - yi * yScale

  const [cMin, cMax] = colormapRange(colormap, solution)
  const n = geometry.x.length

  const upperPath: string[] = []
  const lowerPath: string[] = []
  for (let i = 0; i < n; i++) {
    const px = toX(geometry.x[i]).toFixed(1)
    upperPath.push(`${i === 0 ? 'M' : 'L'} ${px} ${toY(geometry.yWall[i]).toFixed(1)}`)
    lowerPath.push(`${i === 0 ? 'L' : 'L'} ${px} ${toY(-geometry.yWall[i]).toFixed(1)}`)
  }
  const outlineD = `${upperPath.join(' ')} ${lowerPath.reverse().join(' ')} Z`

  const strips: { x: number; w: number; color: string }[] = []
  for (let i = 0; i < n - 1; i++) {
    const v = colormapValue(solution, colormap, i)
    const t = (v - cMin) / (cMax - cMin)
    strips.push({
      x: toX(geometry.x[i]),
      w: toX(geometry.x[i + 1]) - toX(geometry.x[i]),
      color: sampleColor(t),
    })
  }

  const xExit = toX(L)
  const yTop = toY(geometry.yWall[n - 1])
  const yBot = toY(-geometry.yWall[n - 1])
  const halfH = (yTop - yBot) / 2
  const state = solution.state
  const pbOverPe = solution.pe > 0 ? solution.pb / solution.pe : 1
  const peOverPb = solution.pb > 0 ? solution.pe / solution.pb : 1

  const showExternalJet =
    state !== 'internal-shock' && state !== 'unstarted'

  // --- Expansion fan (underexpanded): rays diverge outward from lip ---
  const fanStrength = Math.min(1, Math.max(0, peOverPb - 1))
  const fanSpreadMax = halfH * 0.85 * fanStrength
  const showExpansionFan = showExternalJet && pbOverPe < 0.997 && fanStrength > 0.002

  const expansionFanElements = showExpansionFan ? (
    <g>
      {Array.from({ length: FAN_RAYS }, (_, k) => {
        const frac = k / (FAN_RAYS - 1)
        const spread = fanSpreadMax * frac
        return (
          <g key={k}>
            <line
              x1={xExit}
              y1={yTop}
              x2={xExit + jetLen}
              y2={yTop - spread}
              stroke={jetColor('expansion')}
              strokeWidth={k === 0 || k === FAN_RAYS - 1 ? 1.2 : 0.7}
              opacity={0.35 + 0.55 * frac}
            />
            <line
              x1={xExit}
              y1={yBot}
              x2={xExit + jetLen}
              y2={yBot + spread}
              stroke={jetColor('expansion')}
              strokeWidth={k === 0 || k === FAN_RAYS - 1 ? 1.2 : 0.7}
              opacity={0.35 + 0.55 * frac}
            />
          </g>
        )
      })}
      <text
        x={xExit + 6}
        y={yTop - fanSpreadMax - 10}
        className="fill-amber-300 text-[11px] font-medium"
      >
        Expansion fan
      </text>
    </g>
  ) : null

  // --- Oblique / normal lip shock (overexpanded) ---
  const betaRad = obliqueShockAngleRad(Me, gamma, pbOverPe)
  const betaDeg = obliqueShockAngleDeg(Me, gamma, pbOverPe)
  const showLipShock = showExternalJet && pbOverPe > 1.001 && betaRad != null
  const isNormalLip = betaDeg != null && betaDeg >= 85
  const shockLen = jetLen * 0.95
  const shockDx = betaRad != null ? shockLen * Math.cos(betaRad) : 0
  const shockDy = betaRad != null ? shockLen * Math.sin(betaRad) : 0

  const lipShockElements = showLipShock ? (
    <g>
      <line
        x1={xExit}
        y1={yTop}
        x2={xExit + shockDx}
        y2={yTop + shockDy}
        stroke={jetColor('shock')}
        strokeWidth={1.3}
      />
      <line
        x1={xExit}
        y1={yBot}
        x2={xExit + shockDx}
        y2={yBot - shockDy}
        stroke={jetColor('shock')}
        strokeWidth={1.3}
      />
      {isNormalLip && (
        <line
          x1={xExit}
          y1={yTop}
          x2={xExit}
          y2={yBot}
          stroke={jetColor('shock')}
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      )}
      <text
        x={xExit + shockDx + 4}
        y={yTop + shockDy + 12}
        className="fill-orange-300 text-[11px] font-medium"
      >
        {isNormalLip ? 'Normal shock (lip)' : 'Oblique shock'}
      </text>
    </g>
  ) : null

  const idealJet =
    showExternalJet && pbOverPe >= 0.997 && pbOverPe <= 1.03 ? (
      <g>
        <rect
          x={xExit}
          y={yBot}
          width={jetLen}
          height={yTop - yBot}
          fill={jetColor('ideal')}
          opacity={0.15}
          stroke={jetColor('ideal')}
          strokeWidth={0.8}
        />
        <text
          x={xExit + 6}
          y={(yTop + yBot) / 2}
          className="fill-emerald-300 text-[11px] font-medium"
        >
          Matched jet
        </text>
      </g>
    ) : null

  const shockLine =
    solution.shockX != null ? (
      <g>
        <line
          x1={toX(solution.shockX)}
          y1={padY}
          x2={toX(solution.shockX)}
          y2={height - padY}
          stroke="#ef4444"
          strokeWidth={2}
        />
        <text
          x={toX(solution.shockX) + 4}
          y={padY + 14}
          className="fill-red-400 text-[11px] font-medium"
        >
          Normal shock (internal)
        </text>
      </g>
    ) : null

  const colorbarH = 120
  const colorbarSteps = 20

  return (
    <div className="relative w-full">
      {state === 'unstarted' && (
        <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded bg-red-900/90 px-3 py-1 text-xs font-semibold text-red-100">
          Nozzle may be unstarted / choking failure
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto w-full max-w-3xl"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id="nozzle-clip">
            <path d={outlineD} />
          </clipPath>
        </defs>

        {strips.map((s, i) => (
          <rect
            key={i}
            x={s.x}
            y={padY}
            width={s.w + 0.5}
            height={plotH}
            fill={s.color}
            clipPath="url(#nozzle-clip)"
            opacity={state === 'unstarted' ? 0.5 : 0.95}
          />
        ))}

        <path d={outlineD} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
        {shockLine}
        {expansionFanElements}
        {idealJet}
        {lipShockElements}

        <text x={padX} y={height - 6} className="fill-slate-500 text-[10px]">
          x = 0
        </text>
        <text x={xExit - 20} y={height - 6} className="fill-slate-500 text-[10px]">
          exit
        </text>
      </svg>

      <div className="absolute right-2 top-8 flex flex-col items-center gap-1">
        <span className="text-[10px] text-slate-400">{cMax.toFixed(2)}</span>
        <div className="w-3 rounded border border-slate-600" style={{ height: colorbarH }}>
          {Array.from({ length: colorbarSteps }, (_, i) => (
            <div
              key={i}
              style={{
                height: colorbarH / colorbarSteps,
                background: sampleColor(1 - i / (colorbarSteps - 1)),
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-slate-400">{cMin.toFixed(2)}</span>
        <span className="mt-1 max-w-[60px] text-center text-[10px] text-slate-500">
          {colormap}
        </span>
      </div>
    </div>
  )
}
