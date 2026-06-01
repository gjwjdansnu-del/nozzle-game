import type { MOCGeometryType } from '../utils/mocNozzle'
import {
  contourToCsv,
  downloadTextFile,
  wallArraysToContour,
  type ContourPoint,
} from '../utils/nozzleContourCsv'
import { APP_VERSION } from '../version'

interface NozzleCsvDownloadProps {
  wallX: number[]
  wallY: number[]
  geometryType: MOCGeometryType
  Me: number
  filename: string
  label: string
  className?: string
}

export function NozzleCsvDownload({
  wallX,
  wallY,
  geometryType,
  Me,
  filename,
  label,
  className = '',
}: NozzleCsvDownloadProps) {
  const handleClick = () => {
    const points: ContourPoint[] = wallArraysToContour(wallX, wallY)
    const csv = contourToCsv(points, {
      geometryType,
      label,
      Me,
      version: APP_VERSION,
    })
    downloadTextFile(filename, csv)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-cyan-400 hover:border-cyan-600 hover:text-cyan-200 ${className}`}
    >
      Download CSV
    </button>
  )
}
