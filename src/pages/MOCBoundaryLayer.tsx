import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppVersion } from '../components/AppVersion'
import { MOCBLInputPanel, type MOCBLInputs } from '../components/MOCBLInputPanel'
import { MOCBLVisualization } from '../components/MOCBLVisualization'
import { MOCOutputPanel } from '../components/MOCOutputPanel'
import { NozzleCsvDownload } from '../components/NozzleCsvDownload'
import { LinePlot } from '../components/LinePlot'
import {
  applyBoundaryLayerCorrection,
  defaultBoundaryLayerOrigin,
} from '../utils/mocBoundaryLayer'
import { computeMOCFlowProperties } from '../utils/mocFlow'
import { generateMOCNozzle } from '../utils/mocNozzle'
import { barToPa, mmToM, mToMm } from '../utils/units'

const GRID_SAMPLES = 300

const DEFAULT: MOCBLInputs = {
  Me: 3.0,
  nLines: 20,
  htMm: 10,
  p0Bar: 100,
  T0: 1500,
  geometryType: 'planar',
  colormap: 'mach',
  gamma: 1.4,
  R: 287,
  blMethod: 'edenfield',
  blStartMm: 0,
}

export function MOCBoundaryLayer() {
  const [inputs, setInputs] = useState<MOCBLInputs>(DEFAULT)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const patch = (p: Partial<MOCBLInputs>) => setInputs((prev) => ({ ...prev, ...p }))

  const derived = useMemo(() => {
    const p0 = barToPa(inputs.p0Bar)
    const ht = mmToM(inputs.htMm)
    const moc = generateMOCNozzle({
      Me: inputs.Me,
      nLines: Math.round(inputs.nLines),
      ht,
      gamma: inputs.gamma,
      geometryType: inputs.geometryType,
    })
    const flow = computeMOCFlowProperties(moc, {
      Me: inputs.Me,
      ht,
      p0,
      T0: inputs.T0,
      gamma: inputs.gamma,
      R: inputs.R,
      geometryType: inputs.geometryType,
      nSamples: GRID_SAMPLES,
    })
    const x0Auto = defaultBoundaryLayerOrigin(moc)
    const x0 = mmToM(inputs.blStartMm)
    const blc = applyBoundaryLayerCorrection(moc, {
      method: inputs.blMethod,
      x0,
      p0,
      T0: inputs.T0,
      gamma: inputs.gamma,
      R: inputs.R,
      Me: inputs.Me,
    })
    return { p0, ht, moc, flow, blc, x0Auto }
  }, [inputs])

  const { p0, ht, moc, flow, blc, x0Auto } = derived
  const areaPlotLabel = inputs.geometryType === 'planar' ? 'A/At (h/ht)' : 'A/At (r/rt)²'
  const wallPlotLabel =
    inputs.geometryType === 'planar' ? 'y_wall (m)' : 'r_wall (m)'
  const Lplot = Math.max(moc.L, ...blc.wallX)

  const deltaAtExit = blc.delta[blc.delta.length - 1] ?? 0

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <Link to="/" className="text-sm text-cyan-500 hover:text-cyan-300">
            ← Home
          </Link>
          <div className="flex flex-col items-center">
            <AppVersion />
            <h1 className="text-lg font-semibold text-white">MOC + Boundary-Layer Correction</h1>
          </div>
          <span className="w-16" />
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-4">
        <MOCBLInputPanel
          inputs={inputs}
          onChange={patch}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced((v) => !v)}
          autoBlStartMm={mToMm(x0Auto)}
        />

        <div className="flex flex-wrap gap-2">
          <NozzleCsvDownload
            wallX={moc.wallX}
            wallY={moc.wallY}
            geometryType={inputs.geometryType}
            Me={inputs.Me}
            filename="nozzle_contour_inviscid.csv"
            label="inviscid MOC wall"
          />
          <NozzleCsvDownload
            wallX={blc.wallX}
            wallY={blc.wallY}
            geometryType={inputs.geometryType}
            Me={inputs.Me}
            filename="nozzle_contour_blc.csv"
            label="BL-corrected wall"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_220px]">
          <MOCOutputPanel
            side="inlet"
            p0={p0}
            T0={inputs.T0}
            gamma={inputs.gamma}
            R={inputs.R}
            htMm={inputs.htMm}
            nLines={Math.round(inputs.nLines)}
            geometryType={inputs.geometryType}
            mdot={flow.mdot}
            mdotLabel={flow.mdotLabel}
          />

          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-2">
            <MOCBLVisualization
              moc={moc}
              flow={flow}
              colormap={inputs.colormap}
              ht={ht}
              wallXBlc={blc.wallX}
              wallYBlc={blc.wallY}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 text-sm">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-200/80">
                BL correction
              </h3>
              <div className="space-y-1.5 text-slate-300">
                <p className="flex justify-between">
                  <span className="text-slate-400">Method</span>
                  <span className="font-mono">{blc.method}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">x0</span>
                  <span className="font-mono">{mToMm(blc.x0).toFixed(2)} mm</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">δ at exit</span>
                  <span className="font-mono">{(deltaAtExit * 1e3).toFixed(3)} mm</span>
                </p>
              </div>
            </div>
            <MOCOutputPanel
              side="outlet"
              p0={p0}
              T0={inputs.T0}
              gamma={inputs.gamma}
              R={inputs.R}
              htMm={inputs.htMm}
              nLines={Math.round(inputs.nLines)}
              geometryType={inputs.geometryType}
              mdot={flow.mdot}
              mdotLabel={flow.mdotLabel}
              moc={moc}
              Me={inputs.Me}
              pe={flow.pe}
              Te={flow.Te}
              Ue={flow.Ue}
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="mb-2 text-xs text-slate-500">
            Axial distributions (inviscid MOC centerline / wall)
          </p>
          <div className="mx-auto max-w-3xl space-y-1">
            <LinePlot label="Mach (centerline)" x={flow.x} y={flow.Mach} xMax={Lplot} color="#22d3ee" />
            <LinePlot label={areaPlotLabel} x={flow.x} y={flow.areaRatio} xMax={Lplot} color="#38bdf8" />
            <LinePlot label={wallPlotLabel} x={flow.x} y={flow.yWall} xMax={Lplot} color="#a3e635" />
            <LinePlot
              label="δ (mm) on wall"
              x={moc.wallX}
              y={blc.delta.map((d) => d * 1e3)}
              xMax={Lplot}
              color="#fbbf24"
            />
            <LinePlot
              label={`${wallPlotLabel} BLC`}
              x={blc.wallX}
              y={blc.wallY}
              xMax={Lplot}
              color="#fbbf24"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
