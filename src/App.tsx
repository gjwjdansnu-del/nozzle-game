import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { Quasi1D } from './pages/Quasi1D'
import { MOC } from './pages/MOC'
import { MOCBoundaryLayer } from './pages/MOCBoundaryLayer'
import { CFD } from './pages/CFD'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quasi-1d" element={<Quasi1D />} />
        <Route path="/moc" element={<MOC />} />
        <Route path="/moc-bl-correction" element={<MOCBoundaryLayer />} />
        <Route path="/cfd" element={<CFD />} />
      </Routes>
    </BrowserRouter>
  )
}
