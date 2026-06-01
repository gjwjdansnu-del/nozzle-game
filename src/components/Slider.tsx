import type { WheelEvent } from 'react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  displayValue?: string
  onChange: (value: number) => void
  /** Enable mouse-wheel adjustment while hovering the control */
  wheelAdjust?: boolean
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  unit,
  displayValue,
  onChange,
  wheelAdjust = true,
}: SliderProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))

  const handleWheel = (e: WheelEvent) => {
    if (!wheelAdjust) return
    e.preventDefault()
    const direction = e.deltaY > 0 ? -1 : 1
    const next = clamp(Number((value + direction * step).toFixed(10)))
    onChange(next)
  }

  return (
    <label className="flex flex-col gap-1 text-sm" onWheel={handleWheel}>
      <span className="flex justify-between text-slate-300">
        <span>{label}</span>
        <span className="font-mono text-cyan-300">
          {displayValue ?? value.toFixed(step < 1 ? 2 : 0)}
          {unit ? ` ${unit}` : ''}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-500"
      />
    </label>
  )
}
