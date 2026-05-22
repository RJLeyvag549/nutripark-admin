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

export default function VisitasHistorial() {
  const [loading, setLoading] = useState(true);
  const [visitas, setVisitas] = useState<any[]>([]);

  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableInstance = useRef<any>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    // Inicializar Socket.io para actualizaciones en tiempo real
    const socket = io(API_URL);

    socket.on('visita_actualizada', () => {
      console.log('Evento visita_actualizada recibido. Recargando historial...');
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
      const res = await fetch(`${API_URL}/access/visitas/historial`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVisitas(data);
      }
    } catch (error) {
      console.error('Error fetching historial visitas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && window.DataTable && tableRef.current) {
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy();
      }

      dataTableInstance.current = new window.DataTable('#historialTable', {
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
          zeroRecords: 'No hay visitas registradas'
        },
        pageLength: 10,
        order: [[6, 'desc']], // Ordenar por fecha de entrada descendente
        columnDefs: [
           { className: "dt-center", targets: [0, 1, 9] } 
        ]
      });
    }
  }, [loading, visitas]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-CL');
  };

  const getGestionBadge = (status: string) => {
    if (status === 'Cancelada') return <span className="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Cancelada</span>;
    if (status === 'Rechazada') return <span className="bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Rechazada</span>;
    return <span className="bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Aprobada</span>;
  };

  const getOperativoBadge = (status: string) => {
    switch (status) {
      case 'Esperando':
      case 'Aprobada': // Fallback por si acaso
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black uppercase">Pendiente Llegada</span>;
      case 'En Planta':
        return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-black uppercase">En Planta</span>;
      case 'Finalizada':
        return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-black uppercase">Finalizada</span>;
      case 'Cancelada':
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black uppercase">Cancelada</span>;
      default:
        return <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-black uppercase">{status}</span>;
    }
  };

  return (
    <div className="page-content text-[var(--text-main)] employees-page">
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

      <div className="page-header">
        <div>
          <h1 className="page-title normal-case sm:uppercase">Seguimiento de Visitas</h1>
          <p className="page-subtitle normal-case tracking-normal sm:tracking-widest">Control operativo de visitas aprobadas</p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] p-4 md:p-6 rounded-3xl border border-[var(--border-color)] shadow-2xl overflow-hidden">
        {loading ? (
          <div className="py-20">
            <PageLoader message="Cargando seguimiento de visitas..." />
          </div>
        ) : (
          <div className="table-responsive">
            <table id="historialTable" ref={tableRef} className="display row-border stripe w-full">
            <thead>
              <tr>
                <th className="text-center">Gestión</th>
                <th className="text-center">Estado Visita</th>
                <th>Visitante</th>
                <th>RUT</th>
                <th>Anfitrión</th>
                <th>Motivo</th>
                <th>Matrícula</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th className="text-center">Zona</th>
              </tr>
            </thead>
            <tbody>
              {visitas.map((v) => (
                <tr key={v.ID_Visita}>
                  <td className="text-center">
                    {getGestionBadge(v.Estado_Visita)}
                  </td>
                  <td className="text-center">
                    {getOperativoBadge(v.Estado_Operativo)}
                  </td>
                  <td className="font-bold">{v.Nombre_Visante}</td>
                  <td>{v.RUT_Visitante}</td>
                  <td>{v.Nombre_Anfitrion}</td>
                  <td className="max-w-[150px] truncate" title={v.Motivo_Visita}>
                    {v.Motivo_Visita}
                  </td>
                  <td className="font-mono">{v.Matricula_Visitante || '-'}</td>
                  <td className="text-sm">{formatDate(v.Fecha_Entrada)}</td>
                  <td className="text-sm">
                    {formatDate(v.Fecha_Salida_Estimada)}
                  </td>
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
