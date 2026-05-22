import { useState, useEffect, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import { io } from 'socket.io-client';
import { X, MapPin, ChevronRight, ChevronLeft, Check, AlertCircle, Calendar } from 'lucide-react';
import { ZONES } from '../constants/Zones';
import type { Slot } from '../constants/Zones';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ZONE_TWEAKS: Record<number, any> = {
  // ─── SECTOR PONIENTE ──────────────────────────────────────────────────
  2: {
    squish: 0.55, globalX: 24, globalY: 0, scale: 1.0,
    rows: {
      'pon-top': { size: 1.2, spacing: 1.19, xOffset: 6.5, yOffset: 0 },
      'pon-bottom': { size: 1.2, spacing: 1.19, xOffset: 6.5, yOffset: 1 },
      'columna-marquesina': { size: 1.2, spacing: 1.2, xOffset: 0.9, yOffset: 0 }
    }
  },

  // ─── PORTERÍA PONIENTE ────────────────────────────────────────────────
  3: {
    squish: 0.55, globalX: 0, globalY: 0, scale: 1.1,
    rows: {
      'pp-top': { size: 1.05, spacing: 1.1, xOffset: 8, yOffset: -5 },
      'pp-mid': { size: 1.05, spacing: 1.1, xOffset: 7.5, yOffset: -3 },
      'pp-bottom': { size: 1.05, spacing: 1.09, xOffset: 1, yOffset: -3 }
    }
  },

  // ─── ZONA ORIENTE ─────────────────────────────────────────────────────
  4: {
    squish: 0, globalX: 10, globalY: 0, scale: 1.13,
    rows: {
      'ori-row-1': { size: 1.05, spacing: 1.06, xOffset: 1.8, yOffset: 0 },
      'ori-row-bottom': { size: 1.05, spacing: 1.06, xOffset: 1.8, yOffset: -4 },
      'ori-row-left-vertical': { size: 1.1, spacing: 1.08, xOffset: -1, yOffset: -8 },
      'ori-row-lower-1': { size: 1.09, spacing: 1.08, xOffset: 0., yOffset: -11 },
      'ori-row-lower-2': { size: 1.08, spacing: 1.07, xOffset: 0, yOffset: -16 },
      'ori-pool-right': { size: 1.1, spacing: 1.04, xOffset: 4.3, yOffset: -2.6 }
    }
  },

  // ─── SUR-ORIENTE ──────────────────────────────────────────────────────
  5: {
    squish: 0.55, globalX: 0, globalY: 0, scale: 1.1,
    rows: {
      'sur-ori-row-1': { size: 1.08, spacing: 1.1, xOffset: 4.5, yOffset: -2 }
    }
  },

  // ─── MANTENCIÓN ───────────────────────────────────────────────────────
  6: {
    squish: 0, globalX: 0, globalY: 0, scale: 1.0,
    rows: {
      'man-row-1': { size: 1.2, spacing: 1.2, xOffset: 17.5, yOffset: 1.8 }
    }
  },

  // ─── PLAYA ────────────────────────────────────────────────────────────
  7: {
    squish: 0.55, globalX: 10, globalY: 0, scale: 1.0,
    rows: {
      'playa-left': { size: 1.22, spacing: 1.21, xOffset: 11, yOffset: 0.5 },
      'playa-right': { size: 1.22, spacing: 1.2, xOffset: 1.5, yOffset: 0 }
    }
  },

  // ─── FISHERMAN ────────────────────────────────────────────────────────
  8: {
    squish: 0.55, globalX: 90, globalY: 0, scale: 1.0,
    rows: {
      'fisherman-col-1': { size: 1.14, spacing: 1.19, xOffset: 4, yOffset: 0.5 },
      'fisherman-loose': { size: 1.14, spacing: 1.0, xOffset: 1, yOffset: 0.5 }
    }
  }
};

export default function ListaEspera() {
  const [loading, setLoading] = useState(true);
  const [waitlist, setWaitlist] = useState<any[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1: Zone List, 2: Map Selection
  const [selectedWaitlist, setSelectedWaitlist] = useState<any>(null);
  const [zoneAvailability, setZoneAvailability] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [occupancy, setOccupancy] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mapScale, setMapScale] = useState(1);

  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableInstance = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load DataTables
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
      if (dataTableInstance.current) dataTableInstance.current.destroy(true);
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
      const res = await fetch(`${API_URL}/access/lista-espera`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWaitlist(data);
      }
    } catch (error) {
      console.error('Error fetching waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const socket = io(API_URL);
    socket.on('update_waitlist', fetchData);
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (!loading && (window as any).DataTable && tableRef.current) {
      if (dataTableInstance.current) dataTableInstance.current.destroy();
      dataTableInstance.current = new (window as any).DataTable('#waitlistTable', {
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_',
          info: 'Mostrando _START_ a _END_ de _TOTAL_',
          infoEmpty: 'Sin registros',
          paginate: { next: '>', previous: '<' },
          zeroRecords: 'No hay usuarios en espera'
        },
        pageLength: 10,
        order: [[1, 'asc']], // Order by position
        columnDefs: [{ orderable: false, targets: [0] }]
      });
    }
  }, [loading, waitlist]);

  // Scale map
  useEffect(() => {
    if (modalStep === 2 && containerRef.current) {
      const updateScale = () => {
        if (containerRef.current) {
          setMapScale(containerRef.current.offsetWidth / 1400);
        }
      };
      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
  }, [modalStep, selectedZone]);

  const handleOpenAssign = async (item: any) => {
    setSelectedWaitlist(item);
    setModalStep(1);
    setSelectedZone(null);
    setSelectedSlot(null);
    setErrorMsg('');
    setShowModal(true);

    // Fetch zone availability summary
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/access/lista-espera/disponibilidad?inicio=${item.fechaInicio}&fin=${item.fechaFin}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        let data = await res.json();

        // Identificar específicamente Sector Poniente y Bajo Marquesina
        const toMerge = data.filter((z: any) => {
          const name = z.nombreZona.toLowerCase();
          return name === 'sector poniente' || name === 'bajo marquesina';
        });

        if (toMerge.length > 0) {
          // Crear la zona consolidada
          const consolidated = {
            idZona: toMerge[0].idZona, // Usamos el ID de la primera como base
            nombreZona: 'Sector Poniente',
            disponibles: toMerge.reduce((acc: number, z: any) => acc + z.disponibles, 0),
            total: toMerge.reduce((acc: number, z: any) => acc + z.total, 0),
            idsUnificados: toMerge.map((z: any) => z.idZona)
          };

          // Limpiar TODOS los originales y añadir el consolidado
          data = data.filter((z: any) =>
            z.nombreZona.toLowerCase() !== 'sector poniente' &&
            z.nombreZona.toLowerCase() !== 'bajo marquesina'
          );
          data.push(consolidated);
        }

        // Re-ordenar por disponibilidad tras la unificación
        data.sort((a: any, b: any) => b.disponibles - a.disponibles);

        setZoneAvailability(data);
      }
    } catch (err) {
      console.error('Error fetching zone availability:', err);
    }
  };

  const handleSelectZone = async (avail: any) => {
    const zoneDef = ZONES.find(z => z.dbId === avail.idZona);
    if (!zoneDef) {
      setErrorMsg('Esta zona no tiene mapa configurado.');
      return;
    }

    setSelectedZone({ ...zoneDef, availableCount: avail.disponibles });
    setModalStep(2);

    // Fetch detailed occupancy for the map
    try {
      const token = localStorage.getItem('admin_token');
      // Usamos el monitoreo actual para ver el estado de los calzos
      const fechaStr = selectedWaitlist.fechaInicio.split('T')[0];
      const res = await fetch(`${API_URL}/admin/monitoreo-calzos?fecha=${fechaStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const idsToFetch = avail.idsUnificados || [avail.idZona];
        setOccupancy(data.filter((o: any) => idsToFetch.includes(o.ID_Zona)));
      }
    } catch (err) {
      console.error('Error fetching occupancy:', err);
    }
  };

  const handleConfirmAssign = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/access/lista-espera/asignar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          idEspera: selectedWaitlist.idEspera,
          idCalzo: selectedSlot.id
        })
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.message || 'Error al asignar.');
      }
    } catch (error) {
      setErrorMsg('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="page-content text-[var(--text-main)] employees-page">
      <style>{`
        .employees-page .dt-container { color: var(--text-main) !important; font-family: 'Inter', sans-serif; }
        table.dataTable { background-color: var(--bg-card) !important; border-radius: 20px; overflow: hidden; border: 1px solid var(--border-color) !important; margin-top: 20px !important; }
        table.dataTable thead th { background-color: var(--bg-main) !important; color: #ff7700 !important; border-bottom: 2px solid #ff7700 !important; padding: 15px !important; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; font-weight: 900; }
        table.dataTable tbody td { background-color: transparent !important; color: var(--text-main) !important; border-bottom: 1px solid var(--border-color) !important; padding: 12px 15px !important; font-size: 0.9rem; }
        .dt-search input { background-color: var(--bg-main) !important; border: 1px solid var(--border-color) !important; color: var(--text-main) !important; border-radius: 12px !important; padding: 8px 16px !important; outline: none; margin-bottom: 10px; }
        .dt-paging-button { color: var(--text-main) !important; border: none !important; background: transparent !important; font-weight: bold !important; cursor: pointer; }
        .dt-paging-button.current { color: #ff7700 !important; text-decoration: underline; }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Lista de Espera</h1>
          <p className="page-subtitle">Gestión administrativa y asignación excepcional de cupos</p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] p-4 sm:p-6 rounded-[35px] border border-[var(--border-color)] shadow-2xl overflow-hidden">
        {loading ? (
          <div className="py-20">
            <PageLoader message="Sincronizando con el servidor..." />
          </div>
        ) : (
          <div className="table-responsive">
          <table id="waitlistTable" ref={tableRef} className="display row-border stripe w-full">
            <thead>
              <tr>
                <th className="text-center">Acción</th>
                <th className="text-center">Pos.</th>
                <th>Empleado</th>
                <th>Zona Origen</th>
                <th>RUT</th>
                <th>Inicio</th>
                <th>Salida</th>
              </tr>
            </thead>
            <tbody>
              {waitlist.map((item) => (
                <tr key={item.idEspera} className="hover:bg-orange-500/5 transition-colors">
                  <td className="text-center">
                    <button
                      onClick={() => handleOpenAssign(item)}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20"
                    >
                      ASIGNAR
                    </button>
                  </td>
                  <td className="text-center font-black text-orange-500">#{item.posicion}</td>
                  <td className="font-bold">{item.nombreEmpleado}</td>
                  <td>
                    <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-blue-500/20">
                      {item.nombreZona}
                    </span>
                  </td>
                  <td className="text-[11px] font-mono opacity-60">{item.rutEmpleado}</td>
                  <td className="text-[11px]">{formatDate(item.fechaInicio)}</td>
                  <td className="text-[11px]">{formatDate(item.fechaFin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* MULTI-STEP ASSIGNMENT MODAL */}
      {showModal && selectedWaitlist && (
        <div className="fixed inset-0 z-[5000] flex items-start justify-center p-4 py-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[40px] shadow-2xl overflow-hidden transition-all duration-300 flex flex-col my-auto ${modalStep === 1 ? 'w-full max-w-4xl' : 'w-full max-w-5xl'}`}>

            {/* Header */}
            <div className="p-5 sm:p-8 border-b border-[var(--border-color)] flex items-center bg-[var(--bg-main)]/50 relative">
              {/* Back Button (Step 2) */}
              {modalStep === 2 && (
                <button
                  onClick={() => { setModalStep(1); setSelectedSlot(null); }}
                  className="absolute left-8 p-3 hover:bg-white/5 rounded-full transition-colors text-[var(--text-muted)] flex items-center gap-2 group"
                >
                  <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Volver</span>
                </button>
              )}

              <div className="flex-1 flex flex-col items-center text-center">
                <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tighter italic px-10 sm:px-0">
                  {modalStep === 1 ? 'Seleccionar Zona' : `Zona: ${selectedZone?.name}`}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <div className="p-1.5 bg-orange-500 rounded-lg text-white shadow-lg shadow-orange-500/20"><Calendar size={14} /></div>
                  <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Asignando a: <span className="text-orange-500">{selectedWaitlist.nombreEmpleado}</span>
                  </p>
                </div>
              </div>

              <button onClick={() => setShowModal(false)} className="absolute right-8 p-3 hover:bg-white/5 rounded-full transition-colors text-[var(--text-muted)]">
                <X size={24} />
              </button>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {errorMsg && (
                <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl mb-6 text-xs font-black border border-red-500/20 flex items-center gap-3 animate-pulse">
                  <AlertCircle size={18} /> {errorMsg}
                </div>
              )}

              {modalStep === 1 ? (
                <div className="grid grid-cols-1 gap-4">
                  <p className="text-sm font-bold text-[var(--text-muted)] mb-2 uppercase tracking-tight">Capacidad disponible según horario solicitado:</p>
                  <div className="space-y-3">
                    {zoneAvailability
                      .filter(avail => !avail.nombreZona.toLowerCase().includes('exteriores'))
                      .map((avail) => {
                        const isOriginal = avail.nombreZona === selectedWaitlist.nombreZona;
                        return (
                          <button
                            key={avail.idZona}
                            onClick={() => handleSelectZone(avail)}
                            className={`w-full group p-4 rounded-3xl border transition-all hover:scale-[1.01] active:scale-98 ${isOriginal ? 'bg-orange-500/5 border-orange-500/30 ring-1 ring-orange-500/20 shadow-lg shadow-orange-500/5' : 'bg-[var(--bg-main)] border-[var(--border-color)] hover:border-orange-500/50 shadow-sm'}`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 w-full min-w-0">
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className={`p-2.5 rounded-2xl shrink-0 ${isOriginal ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-orange-500 group-hover:text-white transition-colors'}`}>
                                  <MapPin size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-black text-base sm:text-lg uppercase tracking-tighter text-left truncate">{avail.nombreZona}</p>
                                  <span className={`inline-block mt-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isOriginal ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'bg-slate-500/10 text-[var(--text-muted)] opacity-60'}`}>
                                    {isOriginal ? 'Solicitada Originalmente' : 'Zona Alternativa'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                                <div className="text-right">
                                  <p className={`text-2xl font-black ${avail.disponibles > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {avail.disponibles}
                                  </p>
                                  <p className="text-[9px] font-black opacity-40 uppercase">Libres</p>
                                </div>
                                <ChevronRight className="text-[var(--text-muted)] group-hover:text-orange-500 transition-colors shrink-0" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full relative">
                  {/* Nomenclature - Dashboard Style */}
                  <div className="bg-[var(--bg-main)]/80 p-4 rounded-3xl border border-[var(--border-color)] mb-6 flex flex-wrap gap-6 items-center justify-center backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-slate-500/40 border border-white/20"></div>
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Disponible</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#22c55e] border-2 border-white/20"></div>
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Reservado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#ef4444] border-2 border-white/20"></div>
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Prohibido / Visita</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#ff7700] border-2 border-white/20 shadow-lg shadow-orange-500/50"></div>
                      <span className="text-[10px] font-black uppercase text-[#ff7700]">Mi Selección</span>
                    </div>
                  </div>

                  <div className="relative flex-1 rounded-[30px] overflow-hidden border border-[var(--border-color)] bg-slate-950/50 group">
                    <div ref={containerRef} className="relative mx-auto w-full" style={{ height: 'max-content' }}>
                      <img src={selectedZone.image} className="block w-full h-auto opacity-40" alt={selectedZone.name} />
                      <div
                        className="absolute top-0 left-0 w-full"
                        style={{
                          transform: `scale(${mapScale * (selectedZone.globalScale || 1) * (ZONE_TWEAKS[selectedZone.dbId]?.scale || 1)}) translate(${(selectedZone.offsetX || 0) + (ZONE_TWEAKS[selectedZone.dbId]?.globalX || 0)}px, ${(selectedZone.offsetY || 0) + (ZONE_TWEAKS[selectedZone.dbId]?.globalY || 0)}px)`,
                          transformOrigin: 'top left',
                          width: '1400px',
                          height: `${mapScale > 0 ? ((ZONE_TWEAKS[selectedZone.dbId]?.squish || 0.55) / mapScale) * 100 : 100}%`
                        }}
                      >
                        {selectedZone.rows.map((row: any) => {
                          const tweaks = ZONE_TWEAKS[selectedZone.dbId]?.rows?.[row.id] || { size: 1.0, spacing: 1.0, xOffset: 0, yOffset: 0 };
                          return (
                            <div key={row.id} className="absolute" style={{ left: `${row.x + (tweaks.xOffset || 0)}%`, top: `${row.y + (tweaks.yOffset || 0)}%`, transform: `rotate(${row.rotation}deg) scale(${row.rowScale})`, transformOrigin: 'top left' }}>
                              {row.slots.map((slot: any, slotIndex: number) => {
                                const occ = occupancy.find(o => o.ID_Calzo === slot.id);
                                const isOccupied = !!occ?.ID_Reserva || occ?.Is_Fixed === 1;
                                const isForbidden = slot.status === 'forbidden' || slot.status === 'danger';
                                const isSelected = selectedSlot?.id === slot.id;

                                let bgColor = 'rgba(156, 163, 175, 0.4)'; // Gray (Disponible)
                                if (isSelected) bgColor = '#ff7700'; // Orange (Seleccionado)
                                else if (isOccupied) bgColor = '#22c55e'; // Green (Reservado)
                                else if (isForbidden) bgColor = '#ef4444'; // Red (Prohibido)

                                if (slot.status === 'label') bgColor = 'transparent';

                                return (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => !isOccupied && !isForbidden && slot.status !== 'label' && setSelectedSlot(slot)}
                                    disabled={isOccupied || isForbidden || slot.status === 'label'}
                                    className={`absolute flex items-center justify-center transition-all ${isSelected ? 'z-50 scale-125 shadow-2xl' : 'z-10'} ${isOccupied || isForbidden ? 'cursor-not-allowed opacity-60' : 'hover:scale-110'}`}
                                    style={{
                                      left: `${(slot.offsetX !== undefined ? slot.offsetX : (slotIndex * ((slot.width || row.slotWidth || 40) + (row.gap !== undefined ? row.gap : 5)))) * (tweaks.spacing || 1)}px`,
                                      top: `${(slot.offsetY !== undefined ? slot.offsetY : 0) + (tweaks.yOffset || 0)}px`,
                                      width: `${(slot.width || row.slotWidth || 40) * (tweaks.size || 1)}px`,
                                      height: `${(slot.height || row.slotHeight || 70) * (tweaks.size || 1)}px`,
                                      backgroundColor: bgColor,
                                      border: isSelected ? '2px solid white' : (slot.status === 'label' ? 'none' : '1px solid rgba(255,255,255,0.2)'),
                                      borderRadius: '4px'
                                    }}
                                  >
                                    <span className="text-[10px] font-black text-white pointer-events-none drop-shadow-md" style={{ transform: `rotate(${row.textRotation ? row.textRotation : `-${row.rotation}deg`})` }}>
                                      {slot.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-main)]/50 flex justify-between items-center">
              {modalStep === 2 ? (
                <button
                  onClick={() => { setModalStep(1); setSelectedSlot(null); }}
                  className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <ChevronLeft size={18} /> Volver a Zonas
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                {modalStep === 2 && (
                  <button
                    onClick={handleConfirmAssign}
                    disabled={!selectedSlot || submitting}
                    className="px-10 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 transition-all flex items-center gap-2"
                  >
                    {submitting ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <Check size={18} />
                    )}
                    ASIGNAR CALZO {selectedSlot?.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
