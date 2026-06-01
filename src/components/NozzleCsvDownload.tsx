import type { MOCGeometryType } from '../utils/mocNozzle'
import {
  contourToCsv,
  downloadTextFile,
  wallArraysToContour,
} from '../utils/nozzleContourCsv'
import { APP_VERSION } from '../version'

interface NozzleContourPairDownloadProps {
  inviscidX: number[]
  inviscidY: number[]
  blcX: number[]
  blcY: number[]
  geometryType: MOCGeometryType
  Me: number
  className?: string
}

/** Download inviscid and BL-corrected wall contours as two CSV files. */
export function NozzleContourPairDownload({
  inviscidX,
  inviscidY,
  blcX,
  blcY,
  geometryType,
  Me,
  className = '',
}: NozzleContourPairDownloadProps) {
  const handleClick = () => {
    const meta = { geometryType, Me, version: APP_VERSION }
    const inv = contourToCsv(wallArraysToContour(inviscidX, inviscidY), {
      ...meta,
      label: 'inviscid MOC wall',
    })
    const blc = contourToCsv(wallArraysToContour(blcX, blcY), {
      ...meta,
      label: 'BL-corrected wall',
    })
    downloadTextFile('nozzle_contour_inviscid.csv', inv)
    downloadTextFile('nozzle_contour_blc.csv', blc)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-cyan-400 hover:border-cyan-600 hover:text-cyan-200 ${className}`}
    >
      Download CSV (inviscid + BLC)
    </button>
  )
}
