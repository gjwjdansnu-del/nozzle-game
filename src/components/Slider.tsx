interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  displayValue?: string
  onChange: (value: number) => void
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
}: SliderProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
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
