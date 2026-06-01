import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppVersion } from '../components/AppVersion'
import { InputPanel, type Quasi1DInputs } from '../components/InputPanel'
import { OutputPanel } from '../components/OutputPanel'
import { NozzleVisualization } from '../components/NozzleVisualization'
import { LinePlot } from '../components/LinePlot'
import { barToPa, mmToM } from '../utils/units'
import { generateNozzleGeometry, throatArea } from '../utils/nozzleGeometry'
import { chokedMassFlow } from '../utils/gasDynamics'
import {
  exitAreaRatioFromMach,
  solveNozzleFlow,
} from '../utils/nozzleFlow'

const GRID_POINTS = 300

const DEFAULT_INPUTS: Quasi1DInputs = {
  Me: 2.5,
  pbBar: 1,
  p0Bar: 100,
  T0: 1500,
  throatMm: 20,
  lengthMm: 200,
  geometryType: 'planar',
  gamma: 1.4,
  R: 287,
  colormap: 'mach',
}

export function Quasi1D() {
  const [inputs, setInputs] = useState<Quasi1DInputs>(DEFAULT_INPUTS)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const patch = (p: Partial<Quasi1DInputs>) => setInputs((prev) => ({ ...prev, ...p }))

  const derived = useMemo(() => {
    const p0 = barToPa(inputs.p0Bar)
    const pb = barToPa(inputs.pbBar)
    const L = mmToM(inputs.lengthMm)
    const AeOverAt = exitAreaRatioFromMach(inputs.Me, inputs.gamma)
    const geometry = generateNozzleGeometry(
      L,
      GRID_POINTS,
      AeOverAt,
      2.0,
      0.4,
      inputs.geometryType,
    )
    const At = throatArea(inputs.throatMm, inputs.geometryType)
    const mdot = chokedMassFlow(At, p0, inputs.T0, inputs.gamma, inputs.R)
    const solution = solveNozzleFlow({
      Me: inputs.Me,
      pb,
      p0,
      T0: inputs.T0,
      gamma: inputs.gamma,
      R: inputs.R,
      geometry,
    })
    return { p0, pb, L, AeOverAt, geometry, At, mdot, solution }
  }, [inputs])

  const { p0, pb, L, geometry, At, mdot, solution, AeOverAt } = derived

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <Link to="/" className="text-sm text-cyan-500 hover:text-cyan-300">
            ← Home
          </Link>
          <div className="flex flex-col items-center">
            <AppVersion />
            <h1 className="text-lg font-semibold text-white">Quasi-1D Nozzle Design</h1>
          </div>
          <span className="w-16" />
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-4">
        <InputPanel
          inputs={inputs}
          onChange={patch}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced((v) => !v)}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_220px]">
          <OutputPanel
            side="inlet"
            p0={p0}
            T0={inputs.T0}
            gamma={inputs.gamma}
            R={inputs.R}
            throatMm={inputs.throatMm}
            At={At}
            mdot={mdot}
          />

          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-2">
            <NozzleVisualization
              geometry={geometry}
              solution={solution}
              colormap={inputs.colormap}
              L={L}
              Me={inputs.Me}
              gamma={inputs.gamma}
            />
          </div>

          <OutputPanel
            side="outlet"
            p0={p0}
            T0={inputs.T0}
            gamma={inputs.gamma}
            R={inputs.R}
            throatMm={inputs.throatMm}
            At={At}
            mdot={mdot}
            Me={inputs.Me}
            AeOverAt={AeOverAt}
            pe={solution.pe}
            Te={solution.Te}
            rhoe={solution.rhoe}
            Ue={solution.Ue}
            pb={pb}
            state={solution.state}
          />
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="mb-2 text-xs text-slate-500">
            Axial distributions (x aligned with nozzle above)
          </p>
          <div className="mx-auto max-w-3xl space-y-1">
            <LinePlot
              label="Mach"
              x={solution.x}
              y={solution.Mach}
              xMax={L}
              color="#22d3ee"
              shockX={solution.shockX}
            />
            <LinePlot
              label="p/p0"
              x={solution.x}
              y={solution.pOverP0}
              xMax={L}
              color="#a78bfa"
              shockX={solution.shockX}
            />
            <LinePlot
              label="T/T0"
              x={solution.x}
              y={solution.TOverT0}
              xMax={L}
              color="#f472b6"
              shockX={solution.shockX}
            />
            <LinePlot
              label="ρ/ρ0"
              x={solution.x}
              y={solution.rhoOverRho0}
              xMax={L}
              color="#4ade80"
              shockX={solution.shockX}
            />
            <LinePlot
              label="Velocity (m/s)"
              x={solution.x}
              y={solution.U}
              xMax={L}
              color="#fbbf24"
              shockX={solution.shockX}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
