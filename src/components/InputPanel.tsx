import { Slider } from './Slider'
import { formatBar } from '../utils/units'

export type GeometryType = 'planar' | 'axisymmetric'

export interface Quasi1DInputs {
  Me: number
  pbBar: number
  p0Bar: number
  T0: number
  throatMm: number
  lengthMm: number
  nPoints: number
  geometryType: GeometryType
  gamma: number
  R: number
  showVelocityPlot: boolean
  colormap: 'mach' | 'pressure' | 'temperature' | 'density' | 'velocity'
}

interface InputPanelProps {
  inputs: Quasi1DInputs
  onChange: (patch: Partial<Quasi1DInputs>) => void
  showAdvanced: boolean
  onToggleAdvanced: () => void
}

export function InputPanel({
  inputs,
  onChange,
  showAdvanced,
  onToggleAdvanced,
}: InputPanelProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Design controls
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div className="sm:col-span-2">
          <Slider
            label="Exit Mach Me"
            value={inputs.Me}
            min={1.01}
            max={10}
            step={0.05}
            displayValue={inputs.Me.toFixed(2)}
            onChange={(v) => onChange({ Me: v })}
          />
        </div>

        <div className="sm:col-span-2">
          <Slider
            label="Back pressure pb"
            value={inputs.pbBar}
            min={0.01}
            max={100}
            step={0.01}
            unit="bar"
            displayValue={inputs.pbBar.toFixed(2)}
            onChange={(v) => onChange({ pbBar: v })}
          />
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Stagnation p0 (bar)</span>
          <input
            type="number"
            min={1}
            max={500}
            step={1}
            value={inputs.p0Bar}
            onChange={(e) => onChange({ p0Bar: Number(e.target.value) })}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 font-mono"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Stagnation T0 (K)</span>
          <input
            type="number"
            min={200}
            max={3000}
            step={10}
            value={inputs.T0}
            onChange={(e) => onChange({ T0: Number(e.target.value) })}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 font-mono"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Throat size (mm)</span>
          <input
            type="number"
            min={1}
            max={500}
            step={1}
            value={inputs.throatMm}
            onChange={(e) => onChange({ throatMm: Number(e.target.value) })}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 font-mono"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Length L (mm)</span>
          <input
            type="number"
            min={50}
            max={2000}
            step={10}
            value={inputs.lengthMm}
            onChange={(e) => onChange({ lengthMm: Number(e.target.value) })}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 font-mono"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Grid points</span>
          <input
            type="number"
            min={50}
            max={1000}
            step={10}
            value={inputs.nPoints}
            onChange={(e) => onChange({ nPoints: Number(e.target.value) })}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 font-mono"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Geometry</span>
          <select
            value={inputs.geometryType}
            onChange={(e) =>
              onChange({ geometryType: e.target.value as GeometryType })
            }
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1"
          >
            <option value="planar">2D planar</option>
            <option value="axisymmetric">Axisymmetric</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Colormap</span>
          <select
            value={inputs.colormap}
            onChange={(e) =>
              onChange({
                colormap: e.target.value as Quasi1DInputs['colormap'],
              })
            }
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1"
          >
            <option value="mach">Mach</option>
            <option value="pressure">p/p0</option>
            <option value="temperature">T/T0</option>
            <option value="density">ρ/ρ0</option>
            <option value="velocity">Velocity</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={inputs.showVelocityPlot}
            onChange={(e) => onChange({ showVelocityPlot: e.target.checked })}
            className="accent-cyan-500"
          />
          Show velocity plot
        </label>
      </div>

      <button
        type="button"
        onClick={onToggleAdvanced}
        className="mt-3 text-xs text-cyan-500 hover:text-cyan-300"
      >
        {showAdvanced ? '▼' : '▶'} Advanced (γ, R)
      </button>

      {showAdvanced && (
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">γ (ratio of specific heats)</span>
            <input
              type="number"
              min={1.1}
              max={1.67}
              step={0.01}
              value={inputs.gamma}
              onChange={(e) => onChange({ gamma: Number(e.target.value) })}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">R (J/(kg·K))</span>
            <input
              type="number"
              min={200}
              max={500}
              step={1}
              value={inputs.R}
              onChange={(e) => onChange({ R: Number(e.target.value) })}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 font-mono"
            />
          </label>
        </div>
      )}

      <p className="mt-2 text-xs text-slate-500">
        pb = {formatBar(inputs.pbBar * 1e5)} · default gas: air (R ≈ 287)
      </p>
    </div>
  )
}
