import type { NozzleState } from '../utils/nozzleFlow'
import { formatBar, formatMdot, formatPa } from '../utils/units'

interface OutputPanelProps {
  side: 'inlet' | 'outlet'
  p0: number
  T0: number
  gamma: number
  R: number
  throatMm: number
  At: number
  mdot: number
  Me?: number
  AeOverAt?: number
  pe?: number
  Te?: number
  rhoe?: number
  Ue?: number
  pb?: number
  state?: NozzleState
}

const STATE_LABELS: Record<NozzleState, string> = {
  underexpanded: 'Underexpanded',
  'ideally-expanded': 'Ideally expanded',
  overexpanded: 'Overexpanded',
  'internal-shock': 'Internal normal shock',
  unstarted: 'Unstarted / choking failure',
}

const STATE_COLORS: Record<NozzleState, string> = {
  underexpanded: 'text-amber-400',
  'ideally-expanded': 'text-emerald-400',
  overexpanded: 'text-orange-400',
  'internal-shock': 'text-rose-400',
  unstarted: 'text-red-500',
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-slate-700/50 py-1.5 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-right text-slate-100">{value}</span>
    </div>
  )
}

export function OutputPanel(props: OutputPanelProps) {
  const { side } = props

  if (side === 'inlet') {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Inlet / stagnation
        </h3>
        <Row label="p0" value={`${formatBar(props.p0)} (${formatPa(props.p0)})`} />
        <Row label="T0" value={`${props.T0.toFixed(0)} K`} />
        <Row label="γ" value={props.gamma.toFixed(2)} />
        <Row label="R" value={`${props.R.toFixed(0)} J/(kg·K)`} />
        <Row label="Throat size" value={`${props.throatMm.toFixed(1)} mm`} />
        <Row label="At" value={`${(props.At * 1e6).toFixed(2)} mm²`} />
        <Row label="ṁ (choked)" value={formatMdot(props.mdot)} />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Outlet / results
      </h3>
      <Row label="Me (design)" value={props.Me?.toFixed(2) ?? '—'} />
      <Row label="Ae/At" value={props.AeOverAt?.toFixed(3) ?? '—'} />
      <Row label="pe" value={props.pe != null ? formatBar(props.pe) : '—'} />
      <Row label="Te" value={props.Te != null ? `${props.Te.toFixed(1)} K` : '—'} />
      <Row
        label="ρe"
        value={props.rhoe != null ? `${props.rhoe.toFixed(4)} kg/m³` : '—'}
      />
      <Row label="Ue" value={props.Ue != null ? `${props.Ue.toFixed(1)} m/s` : '—'} />
      <Row label="pb" value={props.pb != null ? formatBar(props.pb) : '—'} />
      {props.state && (
        <div className="mt-2 rounded border border-slate-600 bg-slate-800/80 px-2 py-2">
          <span className="text-xs text-slate-400">Nozzle state</span>
          <p className={`text-sm font-semibold ${STATE_COLORS[props.state]}`}>
            {STATE_LABELS[props.state]}
          </p>
        </div>
      )}
    </div>
  )
}
