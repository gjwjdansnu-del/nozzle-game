import { Link } from 'react-router-dom'

export function MOC() {
  return (
    <PlaceholderPage title="MOC Nozzle Design" subtitle="2D / 3D method of characteristics" />
  )
}

function PlaceholderPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f1419]">
      <Link to="/" className="absolute left-6 top-6 text-sm text-cyan-500 hover:text-cyan-300">
        ← Home
      </Link>
      <h1 className="text-3xl font-bold text-white">{title}</h1>
      <p className="text-slate-400">{subtitle}</p>
      <p className="text-xl text-slate-500">Coming soon</p>
    </div>
  )
}

export { PlaceholderPage }
