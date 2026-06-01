import { APP_VERSION } from '../version'

export function AppVersion({ className = '' }: { className?: string }) {
  return (
    <p className={`font-mono text-xs tracking-wide text-slate-500 ${className}`}>
      v{APP_VERSION}
    </p>
  )
}
