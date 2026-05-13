import { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';

export default function Reportes() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-[var(--bg-card)] rounded-3xl shadow-sm p-8 text-center border border-[var(--border-color)]">
      {loading && <PageLoader message="Generando reportes..." />}
      <h2 className="text-2xl font-black text-[var(--text-main)] mb-2 uppercase tracking-tight">Reportes y Estadísticas</h2>
      <p className="text-[var(--text-muted)]">Visualización de datos históricos y ocupación.</p>
    </div>
  );
}
