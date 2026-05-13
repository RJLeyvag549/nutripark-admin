import { useState, useEffect, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import { io } from 'socket.io-client';

declare global {
  interface Window {
    DataTable: any;
    $: any;
    jQuery: any;
  }
}

export default function Visitas() {
  const [loading, setLoading] = useState(true);
  const [visitas, setVisitas] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableInstance = useRef<any>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    // Inicializar Socket.io
    const socket = io(API_URL);

    socket.on('visita_actualizada', () => {
      console.log('Evento visita_actualizada recibido. Recargando datos...');
      fetchData();
    });

    // 1. Cargar jQuery
    const jqueryScript = document.createElement('script');
    jqueryScript.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
    jqueryScript.async = true;
    jqueryScript.onload = () => {
      // 2. Cargar CSS de DataTables
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '//cdn.datatables.net/2.3.8/css/dataTables.dataTables.min.css';
      document.head.appendChild(link);

      // 3. Cargar JS de DataTables
      const script = document.createElement('script');
      script.src = '//cdn.datatables.net/2.3.8/js/dataTables.min.js';
      script.async = true;
      script.onload = () => {
        fetchData();
      };
      document.body.appendChild(script);
    };
    document.body.appendChild(jqueryScript);

    return () => {
      socket.disconnect();
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy(true);
      }
    };
  }, []);

  const fetchData = async () => {
    if (dataTableInstance.current) {
      dataTableInstance.current.destroy();
      dataTableInstance.current = null;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/access/visitas/pendientes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVisitas(data);
      }
    } catch (error) {
      console.error('Error fetching visitas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && window.DataTable && tableRef.current) {
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy();
      }

      dataTableInstance.current = new window.DataTable('#visitasTable', {
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
          infoEmpty: 'Sin registros',
          paginate: {
            first: 'Primero',
            last: 'Último',
            next: 'Siguiente',
            previous: 'Anterior'
          },
          zeroRecords: 'No hay visitas pendientes'
        },
        pageLength: 10,
        order: [[6, 'asc']], // Sort by Fecha_Entrada
        columnDefs: [
          { orderable: false, targets: [0] }, // Acciones
          { className: "dt-center", targets: [0, 8] } // Acciones and Calzo
        ]
      });
    }
  }, [loading, visitas]);

  const handleGestionar = async (idVisita: number, accion: 'Aprobar' | 'Rechazar') => {
    if (!window.confirm(`¿Estás seguro de ${accion.toLowerCase()} esta visita?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/access/visitas/${idVisita}/gestionar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ accion })
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.message || `Error al ${accion.toLowerCase()} la visita.`);
      }
    } catch (error) {
      alert('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-CL');
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] employees-page">
      <style>{`
        .employees-page .dt-container { color: var(--text-main) !important; font-family: 'Inter', sans-serif; width: 100% !important; }
        .table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 20px; border-radius: 15px; }
        table.dataTable { background-color: var(--bg-card) !important; border-radius: 15px; overflow: hidden; margin-top: 0 !important; width: 100% !important; border: none !important; }
        table.dataTable thead th { background-color: var(--bg-main) !important; color: #ff7700 !important; border-bottom: 2px solid #ff7700 !important; padding: 12px 10px !important; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; white-space: nowrap; }
        table.dataTable tbody td { background-color: transparent !important; color: var(--text-main) !important; border-bottom: 1px solid var(--border-color) !important; padding: 10px !important; font-size: 0.85rem; }
        .dt-search input, .dt-length select { background-color: var(--bg-main) !important; border: 1px solid var(--border-color) !important; color: var(--text-main) !important; border-radius: 8px !important; padding: 6px 12px !important; outline: none; }
        .dt-paging-button { color: var(--text-main) !important; border: 1px solid var(--border-color) !important; background: var(--bg-card) !important; margin: 0 4px !important; border-radius: 6px !important; }
        .dt-paging-button.current { background: #ff7700 !important; border-color: #ff7700 !important; color: #fff !important; font-weight: bold; }
        .dt-info { color: var(--text-muted) !important; font-size: 0.85rem; }
      `}</style>

      {submitting && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] p-8 rounded-3xl shadow-2xl flex flex-col items-center">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="mt-4 font-bold uppercase tracking-widest text-sm">PROCESANDO SOLICITUD...</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase">Visitas Pendientes</h1>
          <p className="text-[var(--text-muted)] text-sm md:text-base">Aprobación y gestión de acceso para invitados</p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] p-4 md:p-6 rounded-3xl border border-[var(--border-color)] shadow-2xl overflow-hidden">
        {loading ? (
          <div className="py-20">
            <PageLoader message="Cargando visitas pendientes..." />
          </div>
        ) : (
          <div className="table-responsive">
            <table id="visitasTable" ref={tableRef} className="display row-border stripe w-full">
            <thead>
              <tr>
                <th className="text-center w-36">Acciones</th>
                <th>Visitante</th>
                <th>RUT</th>
                <th>Anfitrión</th>
                <th>Motivo</th>
                <th>Matrícula</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th className="text-center">Calzo / Zona</th>
              </tr>
            </thead>
            <tbody>
              {visitas.map((v) => (
                <tr key={v.ID_Visita}>
                  <td className="text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleGestionar(v.ID_Visita, 'Aprobar')}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        title="Aprobar Visita"
                      >
                        ✔
                      </button>
                      <button
                        onClick={() => handleGestionar(v.ID_Visita, 'Rechazar')}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        title="Rechazar Visita"
                      >
                        ✖
                      </button>
                    </div>
                  </td>
                  <td className="font-bold">{v.Nombre_Visante}</td>
                  <td>{v.RUT_Visitante}</td>
                  <td>{v.Nombre_Anfitrion}</td>
                  <td className="max-w-[150px] truncate" title={v.Motivo_Visita}>
                    {v.Motivo_Visita}
                  </td>
                  <td className="font-mono">{v.Matricula_Visitante || '-'}</td>
                  <td className="text-sm">{formatDate(v.Fecha_Entrada)}</td>
                  <td className="text-sm">{formatDate(v.Fecha_Salida_Estimada)}</td>
                  <td className="text-center">
                    <span className="text-sm font-bold text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full">
                      {v.Nombre_Zona}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
