import type { MOCResult } from '../utils/moc2d'
import type { MOCFlowDerived, MOCColormapVariable } from '../utils/mocFlow'
import { mocColormapRange, mocColormapValue } from '../utils/mocFlow'
import {
  PLOT_PAD_LEFT,
  PLOT_VIEW_WIDTH,
  axialToSvgX,
} from '../utils/plotLayout'

interface MOCBLVisualizationProps {
  moc: MOCResult
  flow: MOCFlowDerived
  colormap: MOCColormapVariable
  ht: number
  wallXBlc: number[]
  wallYBlc: number[]
}

function sampleColor(t: number): string {
  const c = Math.max(0, Math.min(1, t))
  const r = Math.round(255 * c)
  const b = Math.round(255 * (1 - c))
  const g = Math.round(80 + 80 * (1 - Math.abs(c - 0.5) * 2))
  return `rgb(${r},${g},${b})`
}

export function MOCBLVisualization({
  moc,
  flow,
  colormap,
  ht,
  wallXBlc,
  wallYBlc,
}: MOCBLVisualizationProps) {
  const width = PLOT_VIEW_WIDTH
  const height = 300
  const padX = PLOT_PAD_LEFT
  const padY = 28
  const L = Math.max(moc.L, ...wallXBlc, 1e-9)

  const yMax = Math.max(...moc.wallY, ...wallYBlc, ht) * 1.05
  const yScale = ((height - padY * 2) * 0.42) / yMax

  const toX = (xi: number) => axialToSvgX(xi, L)
  const toY = (yi: number) => height / 2 - yi * yScale

  const [cMin, cMax] = mocColormapRange(flow, colormap)
  const nStrips = flow.x.length

  const outlineD = [
    ...moc.wallX.map((x, i) => {
      const px = toX(x)
      const py = toY(moc.wallY[i])
      return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`
    }),
    ...moc.wallX
      .slice()
      .reverse()
      .map((x, i) => {
        const yi = moc.wallY[moc.wallY.length - 1 - i]
        return `L ${toX(x).toFixed(1)} ${toY(-yi).toFixed(1)}`
      }),
    'Z',
  ].join(' ')

  const blcOutlineD = [
    ...wallXBlc.map((x, i) => {
      const px = toX(x)
      const py = toY(wallYBlc[i])
      return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`
    }),
    ...wallXBlc
      .slice()
      .reverse()
      .map((x, i) => {
        const yi = wallYBlc[wallYBlc.length - 1 - i]
        return `L ${toX(x).toFixed(1)} ${toY(-yi).toFixed(1)}`
      }),
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

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto w-full max-w-3xl"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id="moc-bl-clip">
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
            clipPath="url(#moc-bl-clip)"
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
            opacity={0.45}
          />
        ))}

        <path
          d={blcOutlineD}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={1.8}
          strokeDasharray="6 3"
        />

        <path d={outlineD} fill="none" stroke="#e2e8f0" strokeWidth={1.5} />

        <text x={padX} y={height - 4} className="fill-slate-500 text-[10px]">
          throat
        </text>
        <text x={toX(L) - 16} y={height - 4} className="fill-slate-500 text-[10px]">
          exit
        </text>
        <text x={padX + 4} y={padY + 12} className="fill-slate-500 text-[9px]">
          solid inviscid · dashed BLC · C− dashed
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
