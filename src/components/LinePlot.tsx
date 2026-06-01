interface LinePlotProps {
  label: string
  x: number[]
  y: number[]
  xMax: number
  color?: string
  shockX?: number | null
  height?: number
}

export function LinePlot({
  label,
  x,
  y,
  xMax,
  color = '#22d3ee',
  shockX = null,
  height = 72,
}: LinePlotProps) {
  const width = 800
  const padL = 48
  const padR = 8
  const padT = 8
  const padB = 20
  const plotW = width - padL - padR
  const plotH = height - padT - padB

  const yMin = Math.min(...y)
  const yMax = Math.max(...y)
  const yRange = yMax - yMin || 1

  const toX = (xi: number) => padL + (xi / xMax) * plotW
  const toY = (yi: number) => padT + plotH - ((yi - yMin) / yRange) * plotH

  const pathD = x
    .map((xi, i) => `${i === 0 ? 'M' : 'L'} ${toX(xi).toFixed(2)} ${toY(y[i]).toFixed(2)}`)
    .join(' ')

  const shockLine =
    shockX != null ? (
      <line
        x1={toX(shockX)}
        y1={padT}
        x2={toX(shockX)}
        y2={padT + plotH}
        stroke="#f87171"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
    ) : null

  return (
    <div className="w-full">
      <div className="mb-0.5 flex items-baseline justify-between px-1">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <span className="font-mono text-[10px] text-slate-500">
          max {yMax.toFixed(3)} · min {yMin.toFixed(3)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full text-slate-600"
        preserveAspectRatio="none"
      >
        <line
          x1={padL}
          y1={padT + plotH}
          x2={padL + plotW}
          y2={padT + plotH}
          stroke="currentColor"
          strokeWidth={0.5}
        />
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} />
        {shockLine}
      </svg>
    </div>
  )
}
