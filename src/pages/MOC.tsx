import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppVersion } from '../components/AppVersion'
import { MOCInputPanel, type MOCInputs } from '../components/MOCInputPanel'
import { MOCOutputPanel } from '../components/MOCOutputPanel'
import { MOCVisualization } from '../components/MOCVisualization'
import { LinePlot } from '../components/LinePlot'
import { barToPa, mmToM } from '../utils/units'
import { generateMinimumLengthMOCNozzle } from '../utils/moc2d'
import { computeMOCFlowProperties } from '../utils/mocFlow'
import { radToDeg } from '../utils/prandtlMeyer'

const GRID_SAMPLES = 300

const DEFAULT: MOCInputs = {
  Me: 3.0,
  nLines: 20,
  htMm: 10,
  p0Bar: 100,
  T0: 1500,
  pbBar: 1,
  colormap: 'mach',
  gamma: 1.4,
  R: 287,
}

export function MOC() {
  const [inputs, setInputs] = useState<MOCInputs>(DEFAULT)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const patch = (p: Partial<MOCInputs>) => setInputs((prev) => ({ ...prev, ...p }))

  const derived = useMemo(() => {
    const p0 = barToPa(inputs.p0Bar)
    const pb = barToPa(inputs.pbBar)
    const ht = mmToM(inputs.htMm)
    const moc = generateMinimumLengthMOCNozzle({
      Me: inputs.Me,
      nLines: Math.round(inputs.nLines),
      ht,
      gamma: inputs.gamma,
    })
    const flow = computeMOCFlowProperties(moc, {
      Me: inputs.Me,
      ht,
      p0,
      T0: inputs.T0,
      pb,
      gamma: inputs.gamma,
      R: inputs.R,
      nSamples: GRID_SAMPLES,
    })
    return { p0, pb, ht, moc, flow }
  }, [inputs])

  const { p0, pb, ht, moc, flow } = derived

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <Link to="/" className="text-sm text-cyan-500 hover:text-cyan-300">
            ← Home
          </Link>
          <div className="flex flex-col items-center">
            <AppVersion />
            <h1 className="text-lg font-semibold text-white">MOC Nozzle Design</h1>
          </div>
          <span className="w-16" />
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-4">
        <MOCInputPanel
          inputs={inputs}
          onChange={patch}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced((v) => !v)}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_220px]">
          <MOCOutputPanel
            side="inlet"
            p0={p0}
            T0={inputs.T0}
            gamma={inputs.gamma}
            R={inputs.R}
            htMm={inputs.htMm}
            nLines={Math.round(inputs.nLines)}
            mdotPerDepth={flow.mdotPerDepth}
          />

          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-2">
            <MOCVisualization
              moc={moc}
              flow={flow}
              colormap={inputs.colormap}
              Me={inputs.Me}
              gamma={inputs.gamma}
              ht={ht}
            />
          </div>

          <MOCOutputPanel
            side="outlet"
            p0={p0}
            T0={inputs.T0}
            gamma={inputs.gamma}
            R={inputs.R}
            htMm={inputs.htMm}
            nLines={Math.round(inputs.nLines)}
            mdotPerDepth={flow.mdotPerDepth}
            moc={moc}
            Me={inputs.Me}
            pe={flow.pe}
            Te={flow.Te}
            Ue={flow.Ue}
            pb={pb}
            state={flow.state}
          />
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="mb-2 text-xs text-slate-500">
            Axial distributions (x aligned with MOC nozzle above)
          </p>
          <div className="mx-auto max-w-3xl space-y-1">
            <LinePlot label="Mach" x={flow.x} y={flow.Mach} xMax={moc.L} color="#22d3ee" />
            <LinePlot label="A/At" x={flow.x} y={flow.areaRatio} xMax={moc.L} color="#38bdf8" />
            <LinePlot label="y_wall (m)" x={flow.x} y={flow.yWall} xMax={moc.L} color="#a3e635" />
            <LinePlot
              label="θ_wall (deg)"
              x={flow.x}
              y={flow.thetaWall.map((t) => radToDeg(t))}
              xMax={moc.L}
              color="#f472b6"
            />
            <LinePlot
              label="ν (deg)"
              x={flow.x}
              y={flow.nuWall.map((n) => radToDeg(n))}
              xMax={moc.L}
              color="#c084fc"
            />
            <LinePlot
              label="μ (deg)"
              x={flow.x}
              y={flow.muWall.map((m) => radToDeg(m))}
              xMax={moc.L}
              color="#fb7185"
            />
            <LinePlot label="p/p0" x={flow.x} y={flow.pOverP0} xMax={moc.L} color="#a78bfa" />
            <LinePlot label="T/T0" x={flow.x} y={flow.TOverT0} xMax={moc.L} color="#f472b6" />
            <LinePlot label="Velocity (m/s)" x={flow.x} y={flow.U} xMax={moc.L} color="#fbbf24" />
          </div>
        </div>
      </div>
    </div>
  )
}
