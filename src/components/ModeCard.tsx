import { Link } from 'react-router-dom'

interface ModeCardProps {
  title: string
  description: string
  to: string
  badges?: string[]
}

export function ModeCard({ title, description, to, badges }: ModeCardProps) {
  return (
    <Link
      to={to}
      className="group flex min-h-[160px] flex-col justify-between rounded-xl border border-slate-700 bg-slate-800/60 p-6 transition hover:border-cyan-500/60 hover:bg-slate-800 hover:shadow-lg hover:shadow-cyan-900/20"
    >
      <div>
        <h2 className="text-xl font-semibold text-white group-hover:text-cyan-300">{title}</h2>
        {badges && badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300"
              >
                {b}
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>
      </div>
      <span className="mt-4 text-sm font-medium text-cyan-400">Open →</span>
    </Link>
  )
}
