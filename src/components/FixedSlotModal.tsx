import { useState, useEffect, useRef } from 'react';
import { X, Calendar, Check, AlertCircle } from 'lucide-react';
import { ZONES } from '../constants/Zones';
import type { Slot } from '../constants/Zones';

interface FixedSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    id: number;
    nombre: string;
    idZona?: number;
    discapacidad: boolean;
  } | null;
  onConfirm: (data: any) => Promise<any>;
}

interface OccupancyData {
  ID_Calzo: number;
  Nombre_Empleado?: string;
  Is_Fixed?: number;
  Nombre_Fijo?: string;
  Estado_Reserva?: string;
}



// DICCIONARIO DE CALIBRACIÓN MANUAL POR ZONA Y FILA (COLUMNA)
// Puedes ajustar individualmente el tamaño y espaciado de cada matriz.
const ZONE_TWEAKS: Record<number, any> = {
  2: { // Zona Poniente
    squish: 0.55,           // Compresión vertical de la zona
    globalX: 24,            // Mueve TODA la zona a la derecha (px)
    globalY: 0,             // Mueve TODA la zona hacia abajo (px)
    rows: {
      'pon-top': { size: 1.06, spacing: 1.03, xOffset: 0, yOffset: 0 },
      'pon-bottom': { size: 1.06, spacing: 1.03, xOffset: 0, yOffset: 1 },
      'columna-marquesina': { size: 1.03, spacing: 1.04, xOffset: -1.2, yOffset: 0 }
    }
  },
  3: { // Portería Poniente
    squish: 0.55, globalX: 0, globalY: 0,
    rows: {
      'pp-top': { size: 1.05, spacing: 1.04, xOffset: 4, yOffset: 0 },
      'pp-mid': { size: 1.05, spacing: 1.04, xOffset: 4, yOffset: 0 },
      'pp-bottom': { size: 1.05, spacing: 1.04, xOffset: 1, yOffset: 0 }
    }
  },
  4: { // Zona Oriente
    squish: 0.55, globalX: 0, globalY: 0,
    rows: {
      'ori-row-1': { size: 1.05, spacing: 1.04, xOffset: 1.8, yOffset: 0 },
      'ori-row-bottom': { size: 1.05, spacing: 1.04, xOffset: 1.8, yOffset: 0 },
      'ori-row-left-vertical': { size: 1.055, spacing: 1.045, xOffset: 1, yOffset: 0 },
      'ori-row-lower-1': { size: 1.05, spacing: 1.04, xOffset: 1, yOffset: 0 },
      'ori-row-lower-2': { size: 1.05, spacing: 1.04, xOffset: 1, yOffset: 0 },
      'ori-pool-right': { size: 1.1, spacing: 1.08, xOffset: 2.3, yOffset: 0 }
    }
  },
  5: { // Sur-Oriente
    squish: 0.55, globalX: 0, globalY: 0,
    rows: {
      'sur-ori-row-1': { size: 1.06, spacing: 1.05, xOffset: 2.5, yOffset: 0 }
    }
  },
  6: { // Mantención
    squish: 0, globalX: 0, globalY: 0,
    rows: {
      'man-row-1': { size: 1.1, spacing: 1.04, xOffset: 4, yOffset: 2 }
    }
  },
  7: { // Playa
    squish: 0.55, globalX: 10, globalY: 0,
    rows: {
      'playa-left': { size: 1.05, spacing: 1.04, xOffset: 2, yOffset: 1 },
      'playa-right': { size: 1.1, spacing: 1.05, xOffset: -0.5, yOffset: 0 }
    }
  },
  8: { // Fisherman
    squish: 0.55, globalX: 24, globalY: 0,
    rows: {
      'fisherman-col-1': { size: 1.05, spacing: 1.04, xOffset: 0.5, yOffset: 0 },
      'fisherman-loose': { size: 1.05, spacing: 1.0, xOffset: 0.2, yOffset: 0.5 }
    }
  }
};

