import { MOCInputPanel, type MOCInputs } from './MOCInputPanel'
import type { BLMethod } from '../utils/mocBoundaryLayer'

export interface MOCBLInputs extends MOCInputs {
  blMethod: BLMethod
  blStartMm: number
}

interface MOCBLInputPanelProps {
  inputs: MOCBLInputs
  onChange: (patch: Partial<MOCBLInputs>) => void
  showAdvanced: boolean
  onToggleAdvanced: () => void
  autoBlStartMm: number
}

export function MOCBLInputPanel({
  inputs,
  onChange,
  showAdvanced,
  onToggleAdvanced,
  autoBlStartMm,
}: MOCBLInputPanelProps) {
  return (
    <div className="space-y-3">
      <MOCInputPanel
        inputs={inputs}
        onChange={onChange}
        showAdvanced={showAdvanced}
        onToggleAdvanced={onToggleAdvanced}
      />

      <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Boundary-layer correction
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">BL method</span>
            <select
              value={inputs.blMethod}
              onChange={(e) =>
                onChange({ blMethod: e.target.value as BLMethod })
              }
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1"
            >
              <option value="edenfield">Edenfield (1968)</option>
              <option value="linear">Linear in Me</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">BL start x0 (mm)</span>
            <input
              type="number"
              min={0}
              max={500}
              step={0.1}
              value={inputs.blStartMm}
              onChange={(e) => onChange({ blStartMm: Number(e.target.value) })}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 font-mono"
            />
            <span className="text-[10px] text-slate-500">
              auto ≈ {autoBlStartMm.toFixed(2)} mm (throat)
            </span>
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Displacement thickness δ shifts the wall outward along the local flow angle (one-pass
          correction).
        </p>
      </div>
    </div>
  )
}
