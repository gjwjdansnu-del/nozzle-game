import type { MOCResult } from '../utils/moc2d'
import type { MOCFlowDerived, MOCColormapVariable } from '../utils/mocFlow'
import { mocColormapRange, mocColormapValue } from '../utils/mocFlow'
import { obliqueShockAngleRad } from '../utils/obliqueShock'
import {
  PLOT_JET_WIDTH,
  PLOT_PAD_LEFT,
  PLOT_VIEW_WIDTH,
  axialToSvgX,
} from '../utils/plotLayout'

interface MOCVisualizationProps {
  moc: MOCResult
  flow: MOCFlowDerived
  colormap: MOCColormapVariable
  Me: number
  gamma: number
  ht: number
}

function sampleColor(t: number): string {
  const c = Math.max(0, Math.min(1, t))
  const r = Math.round(255 * c)
  const b = Math.round(255 * (1 - c))
  const g = Math.round(80 + 80 * (1 - Math.abs(c - 0.5) * 2))
  return `rgb(${r},${g},${b})`
}

const FAN_RAYS = 7

export function MOCVisualization({
  moc,
  flow,
  colormap,
  Me,
  gamma,
  ht,
}: MOCVisualizationProps) {
  const width = PLOT_VIEW_WIDTH
  const height = 300
  const padX = PLOT_PAD_LEFT
  const padY = 28
  const jetLen = PLOT_JET_WIDTH
  const L = moc.L || 1

  const yMax = Math.max(...moc.wallY, ht) * 1.05
  const yScale = ((height - padY * 2) * 0.42) / yMax

  const toX = (xi: number) => axialToSvgX(xi, L)
  const toY = (yi: number) => height / 2 - yi * yScale

  const [cMin, cMax] = mocColormapRange(flow, colormap)
  const nStrips = flow.x.length

  const upperWall = moc.wallX.map((x, i) => ({ x: toX(x), y: toY(moc.wallY[i]) }))
  const lowerWall = moc.wallX.map((x, i) => ({ x: toX(x), y: toY(-moc.wallY[i]) }))

  const outlineD = [
    ...upperWall.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    ...lowerWall
      .slice()
      .reverse()
      .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    'Z',
  ].join(' ')

  const strips: { x: number; w: number; color: string }[] = []
  for (let i = 0; i < nStrips - 1; i++) {
    const v = mocColormapValue(flow, colormap, i)
    const t = (v - cMin) / (cMax - cMin)
    strips.push({
      x: toX(flow.x[i]),
      w: toX(flow.x[i + 1]) - toX(flow.x[i]),
      color: sampleColor(t),
    })
  }

  const xExit = toX(L)
  const yTop = toY(moc.he)
  const yBot = toY(-moc.he)
  const halfH = (yBot - yTop) / 2
  const pbOverPe = flow.pe > 0 ? flow.pb / flow.pe : 1
  const peOverPb = flow.pb > 0 ? flow.pe / flow.pb : 1
  const state = flow.state

  const fanStrength = Math.min(1, Math.max(0, peOverPb - 1))
  const fanSpreadMax = halfH * 0.85 * fanStrength
  const showFan = state !== 'unstarted' && pbOverPe < 0.997 && fanStrength > 0.002

  const betaRad = obliqueShockAngleRad(Me, gamma, pbOverPe)
  const showShock = state !== 'unstarted' && pbOverPe > 1.001 && betaRad != null
  const shockLen = jetLen * 0.95
  const shockDx = betaRad != null ? shockLen * Math.cos(betaRad) : 0
  const shockDy = betaRad != null ? shockLen * Math.sin(betaRad) : 0

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto w-full max-w-3xl"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id="moc-clip">
            <path d={outlineD} />
          </clipPath>
        </defs>

        {strips.map((s, i) => (
          <rect
            key={i}
            x={s.x}
            y={padY}
            width={s.w + 0.5}
            height={height - padY * 2}
            fill={s.color}
            clipPath="url(#moc-clip)"
            opacity={0.92}
          />
        ))}

        {moc.cMinusSegments.map((seg, i) => (
          <line
            key={`cm${i}`}
            x1={toX(seg.x1)}
            y1={toY(seg.y1)}
            x2={toX(seg.x2)}
            y2={toY(seg.y2)}
            stroke="#64748b"
            strokeWidth={0.6}
            strokeDasharray="3 2"
            opacity={0.55}
          />
        ))}
        {moc.cPlusSegments.map((seg, i) => (
          <line
            key={`cp${i}`}
            x1={toX(seg.x1)}
            y1={toY(seg.y1)}
            x2={toX(seg.x2)}
            y2={toY(seg.y2)}
            stroke="#94a3b8"
            strokeWidth={0.6}
            opacity={0.55}
          />
        ))}

        <path d={outlineD} fill="none" stroke="#e2e8f0" strokeWidth={1.5} />

        {showFan &&
          Array.from({ length: FAN_RAYS }, (_, k) => {
            const frac = k / (FAN_RAYS - 1)
            const mu = Math.asin(1 / Math.max(Me, 1.01))
            const turn = mu + frac * (Math.PI / 4) * fanStrength
            const dx = jetLen * Math.cos(turn)
            const dy = jetLen * Math.sin(turn)
            return (
              <g key={k}>
                <line
                  x1={xExit}
                  y1={toY(moc.he)}
                  x2={xExit + dx}
                  y2={toY(moc.he) - dy}
                  stroke="#fbbf24"
                  strokeWidth={k === 0 || k === FAN_RAYS - 1 ? 1.1 : 0.65}
                  opacity={0.4 + 0.5 * frac}
                />
                <line
                  x1={xExit}
                  y1={toY(-moc.he)}
                  x2={xExit + dx}
                  y2={toY(-moc.he) + dy}
                  stroke="#fbbf24"
                  strokeWidth={k === 0 || k === FAN_RAYS - 1 ? 1.1 : 0.65}
                  opacity={0.4 + 0.5 * frac}
                />
              </g>
            )
          })}

        {showFan && (
          <text x={xExit + 6} y={yTop - fanSpreadMax - 8} className="fill-amber-300 text-[10px]">
            Expansion fan
          </text>
        )}

        {showShock && (
          <g>
            <line
              x1={xExit}
              y1={yTop}
              x2={xExit + shockDx}
              y2={yTop + shockDy}
              stroke="#fb923c"
              strokeWidth={1.2}
            />
            <line
              x1={xExit}
              y1={yBot}
              x2={xExit + shockDx}
              y2={yBot - shockDy}
              stroke="#fb923c"
              strokeWidth={1.2}
            />
            <text x={xExit + shockDx + 4} y={yTop + shockDy + 10} className="fill-orange-300 text-[10px]">
              Oblique shock
            </text>
          </g>
        )}

        <text x={padX} y={height - 4} className="fill-slate-500 text-[10px]">
          throat
        </text>
        <text x={xExit - 16} y={height - 4} className="fill-slate-500 text-[10px]">
          exit
        </text>
        <text x={padX + 4} y={padY + 12} className="fill-slate-500 text-[9px]">
          C− dashed · C+ solid gray
        </text>
      </svg>

      <div className="absolute right-2 top-8 flex flex-col items-center gap-1">
        <span className="text-[10px] text-slate-400">{cMax.toFixed(2)}</span>
        <div className="w-3 rounded border border-slate-600" style={{ height: 100 }}>
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              style={{
                height: 100 / 16,
                background: sampleColor(1 - i / 15),
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-slate-400">{cMin.toFixed(2)}</span>
      </div>
    </div>
  )
}
