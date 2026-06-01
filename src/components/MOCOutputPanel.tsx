import type { MOCResult } from '../utils/moc2d'
import type { MOCGeometryType } from '../utils/mocNozzle'
import { radToDeg } from '../utils/prandtlMeyer'
import { formatBar, formatMdot } from '../utils/units'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-slate-700/50 py-1.5 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-right text-slate-100">{value}</span>
    </div>
  )
}

interface MOCOutputPanelProps {
  side: 'inlet' | 'outlet'
  p0: number
  T0: number
  gamma: number
  R: number
  htMm: number
  nLines: number
  geometryType: MOCGeometryType
  mdot: number
  mdotLabel: string
  moc?: MOCResult
  Me?: number
  pe?: number
  Te?: number
  Ue?: number
}

export function MOCOutputPanel(props: MOCOutputPanelProps) {
  const geomLabel = props.geometryType === 'planar' ? '2D planar' : 'Axisymmetric'
  const throatLabel = props.geometryType === 'planar' ? 'ht' : 'rt'

  if (props.side === 'inlet') {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Inlet / stagnation
        </h3>
        <Row label="Geometry" value={geomLabel} />
        <Row label="p0" value={formatBar(props.p0)} />
        <Row label="T0" value={`${props.T0.toFixed(0)} K`} />
        <Row label="γ" value={props.gamma.toFixed(2)} />
        <Row label="R" value={`${props.R.toFixed(0)} J/(kg·K)`} />
        <Row label={`Throat ${throatLabel}`} value={`${props.htMm.toFixed(1)} mm`} />
        <Row label="Char. lines n" value={String(props.nLines)} />
        <Row label={props.mdotLabel} value={formatMdot(props.mdot)} />
      </div>
    )
  }

  const moc = props.moc
  const pctDiff =
    moc && moc.AeOverAtIdeal > 0
      ? (((moc.AeOverAtGeometric - moc.AeOverAtIdeal) / moc.AeOverAtIdeal) * 100).toFixed(1)
      : null

  const areaLabel =
    props.geometryType === 'planar' ? 'Ae/At (h/ht)' : 'Ae/At (r/rt)²'

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Outlet / MOC design
      </h3>
      <Row label="Me (design)" value={props.Me?.toFixed(2) ?? '—'} />
      {moc && (
        <>
          <Row label="νe" value={`${radToDeg(moc.nuExit).toFixed(2)}°`} />
          <Row label="θmax" value={`${radToDeg(moc.thetaMax).toFixed(2)}°`} />
          <Row
            label="μe"
            value={`${radToDeg(moc.centerlineMu[moc.centerlineMu.length - 1] ?? 0).toFixed(2)}°`}
          />
          <Row label={`${areaLabel} geom.`} value={moc.AeOverAtGeometric.toFixed(3)} />
          <Row label="Ae/At (1D ideal)" value={moc.AeOverAtIdeal.toFixed(3)} />
          {pctDiff != null && <Row label="Area Δ" value={`${pctDiff}%`} />}
          <Row label="L" value={`${(moc.L * 1e3).toFixed(1)} mm`} />
        </>
      )}
      <Row label="pe (design)" value={props.pe != null ? formatBar(props.pe) : '—'} />
      <Row label="Te" value={props.Te != null ? `${props.Te.toFixed(1)} K` : '—'} />
      <Row label="Ue" value={props.Ue != null ? `${props.Ue.toFixed(1)} m/s` : '—'} />
      <div className="mt-2 rounded border border-emerald-900/50 bg-emerald-950/40 px-2 py-2">
        <span className="text-xs text-slate-400">Expansion</span>
        <p className="text-sm font-semibold text-emerald-400">Ideally expanded (design)</p>
      </div>
    </div>
  )
}
