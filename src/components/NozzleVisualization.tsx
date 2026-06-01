import type { FlowSolution, NozzleState } from '../utils/nozzleFlow'
import { colormapRange, colormapValue, pressureMismatch } from '../utils/nozzleFlow'
import type { ColormapVariable } from '../utils/nozzleFlow'
import type { NozzleGeometry } from '../utils/nozzleGeometry'

interface NozzleVisualizationProps {
  geometry: NozzleGeometry
  solution: FlowSolution
  colormap: ColormapVariable
  L: number
}

function jetColor(state: NozzleState): string {
  switch (state) {
    case 'underexpanded':
      return '#fbbf24'
    case 'ideally-expanded':
      return '#34d399'
    case 'overexpanded':
      return '#fb923c'
    default:
      return '#64748b'
  }
}

/** Simple blue→red colormap */
function sampleColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  const r = Math.round(255 * clamped)
  const b = Math.round(255 * (1 - clamped))
  const g = Math.round(80 + 80 * (1 - Math.abs(clamped - 0.5) * 2))
  return `rgb(${r},${g},${b})`
}

export function NozzleVisualization({
  geometry,
  solution,
  colormap,
  L,
}: NozzleVisualizationProps) {
  const width = 900
  const height = 280
  const padX = 40
  const padY = 30
  const jetLen = 120
  const plotW = width - padX * 2 - jetLen
  const plotH = height - padY * 2
  const yScale = (plotH * 0.42) / Math.max(...geometry.yWall, 0.01)

  const toX = (xi: number) => padX + (xi / L) * plotW
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
  const mismatch = pressureMismatch(solution.pe, solution.pb)
  const state = solution.state

  const showExternalJet =
    state !== 'internal-shock' && state !== 'unstarted'

  const fanSpread = Math.min(35, 8 + Math.abs(mismatch) * 25)
  const shockAngle = Math.min(50, 10 + Math.abs(mismatch) * 30)

  const jetElements = showExternalJet ? (
    <g>
      {state === 'underexpanded' && (
        <>
          <line
            x1={xExit}
            y1={yTop}
            x2={xExit + jetLen}
            y2={yTop - fanSpread}
            stroke={jetColor(state)}
            strokeWidth={1.2}
            opacity={0.85}
          />
          <line
            x1={xExit}
            y1={yBot}
            x2={xExit + jetLen}
            y2={yBot + fanSpread}
            stroke={jetColor(state)}
            strokeWidth={1.2}
            opacity={0.85}
          />
          <line
            x1={xExit}
            y1={(yTop + yBot) / 2}
            x2={xExit + jetLen * 0.85}
            y2={(yTop + yBot) / 2}
            stroke={jetColor(state)}
            strokeWidth={1}
            opacity={0.5}
          />
        </>
      )}
      {state === 'ideally-expanded' && (
        <rect
          x={xExit}
          y={yBot}
          width={jetLen}
          height={yTop - yBot}
          fill={jetColor(state)}
          opacity={0.15}
          stroke={jetColor(state)}
          strokeWidth={0.8}
        />
      )}
      {state === 'overexpanded' && (
        <>
          <line
            x1={xExit}
            y1={yTop}
            x2={xExit + jetLen * 0.7}
            y2={yTop + shockAngle * 0.4}
            stroke={jetColor(state)}
            strokeWidth={1.2}
          />
          <line
            x1={xExit}
            y1={yBot}
            x2={xExit + jetLen * 0.7}
            y2={yBot - shockAngle * 0.4}
            stroke={jetColor(state)}
            strokeWidth={1.2}
          />
          <line
            x1={xExit + jetLen * 0.7}
            y1={yTop + shockAngle * 0.4}
            x2={xExit + jetLen * 0.7}
            y2={yBot - shockAngle * 0.4}
            stroke={jetColor(state)}
            strokeWidth={0.8}
            strokeDasharray="3 2"
          />
        </>
      )}
    </g>
  ) : null

  const shockLine =
    solution.shockX != null ? (
      <line
        x1={toX(solution.shockX)}
        y1={padY}
        x2={toX(solution.shockX)}
        y2={height - padY}
        stroke="#ef4444"
        strokeWidth={2}
      />
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
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
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
        {jetElements}

        <text x={padX} y={height - 6} className="fill-slate-500 text-[10px]">
          x = 0
        </text>
        <text x={xExit - 20} y={height - 6} className="fill-slate-500 text-[10px]">
          exit
        </text>
      </svg>

      <div className="absolute right-2 top-8 flex flex-col items-center gap-1">
        <span className="text-[10px] text-slate-400">{cMax.toFixed(2)}</span>
        <div
          className="w-3 rounded border border-slate-600"
          style={{ height: colorbarH }}
        >
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
