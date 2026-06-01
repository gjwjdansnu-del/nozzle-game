import { Navigate } from 'react-router-dom'

/** Merged into /moc — keep route for old links. */
export function MOCBoundaryLayer() {
  return <Navigate to="/moc" replace />
}
