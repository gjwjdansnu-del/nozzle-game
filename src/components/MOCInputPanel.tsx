import { Slider } from './Slider'
import type { MOCColormapVariable } from '../utils/mocFlow'
import type { MOCGeometryType } from '../utils/mocNozzle'

export interface MOCInputs {
  Me: number
  nLines: number
  htMm: number
  p0Bar: number
  T0: number
  geometryType: MOCGeometryType
  colormap: MOCColormapVariable
  gamma: number
  R: number
}

interface MOCInputPanelProps {
  inputs: MOCInputs
  onChange: (patch: Partial<MOCInputs>) => void
  showAdvanced: boolean
  onToggleAdvanced: () => void
}

export function MOCInputPanel({
  inputs,
  onChange,
  showAdvanced,
  onToggleAdvanced,
}: MOCInputPanelProps) {
  const throatLabel =
    inputs.geometryType === 'planar'
      ? 'Throat half-height ht (mm)'
      : 'Throat radius rt (mm)'

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        MOC design controls
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div className="sm:col-span-2">
          <Slider
            label="Exit Mach Me"
            value={inputs.Me}
            min={1.1}
            max={10}
            step={0.05}
            displayValue={inputs.Me.toFixed(2)}
            onChange={(v) => onChange({ Me: v })}
          />
        </div>

        <div className="sm:col-span-2">
          <Slider
            label="Characteristic lines n"
            value={inputs.nLines}
            min={5}
            max={80}
            step={1}
            displayValue={String(Math.round(inputs.nLines))}
            onChange={(v) => onChange({ nLines: Math.round(v) })}
          />
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Geometry</span>
          <select
            value={inputs.geometryType}
            onChange={(e) =>
              onChange({ geometryType: e.target.value as MOCGeometryType })
            }
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1"
          >
            <option value="planar">2D planar</option>
            <option value="axisymmetric">Axisymmetric</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">{throatLabel}</span>
          <input
            type="number"
            min={1}
            max={200}
            step={0.5}
            value={inputs.htMm}
            onChange={(e) => onChange({ htMm: Number(e.target.value) })}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 font-mono"
          />
        </label>

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
          <span className="text-slate-300">Colormap</span>
          <select
            value={inputs.colormap}
            onChange={(e) =>
              onChange({ colormap: e.target.value as MOCColormapVariable })
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
            <span className="text-slate-300">γ</span>
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
        Ideal expansion at exit (pe from Me) · minimum-length MOC contour design
      </p>
    </div>
  )
}
