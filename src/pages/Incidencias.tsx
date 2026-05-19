import { useState, useEffect, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import { AlertTriangle, CheckCircle2, Clock, Eye, X } from 'lucide-react';
import { io } from 'socket.io-client';

declare global {
  interface Window {
    DataTable: any;
    $: any;
  }
}

interface Incidencia {
  idIncidencia: number;
  idEmpleado: string;
  nombreEmpleado: string;
  idCalzo: number | null;
  categoria: string;
  descripcion: string;
  foto: string | null;
  fechaReporte: string;
  estado: 'Pendiente' | 'Resuelta';
  visto: boolean;
}

export default function Incidencias() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIncidencia, setSelectedIncidencia] = useState<Incidencia | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showNomenclature, setShowNomenclature] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar re-renderizado limpio

  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableInstance = useRef<any>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    // Cargar jQuery y DataTables si no están
    const loadScripts = async () => {
      if (!window.$) {
        const jquery = document.createElement('script');
        jquery.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
        jquery.async = true;
        document.body.appendChild(jquery);
        await new Promise(res => jquery.onload = res);
      }

      if (!window.DataTable) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '//cdn.datatables.net/2.3.8/css/dataTables.dataTables.min.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = '//cdn.datatables.net/2.3.8/js/dataTables.min.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise(res => script.onload = res);
      }

      fetchData();
    };

    loadScripts();

    // Socket connection
    const socket = io(API_URL);
    socket.on('incidencia:nueva', () => {
      fetchData();
      setRefreshKey(prev => prev + 1);
    });
    socket.on('incidencia:actualizada', () => {
      fetchData();
      setRefreshKey(prev => prev + 1);
    });
    socket.on('incidencia:vista', () => {
      fetchData();
      setRefreshKey(prev => prev + 1);
    });

    return () => {
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy(true);
      }
      socket.disconnect();
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/admin/incidencias`, {
        headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        setIncidencias(data);
      }
    } catch (error) {
      console.error('Error fetching incidencias:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && window.DataTable && tableRef.current) {
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy();
      }

      dataTableInstance.current = new window.DataTable(tableRef.current, {
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_',
          info: 'Mostrando _START_ a _END_ de _TOTAL_',
          infoEmpty: 'Sin incidencias',
          zeroRecords: 'No se encontraron resultados'
        },
        pageLength: 10,
        stateSave: true,
        order: [[3, 'desc']], // Ordenar por fecha desc por defecto
        columnDefs: [
          { orderable: false, targets: [5] } // Botón de acción no ordenable
        ]
      });
    }
  }, [loading, incidencias]);

  const handleUpdateStatus = async (id: number, nuevoEstado: string) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/admin/incidencias/${id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (res.ok) {
        // Actualizar localmente la incidencia seleccionada si está abierta
        if (selectedIncidencia && selectedIncidencia.idIncidencia === id) {
          setSelectedIncidencia({ ...selectedIncidencia, estado: nuevoEstado as any });
        }
        await fetchData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const openReport = async (inc: Incidencia) => {
    setSelectedIncidencia(inc);
    setShowModal(true);

    // Marcar como visto si no lo estaba
    if (!inc.visto) {
      try {
        const token = localStorage.getItem('admin_token');
        await fetch(`${API_URL}/admin/incidencias/${inc.idIncidencia}/visto`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        // Actualizar localmente para feedback inmediato
        setIncidencias(prev => prev.map(i => i.idIncidencia === inc.idIncidencia ? { ...i, visto: true } : i));
      } catch (e) {
        console.error('Error marking as seen:', e);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Resuelta') {
      return (
        <span className="flex items-center gap-1.5 w-max bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase">
          <CheckCircle2 size={12} /> Resuelta
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 w-max bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
        <Clock size={12} /> Pendiente
      </span>
    );
  };

  return (
    <div className="p-8 min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] employees-page">
      <style>{`
        .employees-page .dt-container { color: var(--text-main) !important; font-family: 'Inter', sans-serif; }
        table.dataTable { background-color: var(--bg-card) !important; border-radius: 20px; overflow: hidden; border: 1px solid var(--border-color) !important; margin-top: 20px !important; }
        table.dataTable thead th { background-color: var(--bg-main) !important; color: #ff7700 !important; border-bottom: 2px solid #ff7700 !important; padding: 15px !important; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
        table.dataTable tbody td { background-color: transparent !important; color: var(--text-main) !important; border-bottom: 1px solid var(--border-color) !important; padding: 12px 15px !important; }
        .dt-search input { background-color: var(--bg-main) !important; border: 1px solid var(--border-color) !important; color: var(--text-main) !important; border-radius: 12px !important; padding: 8px 15px !important; }
        .dt-paging-button.current { background: #ff7700 !important; border-color: #ff7700 !important; color: white !important; border-radius: 8px !important; }
      `}</style>

      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic text-orange-500">Historial de Incidencias</h1>
          <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest">Registro y gestión de eventos reportados en planta</p>
        </div>
        <button
          onClick={() => setShowNomenclature(true)}
          className="flex items-center gap-2 bg-[var(--bg-main)] border border-[var(--border-color)] hover:bg-orange-500/10 hover:text-orange-500 text-[var(--text-main)] px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-sm"
        >
          <AlertTriangle size={14} /> Nomenclatura
        </button>
      </div>

      <div className="relative min-h-[400px]">
        {/* Loader en un nivel superior e independiente del contenedor de la tabla */}
        {loading && (
          <div className="absolute inset-0 z-[20] bg-[var(--bg-main)]/60 backdrop-blur-md flex items-center justify-center rounded-[30px] border border-[var(--border-color)]">
            <PageLoader message="Cargando incidencias..." />
          </div>
        )}

        {/* Contenedor aislado para la tabla con KEY para forzar reconstrucción limpia */}
        <div key={refreshKey} className="bg-[var(--bg-card)] p-6 rounded-[30px] border border-[var(--border-color)] shadow-2xl overflow-hidden">
          <table ref={tableRef} className="display row-border stripe w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>RUT Empleado</th>
                <th>Categoría</th>
                <th>Fecha Reporte</th>
                <th>Estado</th>
                <th className="text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {incidencias.map((inc) => (
                <tr key={inc.idIncidencia} className={!inc.visto ? 'bg-orange-500/5 font-bold' : ''}>
                  <td className="text-orange-500 font-black">#{inc.idIncidencia}</td>
                  <td className="font-bold">
                    {!inc.visto && <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>}
                    {inc.idEmpleado}
                  </td>
                  <td>
                    <span className="bg-white/5 border border-[var(--border-color)] px-2 py-1 rounded text-xs font-bold uppercase">
                      {inc.categoria}
                    </span>
                  </td>
                  <td className="text-[var(--text-muted)] font-medium">{formatDate(inc.fechaReporte)}</td>
                  <td>{getStatusBadge(inc.estado)}</td>
                  <td className="text-center">
                    <button
                      onClick={() => openReport(inc)}
                      className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                    >
                      <Eye size={14} /> VER REPORTE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Reporte */}
      {showModal && selectedIncidencia && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative">

            {/* Header Modal */}
            <div className="p-8 border-b border-[var(--border-color)] bg-[var(--bg-main)]/50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-3">
                  Detalle del Reporte
                  {getStatusBadge(selectedIncidencia.estado)}
                </h2>
                <p className="text-[var(--text-muted)] text-sm font-bold mt-1">
                  ID #{selectedIncidencia.idIncidencia} — Emitido por {selectedIncidencia.nombreEmpleado || 'Empleado'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 bg-[var(--bg-main)] hover:bg-red-500/10 hover:text-red-500 text-[var(--text-muted)] rounded-full flex items-center justify-center transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border-color)]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Categoría</p>
                  <p className="text-orange-500 font-black text-lg uppercase">{selectedIncidencia.categoria}</p>
                </div>
                <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border-color)]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Fecha y Hora</p>
                  <p className="text-[var(--text-main)] font-bold text-lg">{formatDate(selectedIncidencia.fechaReporte)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Descripción del Suceso</h3>
                <div className="bg-[var(--bg-main)] p-6 rounded-3xl border border-[var(--border-color)] text-[var(--text-main)] leading-relaxed italic italic font-medium">
                  "{selectedIncidencia.descripcion || 'Sin descripción detallada.'}"
                </div>
              </div>

              {selectedIncidencia.foto && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Evidencia Fotográfica</h3>
                  <div className="rounded-3xl border-4 border-[var(--border-color)] overflow-hidden shadow-2xl bg-black flex items-center justify-center">
                    <img
                      src={selectedIncidencia.foto}
                      alt="Evidencia"
                      className="max-w-full h-auto object-contain hover:scale-105 transition-transform duration-500"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                </div>
              )}

              {!selectedIncidencia.foto && (
                <div className="p-6 bg-gray-500/5 border border-dashed border-[var(--border-color)] rounded-3xl text-center">
                  <p className="text-[var(--text-muted)] font-bold text-sm uppercase tracking-widest">No se adjuntó fotografía</p>
                </div>
              )}
            </div>

            {/* Footer Modal / Acciones */}
            <div className="p-8 bg-[var(--bg-main)]/80 border-t border-[var(--border-color)] flex gap-4">
              {selectedIncidencia.estado === 'Pendiente' ? (
                <button
                  onClick={() => handleUpdateStatus(selectedIncidencia.idIncidencia, 'Resuelta')}
                  disabled={submitting}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black tracking-widest text-xs uppercase shadow-xl shadow-green-900/20 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? 'PROCESANDO...' : <><CheckCircle2 size={16} /> MARCAR COMO RESUELTA</>}
                </button>
              ) : (
                <button
                  onClick={() => handleUpdateStatus(selectedIncidencia.idIncidencia, 'Pendiente')}
                  disabled={submitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-black tracking-widest text-xs uppercase shadow-xl shadow-amber-900/20 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? 'PROCESANDO...' : <><Clock size={16} /> REABRIR INCIDENCIA (PENDIENTE)</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nomenclatura */}
      {showNomenclature && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[30px] shadow-2xl w-full max-w-4xl overflow-hidden relative">
            <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-main)]/50 flex justify-between items-center">
              <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                <AlertTriangle size={20} className="text-orange-500" /> Nomenclatura de Categorías
              </h2>
              <button
                onClick={() => setShowNomenclature(false)}
                className="w-8 h-8 hover:bg-red-500/10 hover:text-red-500 text-[var(--text-muted)] rounded-full flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)] flex flex-col justify-between">
                <div>
                  <p className="font-bold text-orange-500 mb-1 text-sm uppercase">ocupado</p>
                  <p className="font-bold text-[var(--text-main)] text-xs mb-2">Calzo Ocupado</p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">El calzo asignado está siendo ocupado por un vehículo no autorizado.</p>
                </div>
              </div>
              <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)] flex flex-col justify-between">
                <div>
                  <p className="font-bold text-orange-500 mb-1 text-sm uppercase">prohibido</p>
                  <p className="font-bold text-[var(--text-main)] text-xs mb-2">Zona Prohibida</p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">Vehículo estacionado en áreas amarillas, salidas de emergencia o zonas restringidas.</p>
                </div>
              </div>
              <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)] flex flex-col justify-between">
                <div>
                  <p className="font-bold text-orange-500 mb-1 text-sm uppercase">obstruccion</p>
                  <p className="font-bold text-[var(--text-main)] text-xs mb-2">Obstrucción</p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">Vehículo mal estacionado que bloquea el paso o impide la salida de otros calzos.</p>
                </div>
              </div>
              <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)] flex flex-col justify-between">
                <div>
                  <p className="font-bold text-orange-500 mb-1 text-sm uppercase">infraestructura</p>
                  <p className="font-bold text-[var(--text-main)] text-xs mb-2">Problema de Planta</p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">Daños en baches, pintura, iluminación o barreras en la zona de parqueo.</p>
                </div>
              </div>
              <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)] flex flex-col justify-between lg:col-span-1">
                <div>
                  <p className="font-bold text-orange-500 mb-1 text-sm uppercase">otro</p>
                  <p className="font-bold text-[var(--text-main)] text-xs mb-2">Otros Sucesos</p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">Cualquier otro tipo de incidente reportado que no entra en las categorías anteriores.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
