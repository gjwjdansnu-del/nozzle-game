import { Link } from 'react-router-dom'
import { AppVersion } from '../components/AppVersion'

export function MOCBoundaryLayer() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f1419]">
      <Link to="/" className="absolute left-6 top-6 text-sm text-cyan-500 hover:text-cyan-300">
        ← Home
      </Link>
      <AppVersion className="mb-2" />
      <h1 className="text-3xl font-bold text-white">MOC + Boundary-Layer Correction</h1>
      <p className="text-slate-400">2D / 3D</p>
      <p className="text-xl text-slate-500">Coming soon</p>
    </div>
  )
}
