import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProveedorSensores } from './lib/contexto';
import { ProveedorDatos } from './lib/datos';
import Bienvenida from './features/inicio/Bienvenida';
import ExplorarRA from './features/explorar-ra/ExplorarRA';
import PruebaRA from './features/explorar-ra/PruebaRA';
import Ficha from './features/ficha/Ficha';
import Guia from './features/guia/Guia';
import Pasaporte from './features/pasaporte/Pasaporte';
import Ruta from './features/pasaporte/Ruta';
import Sello from './features/pasaporte/Sello';
import Pantallas from './features/demo/Pantallas';

// El mapa (MapLibre) y el lector de QR pesan: se cargan solo cuando se abren
const Mapa = lazy(() => import('./features/mapa/Mapa'));
const Escanear = lazy(() => import('./features/qr/Escanear'));

export default function App() {
  return (
    <ProveedorDatos>
    <ProveedorSensores>
      <Suspense fallback={<main className="pantalla" />}>
      <Routes>
        <Route path="/" element={<Bienvenida />} />
        <Route path="/explorar" element={<ExplorarRA />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/lugar/:id" element={<Ficha />} />
        <Route path="/guia/:id" element={<Guia />} />
        <Route path="/escanear" element={<Escanear />} />
        {/* URL de los carteles QR (D4): abre la app con el código ya leído */}
        <Route path="/qr/:codigo" element={<Escanear />} />
        <Route path="/pasaporte" element={<Pasaporte />} />
        <Route path="/ruta/:id" element={<Ruta />} />
        <Route path="/sello/:id" element={<Sello />} />
        <Route path="/pantallas" element={<Pantallas />} />
        <Route path="/prueba-ra" element={<PruebaRA />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </ProveedorSensores>
    </ProveedorDatos>
  );
}
