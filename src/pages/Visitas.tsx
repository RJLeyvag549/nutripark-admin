import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { CheckCircle, XCircle, Clock, Check, X } from 'lucide-react';

declare global {
  interface Window {
    DataTable: any;
    $: any;
    jQuery: any;
  }
}

interface ConfirmModalState {
  show: boolean;
  idVisita: number | null;
  accion: 'Aprobar' | 'Rechazar' | null;
  nombre: string;
}

export default function Visitas() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'historial'>(
    (localStorage.getItem('visitas_tab') as 'pendientes' | 'historial') || 'pendientes'
  );
  const [visitasPendientes, setVisitasPendientes] = useState<any[]>([]);
  const [visitasHistorial, setVisitasHistorial] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isFetching = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtroHistorial, setFiltroHistorial] = useState<string>('todos');
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    show: false,
    idVisita: null,
    accion: null,
    nombre: ''
  });

  useEffect(() => {
    localStorage.setItem('visitas_tab', activeTab);
  }, [activeTab]);

  const tablePendientesRef = useRef<HTMLTableElement>(null);
  const tableHistorialRef = useRef<HTMLTableElement>(null);
  const dataTablePendientes = useRef<any>(null);
  const dataTableHistorial = useRef<any>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const socket = io(API_URL);

    // Escuchar múltiples eventos para mantener la tabla fresca
    socket.on('visita_actualizada', () => {
      setTimeout(() => fetchData(), 200);
    });
    socket.on('nueva_solicitud_visita', () => {
      setTimeout(() => fetchData(), 200);
      // Opcional: Sonido de notificación
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => { });
    });

    const jqueryScript = document.createElement('script');
    jqueryScript.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
    jqueryScript.async = true;
    jqueryScript.onload = () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '//cdn.datatables.net/2.3.8/css/dataTables.dataTables.min.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = '//cdn.datatables.net/2.3.8/js/dataTables.min.js';
      script.async = true;
      script.onload = () => fetchData();
      document.body.appendChild(script);
    };
    document.body.appendChild(jqueryScript);

    return () => {
      socket.disconnect();
      if (dataTablePendientes.current) dataTablePendientes.current.destroy(true);
      if (dataTableHistorial.current) dataTableHistorial.current.destroy(true);
    };
  }, []);

  const fetchData = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const [resPendientes, resHistorial] = await Promise.all([
        fetch(`${API_URL}/access/visitas/pendientes`, { headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' } }),
        fetch(`${API_URL}/access/visitas/historial`, { headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' } })
      ]);

      if (resPendientes.ok) {
        const data = await resPendientes.json();
        setVisitasPendientes(data);
      }
      if (resHistorial.ok) {
        const data = await resHistorial.json();
        const statusWeights: Record<string, number> = {
          'En Planta': 1,
          'Esperando': 2,
          'Finalizada': 3,
          'Cancelada': 4,
          'Rechazada': 4
        };
        const sortedData = [...data].sort((a, b) => {
          const weightA = statusWeights[a.Estado_Operativo] || 99;
          const weightB = statusWeights[b.Estado_Operativo] || 99;
          if (weightA !== weightB) return weightA - weightB;
          return new Date(b.Fecha_Entrada).getTime() - new Date(a.Fecha_Entrada).getTime();
        });
        setVisitasHistorial(sortedData);
      }
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  useEffect(() => {
    if (!loading && window.DataTable) {
      if (activeTab === 'pendientes' && tablePendientesRef.current) {
        if (dataTablePendientes.current) {
          dataTablePendientes.current.destroy();
          dataTablePendientes.current = null;
        }
        dataTablePendientes.current = new window.DataTable(tablePendientesRef.current, {
          destroy: true,
          language: { search: 'Buscar:', lengthMenu: 'Mostrar _MENU_', info: 'Página _PAGE_ de _PAGES_', zeroRecords: 'Sin visitas pendientes' },
          pageLength: 10,
          order: [[6, 'asc']],
          columnDefs: [{ orderable: false, targets: [0] }]
        });
      }
      if (activeTab === 'historial' && tableHistorialRef.current) {
        if (dataTableHistorial.current) {
          dataTableHistorial.current.destroy();
          dataTableHistorial.current = null;
        }
        dataTableHistorial.current = new window.DataTable(tableHistorialRef.current, {
          destroy: true,
          language: { search: 'Buscar:', lengthMenu: 'Mostrar _MENU_', info: 'Página _PAGE_ de _PAGES_', zeroRecords: 'Sin historial' },
          pageLength: 10,
          order: []
        });
      }
    }
  }, [loading, activeTab, visitasPendientes, visitasHistorial, refreshKey, filtroHistorial]);

  const handleConfirmAction = async () => {
    if (!confirmModal.idVisita || !confirmModal.accion) return;

    setSubmitting(true);
    const { idVisita, accion } = confirmModal;
    setConfirmModal({ ...confirmModal, show: false });

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/access/visitas/${idVisita}/gestionar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ accion })
      });
      if (res.ok) fetchData();
    } catch (error) {
      alert('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => dateString ? new Date(dateString).toLocaleString('es-CL') : '-';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Esperando':
        return <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase"><Clock size={12} /> Esperando</span>;
      case 'En Planta':
        return <span className="flex items-center gap-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase"><CheckCircle size={12} /> En Planta</span>;
      case 'Finalizada':
        return <span className="flex items-center gap-1 bg-gray-500/10 text-gray-500 border border-gray-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase"><CheckCircle size={12} /> Finalizada</span>;
      case 'Cancelada':
      case 'Rechazada':
        return <span className="flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase"><XCircle size={12} /> {status}</span>;
      default:
        return <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase">{status}</span>;
    }
  };

  return (
    <div className="page-content text-[var(--text-main)] employees-page">
      <style>{`
        .employees-page .dt-container { color: var(--text-main) !important; font-family: 'Inter', sans-serif; width: 100% !important; }
        .table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 10px; border-radius: 20px; }
        table.dataTable { background-color: var(--bg-card) !important; border-radius: 20px; overflow: hidden; margin-top: 0 !important; width: 100% !important; border: 1px solid var(--border-color) !important; }
        table.dataTable thead th { background-color: var(--bg-main) !important; color: #ff7700 !important; border-bottom: 2px solid #ff7700 !important; padding: 15px 12px !important; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
        table.dataTable tbody td { background-color: transparent !important; color: var(--text-main) !important; border-bottom: 1px solid var(--border-color) !important; padding: 12px !important; font-size: 0.85rem; }
        .dt-search input { background-color: var(--bg-main) !important; border: 1px solid var(--border-color) !important; color: var(--text-main) !important; border-radius: 12px !important; padding: 6px 12px !important; }
        .tab-btn { padding: 12px 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; transition: all 0.3s; font-size: 0.75rem; border-radius: 18px; }
      `}</style>

      {/* Modal de Confirmación */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[35px] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${confirmModal.accion === 'Aprobar' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                {confirmModal.accion === 'Aprobar' ? <Check size={32} /> : <X size={32} />}
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tight text-[var(--text-main)] mb-2">
                ¿{confirmModal.accion} Visita?
              </h3>
              <p className="text-[var(--text-muted)] text-sm font-medium leading-relaxed px-4">
                Estás a punto de <span className="font-bold text-[var(--text-main)]">{confirmModal.accion?.toLowerCase()}</span> la solicitud de <span className="text-orange-500 font-bold">{confirmModal.nombre}</span>. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex border-t border-[var(--border-color)]">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="flex-1 px-6 py-5 text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-colors border-r border-[var(--border-color)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 px-6 py-5 text-xs font-black uppercase tracking-widest text-white transition-colors ${confirmModal.accion === 'Aprobar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {submitting && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-[var(--border-color)]">
            <div className="flex gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"></div><div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div><div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div></div>
            <p className="mt-4 font-black uppercase tracking-widest text-[10px] text-orange-500">Procesando Cambio...</p>
          </div>
        </div>
      )}

      <div className="mb-6 sm:mb-8">
        <h1 className="page-title">Gestión de Visitas</h1>
        <p className="page-subtitle">Control centralizado de acceso para invitados</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[22px] w-full sm:w-max shadow-lg">
        <button
          onClick={() => setActiveTab('pendientes')}
          className={`tab-btn flex-1 sm:flex-none text-center ${activeTab === 'pendientes' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-[var(--text-muted)] hover:bg-[var(--bg-main)]'}`}
        >
          <span className="hidden sm:inline">Solicitudes Pendientes</span>
          <span className="sm:hidden">Pendientes</span>
          {' '}({visitasPendientes.length})
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`tab-btn flex-1 sm:flex-none text-center ${activeTab === 'historial' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-[var(--text-muted)] hover:bg-[var(--bg-main)]'}`}
        >
          <span className="hidden sm:inline">Historial de Solicitudes</span>
          <span className="sm:hidden">Historial</span>
        </button>
      </div>

      <div className="bg-[var(--bg-card)] p-4 sm:p-6 rounded-[40px] border border-[var(--border-color)] shadow-2xl overflow-hidden h-auto">
        {loading && visitasPendientes.length === 0 && visitasHistorial.length === 0 ? (
          <div className="py-20 flex justify-center">
            <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            <div key={`container-pendientes-${refreshKey}`} className="table-responsive" style={{ display: activeTab === 'pendientes' ? 'block' : 'none' }}>
              <table ref={tablePendientesRef} className="display row-border stripe w-full">
                <thead>
                  <tr>
                    <th className="text-center">Acción</th>
                    <th>Visitante</th>
                    <th>RUT</th>
                    <th>Anfitrión</th>
                    <th>Motivo</th>
                    <th>Matrícula</th>
                    <th>Entrada</th>
                    <th className="text-center">Zona</th>
                  </tr>
                </thead>
                <tbody>
                  {visitasPendientes.map((v) => (
                    <tr key={`pend-${v.ID_Visita}`}>
                      <td className="text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setConfirmModal({ show: true, idVisita: v.ID_Visita, accion: 'Aprobar', nombre: v.Nombre_Visante })}
                            className="bg-green-500 hover:bg-green-600 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-green-900/20 active:scale-95"
                            title="Aprobar"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmModal({ show: true, idVisita: v.ID_Visita, accion: 'Rechazar', nombre: v.Nombre_Visante })}
                            className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-red-900/20 active:scale-95"
                            title="Rechazar"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="font-bold">{v.Nombre_Visante}</td>
                      <td className="text-xs font-medium text-[var(--text-muted)]">{v.RUT_Visitante}</td>
                      <td className="text-[10px] uppercase font-black text-orange-500/80">
                        {v.Nombre_Anfitrion || <span className="text-red-500 italic">⚠️ Empleado Eliminado</span>}
                      </td>
                      <td className="max-w-[120px] truncate text-xs italic" title={v.Motivo_Visita}>{v.Motivo_Visita}</td>
                      <td className="font-mono text-xs font-bold">{v.Matricula_Visitante || '-'}</td>
                      <td className="text-xs font-black">{formatDate(v.Fecha_Entrada)}</td>
                      <td className="text-center">
                        <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 uppercase tracking-tighter">
                          {v.Nombre_Zona}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div key={`container-historial-${refreshKey}-${filtroHistorial}`} className="table-responsive" style={{ display: activeTab === 'historial' ? 'block' : 'none' }}>
              <div className="flex flex-wrap gap-2 mb-6 p-1 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] w-fit">
                {['todos', 'En Planta', 'Esperando', 'Finalizada', 'Cancelada'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltroHistorial(f)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      filtroHistorial === f 
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <table ref={tableHistorialRef} className="display row-border stripe w-full">
                <thead>
                  <tr>
                    <th className="text-center">Resultado</th>
                    <th>Visitante</th>
                    <th>Anfitrión</th>
                    <th>Motivo</th>
                    <th>Matrícula</th>
                    <th>Entrada</th>
                    <th className="text-center">Zona</th>
                  </tr>
                </thead>
                <tbody>
                  {visitasHistorial
                    .filter(v => filtroHistorial === 'todos' || v.Estado_Operativo === filtroHistorial || (filtroHistorial === 'Cancelada' && v.Estado_Operativo === 'Rechazada'))
                    .map((v) => (
                    <tr key={`hist-${v.ID_Visita}`}>
                      <td className="text-center">{getStatusBadge(v.Estado_Operativo)}</td>
                      <td className="font-bold">{v.Nombre_Visante}</td>
                      <td className="text-[10px] uppercase font-black text-orange-500/80">
                        {v.Nombre_Anfitrion || <span className="text-red-500 italic">⚠️ Empleado Eliminado</span>}
                      </td>
                      <td className="max-w-[150px] truncate text-xs italic" title={v.Motivo_Visita}>{v.Motivo_Visita}</td>
                      <td className="font-mono text-xs font-bold">{v.Matricula_Visitante || '-'}</td>
                      <td className="text-xs font-black">{formatDate(v.Fecha_Entrada)}</td>
                      <td className="text-center">
                        <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 uppercase tracking-tighter">
                          {v.Nombre_Zona}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