export default function FixedSlotModal({ isOpen, onClose, employee, onConfirm }: FixedSlotModalProps) {

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [occupancy, setOccupancy] = useState<OccupancyData[]>([]);
  const [isFetchingOccupancy, setIsFetchingOccupancy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapScale, setMapScale] = useState(1);

  // Encontrar la zona del empleado
  const zone = ZONES.find(z => z.dbId === employee?.idZona) || ZONES[0];
  const tweaks = ZONE_TWEAKS[zone.dbId] || { squish: 0.55, globalX: 0, globalY: 0, rows: {} };

  useEffect(() => {
    if (isOpen) {
      setSelectedSlot(null);
      fetchOccupancy();
    }
  }, [isOpen, employee?.idZona]);

  // Calcular la escala real basándonos en el ancho del contenedor respecto a 1000px (ancho base de diseño)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updateScale = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          setMapScale(width / 1400); // Se ajusta a 1400px como en el Dashboard
        }
      };

      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
  }, [isOpen, isFetchingOccupancy]);

  const fetchOccupancy = async () => {
    setIsFetchingOccupancy(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const token = localStorage.getItem('admin_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/admin/monitoreo-calzos?fecha=${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const contentType = response.headers.get("content-type");
      if (response.ok && contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        setOccupancy(data);
      } else {
        console.warn('API returned non-JSON response or error:', response.status);
      }
    } catch (error) {
      console.error('Error fetching occupancy:', error);
    } finally {
      setIsFetchingOccupancy(false);
    }
  };

  if (!isOpen || !employee) return null;

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    try {
      await onConfirm({
        idCalzo: selectedSlot.id,
        entryTime: '00:00',
        exitTime: '23:59',
        workDays: 7,
        restDays: 0,
        currentDayOfShift: 1,
        omitConflicts: true
      });
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Error al generar las reservas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/90 backdrop-blur-md relative z-20">
          <div>
            <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-xl">
                <Calendar className="text-orange-500" size={20} />
              </div>
              Asignación de Calzo Fijo
            </h2>
            <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1">
              Empleado: {employee.nombre}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto relative flex flex-col dark:bg-slate-900/50 bg-transparent">
          <div className="p-6 pb-2 space-y-4 relative z-10 bg-gradient-to-b from-[var(--bg-card)] via-[var(--bg-card)]/80 to-transparent">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-[25px] flex flex-col gap-3 backdrop-blur-sm shadow-sm">
              <div className="flex gap-2 items-center">
                <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-500">
                  <AlertCircle size={16} />
                </div>
                <h4 className="font-black text-[var(--text-main)] uppercase text-[10px]">Nomenclatura de Calzos</h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(156, 163, 175, 0.4)', border: '1px solid rgba(255,255,255,0.4)' }}></div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ff7700', border: '2px solid white' }}></div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Seleccionado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)', border: '1px solid rgba(255,255,255,0.4)' }}></div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Asignado (Fijo)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(234, 179, 8, 0.8)', border: '1px solid rgba(255,255,255,0.4)' }}></div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Reserva Diaria</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.4)' }}></div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">No Disponible</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight drop-shadow-sm dark:drop-shadow-md">Mapa: {zone.name}</h3>
              {selectedSlot && (
                <div className="bg-orange-500 text-white px-3 py-1 rounded-lg font-black text-[11px] animate-in slide-in-from-right shadow-lg">
                  CALZO {selectedSlot.label}
                </div>
              )}
            </div>
          </div>

          <div className="relative w-full flex-1 flex flex-col items-center justify-start">
            {isFetchingOccupancy ? (
              <div className="flex flex-col items-center justify-center gap-2 mt-20">
                <div className="animate-spin h-8 w-8 border-3 border-orange-500 border-t-transparent rounded-full"></div>
                <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Cargando estado...</p>
              </div>
            ) : (
              <div
                ref={containerRef}
                className="relative mx-auto w-full"
                style={{ height: 'max-content' }}
              >
                <img
                  src={zone.image}
                  className="block w-full h-auto opacity-90 dark:opacity-70 dark:brightness-90 transition-opacity"
                  alt={zone.name}
                />
                <div
                  className="absolute top-0 left-0 w-full h-full"
                  style={{
                    transform: `scale(${mapScale * (zone.globalScale || 1)}) translate(${(zone.offsetX || 0) + (tweaks.globalX || 0)}px, ${(zone.offsetY || 0) + (tweaks.globalY || 0)}px)`,
                    transformOrigin: 'top left',
                    width: '1400px',
                    height: `${mapScale > 0 ? ((tweaks.squish || 0.55) / mapScale) * 100 : 100}%`
                  }}
                >
                  {zone.rows.map(row => {
                    const rowTweaks = tweaks.rows?.[row.id] || { size: 1.0, spacing: 1.0, xOffset: 0, yOffset: 0 };
                    return (
                      <div
                        key={row.id}
                        className="absolute"
                        style={{
                          left: `${row.x + (rowTweaks.xOffset || 0)}%`,
                          top: `${row.y + (rowTweaks.yOffset || 0)}%`,
                          transform: `rotate(${row.rotation}deg) scale(${row.rowScale})`,
                          transformOrigin: 'top left'
                        }}
                      >
                        {row.slots.map(slot => {
                          const invRotation = row.textRotation ? row.textRotation : `-${row.rotation}deg`;
                          const occ = occupancy.find(o => o.ID_Calzo === slot.id);
                          const isFixed = occ?.Is_Fixed === 1;
                          const isTempReserved = !!occ?.Estado_Reserva && !isFixed;
                          const isForbidden = slot.status === 'forbidden' || isFixed;
                          const isSelected = selectedSlot?.id === slot.id;

                          let bgColor = 'rgba(156, 163, 175, 0.4)';
                          if (isSelected) bgColor = '#ff7700';
                          else if (isFixed) bgColor = 'rgba(239, 68, 68, 0.9)';
                          else if (isTempReserved) bgColor = 'rgba(234, 179, 8, 0.8)';
                          else if (slot.status === 'forbidden') bgColor = 'rgba(0,0,0,0.6)';
                          else if (slot.status === 'danger') bgColor = 'rgba(220, 38, 38, 0.3)';
                          else if (slot.status === 'label') bgColor = 'transparent';

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => !isForbidden && slot.status !== 'label' && slot.status !== 'danger' && setSelectedSlot(slot)}
                              disabled={isForbidden || slot.status === 'label' || slot.status === 'danger'}
                              className={`absolute flex items-center justify-center transition-all hover:scale-105 ${isSelected ? 'ring-4 ring-orange-500 ring-offset-2 z-50 shadow-2xl' : 'shadow-md'
                                } ${isTempReserved ? 'animate-pulse' : ''}`}
                              style={{
                                left: `${slot.offsetX * (rowTweaks.spacing || 1)}px`,
                                top: `${slot.offsetY}px`,
                                width: `${slot.width * (rowTweaks.size || 1)}px`,
                                height: `${slot.height * (rowTweaks.size || 1)}px`,
                                backgroundColor: bgColor,
                                border: isSelected ? '3px solid white' : (slot.status === 'label' ? 'none' : '1px solid rgba(255,255,255,0.4)'),
                                borderRadius: slot.status === 'label' ? '0px' : '4px',
                                cursor: (isForbidden || slot.status === 'label' || slot.status === 'danger') ? 'default' : 'pointer',
                                zIndex: isSelected ? 10 : 1
                              }}
                              title={isFixed ? `Calzo Fijo de ${occ.Nombre_Fijo}` : `Calzo ${slot.label}`}
                            >
                              <span
                                className="text-[11px] font-black pointer-events-none drop-shadow-md"
                                style={{
                                  color: slot.status === 'label' ? 'rgba(255,255,255,0.8)' : 'white',
                                  transform: `rotate(${invRotation})`
                                }}
                              >
                                {slot.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/90 to-transparent flex justify-between items-end z-20 pointer-events-none">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 shadow-xl border border-white/10 transition-colors uppercase tracking-widest text-[10px] pointer-events-auto"
          >
            CANCELAR
          </button>

          <button
            onClick={handleConfirm}
            disabled={!selectedSlot || loading}
            className="px-10 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-gray-500 disabled:opacity-50 text-white font-black shadow-xl shadow-orange-900/40 transition-all flex items-center gap-2 text-xs pointer-events-auto"
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Check size={16} />
            )}
            ASIGNAR CALZO FIJO
          </button>
        </div>

      </div>
    </div>
  );
}
