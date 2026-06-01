import { AppVersion } from '../components/AppVersion'
import { ModeCard } from '../components/ModeCard'

export function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10 text-center">
        <AppVersion className="mb-1" />
        <h1 className="text-4xl font-bold tracking-tight text-white">Nozzle Game</h1>
        <p className="mt-3 text-slate-400">
          Lightweight educational tools for rocket nozzle design — client-side quasi-1D models
          and placeholders for MOC &amp; CFD.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <ModeCard
          title="Quasi-1D Nozzle Design"
          description="Isentropic quasi-one-dimensional nozzle with back-pressure states, optional internal shock, and synchronized plots."
          to="/quasi-1d"
        />
        <ModeCard
          title="MOC Nozzle Design"
          description="Method of characteristics for 2D and 3D nozzle contours."
          to="/moc"
          badges={['2D', '3D']}
        />
        <ModeCard
          title="MOC + Boundary-Layer Correction"
          description="MOC design with displacement-thickness boundary-layer correction."
          to="/moc-bl-correction"
          badges={['2D', '3D']}
        />
        <ModeCard
          title="CFD Nozzle Design"
          description="Full CFD-based nozzle analysis (future module)."
          to="/cfd"
        />
      </div>
    </div>
  )
}
