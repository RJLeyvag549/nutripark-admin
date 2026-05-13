import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';

// Páginas
import Dashboard from './pages/Dashboard';
import Empleados from './pages/Empleados';
import ListaEspera from './pages/ListaEspera';
import Visitas from './pages/Visitas';
import VisitasHistorial from './pages/VisitasHistorial';
import Incidencias from './pages/Incidencias';
import Reportes from './pages/Reportes';

const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const token = localStorage.getItem('admin_token');
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rutas Privadas */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/empleados" element={<PrivateRoute><Empleados /></PrivateRoute>} />
        <Route path="/listaespera" element={<PrivateRoute><ListaEspera /></PrivateRoute>} />
        <Route path="/visitas" element={<PrivateRoute><Visitas /></PrivateRoute>} />
        <Route path="/visitas-historial" element={<PrivateRoute><VisitasHistorial /></PrivateRoute>} />
        <Route path="/incidencias" element={<PrivateRoute><Incidencias /></PrivateRoute>} />
        <Route path="/reportes" element={<PrivateRoute><Reportes /></PrivateRoute>} />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
