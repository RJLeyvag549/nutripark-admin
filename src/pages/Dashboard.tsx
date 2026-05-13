import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { ZONES } from '../constants/Zones';
import type { Slot, ZoneRow } from '../constants/Zones';
import { ChevronLeft, ChevronRight, X, User } from 'lucide-react';
import PageLoader from '../components/PageLoader';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));

  // Estado para la información real de los calzos (traída por API y actualizada por Socket)
  const [realSlotsData, setRealSlotsData] = useState<Record<number, any[]>>({});

  const zone = ZONES[currentZoneIndex];

  // Lógica de escalado para que los calzos coincidan con el ancho de la imagen (Sin Scroll Horizontal)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapScale, setMapScale] = useState(1);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapContainerRef.current) {
        const containerWidth = mapContainerRef.current.clientWidth;
        const designWidth = 1400;
        setMapScale(containerWidth / designWidth);
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [zone.id, currentZoneIndex]);

  useEffect(() => {
    // Función para cargar el estado inicial de todos los calzos
    const fetchInitialStatus = async () => {
      if (Object.keys(realSlotsData).length === 0) {
        setLoading(true);
      }
      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/monitoreo-calzos?fecha=${selectedDate}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Convertimos el array de la DB en un objeto agrupado por ID de calzo
          const statusMap: Record<number, any[]> = {};
          data.forEach((item: any) => {
            if (!statusMap[item.ID_Calzo]) statusMap[item.ID_Calzo] = [];
            if (item.ID_Reserva) {
              statusMap[item.ID_Calzo].push(item);
            }
          });

          // Ordenar las reservas de cada calzo por hora de entrada
          Object.keys(statusMap).forEach(key => {
            statusMap[Number(key)].sort((a, b) =>
              new Date(a.Fecha_Entrada).getTime() - new Date(b.Fecha_Entrada).getTime()
            );
          });

          setRealSlotsData(statusMap);
        }
      } catch (error) {
        console.error('Error fetching initial slot status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialStatus();

    // Inicializar conexión Socket.io al backend
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

    newSocket.on('connect', () => {
      console.log('Conectado a Socket.io en el backend');
    });

    // Escuchar el evento de actualización de calzos
    newSocket.on('update_calzos', (update) => {
      console.log('Actualización en tiempo real recibida:', update);
      // Recargar siempre el estado completo para asegurar consistencia 
      // y evitar problemas de estructura de datos con los arrays de reservas
      fetchInitialStatus();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [selectedDate]); // Re-conectar o refrescar si cambia la fecha

  // Helper para obtener el estado real de un calzo
  const getSlotStatus = (slotId: number, defaultStatus: string) => {
    if (defaultStatus === 'label') return 'label';
    if (defaultStatus === 'danger') return 'danger';

    const reservations = realSlotsData[slotId];

    // Si hay reservas, mostramos el estado de reserva/ocupación incluso si el calzo es 'forbidden'
    if (reservations && reservations.length > 0) {
      if (reservations.some(r => r.Estado_Reserva === 'Ocupada')) return 'occupied';
      return 'reserved';
    }

    if (defaultStatus === 'forbidden') return 'forbidden';
    return 'available';
  };

  const handlePrev = () => {
    setCurrentZoneIndex((prev) => (prev === 0 ? ZONES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentZoneIndex((prev) => (prev === ZONES.length - 1 ? 0 : prev + 1));
  };

  const handleSlotClick = (slot: Slot) => {
    if (slot.status === 'label' || slot.status === 'danger') return;
    setSelectedSlot(slot);
  };

  const getSlotColor = (status: Slot['status']) => {
    switch (status) {
      case 'available':
        return 'bg-gray-300 border-gray-400 text-gray-700'; // Desocupado (Gris)
      case 'occupied':
        return 'bg-blue-500 border-blue-600 text-white'; // Ocupado (Azul)
      case 'reserved':
        return 'bg-green-500 border-green-600 text-white'; // Reservado (Verde)
      case 'forbidden':
        return 'bg-gray-800 border-gray-900 text-white'; // Prohibido/Especial (Gris Oscuro)
      case 'label':
        return 'bg-transparent text-gray-800 font-bold border-none shadow-none text-xl lg:text-3xl';
      case 'danger':
        return 'bg-red-600/30 border-red-600/40 text-red-800 font-black text-lg lg:text-xl backdrop-blur-[2px]';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = (status: Slot['status']) => {
    switch (status) {
      case 'available': return 'Desocupado';
      case 'occupied': return 'Ocupado';
      case 'reserved': return 'Reservado';
      case 'forbidden': return 'Uso Especial';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start transition-all duration-700 ease-in-out">
      {loading && <PageLoader message="Sincronizando calzos..." />}

      <div className="flex flex-col space-y-6 relative flex-1 w-full">

        <div
          ref={mapContainerRef}
          className="bg-[var(--bg-card)] rounded-3xl shadow-sm border border-[var(--border-color)] overflow-x-hidden flex-1 p-4"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">

            <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] p-2 px-6 flex items-center space-x-6 min-w-[400px] justify-between shadow-sm">
              <button
                onClick={handlePrev}
                className="p-2 bg-[var(--bg-card)] hover:bg-[var(--bg-main)] text-[var(--text-main)] rounded-xl transition-colors shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="text-center">
                <h2 className="text-xl font-black text-[#1E3A8A] dark:text-blue-400 whitespace-nowrap">{zone.name}</h2>
              </div>

              <button
                onClick={handleNext}
                className="p-2 bg-[var(--bg-card)] hover:bg-[var(--bg-main)] text-[var(--text-main)] rounded-xl transition-colors shadow-sm"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="bg-[#1E3A8A] rounded-2xl shadow-sm p-3 px-6 flex items-center space-x-6 border border-blue-400/20">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Libre</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Ocupado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Reservado</span>
              </div>
            </div>

          </div>

          <div
            className="relative mx-auto w-full"
            style={{
              height: 'max-content',
            }}
          >
            <img
              src={zone.image}
              alt={zone.name}
              className="w-full h-auto rounded-xl pointer-events-none opacity-90 dark:opacity-70 dark:brightness-90 transition-opacity"
            />

            <div
              className="absolute top-0 left-0 w-full h-full"
              style={{
                transform: `scale(${mapScale * (zone.globalScale || 1)}) translate(${zone.offsetX || 0}px, ${zone.offsetY || 0}px)`,
                transformOrigin: 'top left',
                width: '1400px',
                height: '100%'
              }}
            >
              {zone.rows.map((row: ZoneRow) => (
                <div
                  key={row.id}
                  className="absolute"
                  style={{
                    left: `${row.x}%`,
                    top: `${row.y}%`,
                    transform: `rotate(${row.rotation}deg) scale(${row.rowScale})`,
                    transformOrigin: 'top left'
                  }}
                >
                  {row.slots.map((slot: Slot) => {
                    const invRotation = row.textRotation ? row.textRotation : `-${row.rotation}deg`;
                    const currentStatus = getSlotStatus(slot.id, slot.status);

                    return (
                      <div
                        key={slot.id}
                        onClick={() => handleSlotClick({ ...slot, status: currentStatus as any })}
                        className={`absolute flex items-center justify-center border shadow-sm transition-all hover:brightness-110 ${(currentStatus === 'label' || currentStatus === 'danger')
                          ? 'cursor-default'
                          : 'cursor-pointer hover:scale-105'
                          } ${getSlotColor(currentStatus as any)}`}
                        style={{
                          left: `${slot.offsetX}px`,
                          top: `${slot.offsetY}px`,
                          width: `${slot.width}px`,
                          height: `${slot.height}px`,
                          borderRadius: currentStatus === 'label' ? '0px' : '4px'
                        }}
                      >
                        <span
                          className={`font-bold text-sm tracking-tight text-center leading-none ${currentStatus === 'label' ? 'dark:text-blue-300' : ''}`}
                          style={{ transform: `rotate(${invRotation})` }}
                        >
                          {slot.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full xl:w-[420px] bg-[var(--bg-card)] rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col overflow-hidden shrink-0">

        <div className="p-4 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Monitor de Reservas</h4>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  const d = new Date(selectedDate + 'T00:00:00');
                  d.setMonth(d.getMonth() - 1);
                  setSelectedDate(getLocalDateString(d));
                }}
                disabled={(() => {
                  const today = new Date();
                  const current = new Date(selectedDate + 'T00:00:00');
                  return current.getFullYear() <= today.getFullYear() && current.getMonth() <= today.getMonth();
                })()}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-black text-[#1E3A8A] dark:text-blue-400 w-28 text-center uppercase">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => {
                  const d = new Date(selectedDate + 'T00:00:00');
                  d.setMonth(d.getMonth() + 1);
                  setSelectedDate(getLocalDateString(d));
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-2 shadow-sm">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, idx) => (
                <div key={`${d}-${idx}`} className={`text-[10px] font-bold ${idx === 0 ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600'} text-center py-1`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const current = new Date(selectedDate + 'T00:00:00');
                const startOfMonth = new Date(current.getFullYear(), current.getMonth(), 1);
                const endOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0);
                const days = [];

                for (let i = 0; i < startOfMonth.getDay(); i++) {
                  days.push(<div key={`prev-${i}`} className="h-7" />);
                }

                for (let d = 1; d <= endOfMonth.getDate(); d++) {
                  const dateObj = new Date(current.getFullYear(), current.getMonth(), d);
                  const dateStr = getLocalDateString(dateObj);
                  const isSelected = dateStr === selectedDate;
                  const isToday = dateStr === getLocalDateString(new Date());
                  const todayObj = new Date();
                  todayObj.setHours(0, 0, 0, 0);
                  const isPast = dateObj < todayObj;
                  const isSunday = dateObj.getDay() === 0;

                  days.push(
                    <button
                      key={d}
                      onClick={() => setSelectedDate(dateStr)}
                      disabled={isPast}
                      className={`h-7 w-full flex items-center justify-center rounded-lg text-xs font-bold transition-all ${isPast ? 'text-[var(--text-main)] opacity-30 cursor-not-allowed' :
                        isSelected
                          ? 'bg-[#1E3A8A] text-white shadow-sm scale-110'
                          : isToday
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50'
                            : isSunday
                              ? 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10'
                              : 'hover:bg-red-50 dark:hover:bg-gray-800 text-[var(--text-main)]'
                        }`}
                      onMouseEnter={(e) => {
                        if (!isPast) {
                          const isDark = document.documentElement.classList.contains('dark');
                          (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? '#431407' : '#fff7ed';
                        }
                      }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                    >
                      {d}
                    </button>
                  );
                }
                return days;
              })()}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-[var(--bg-main)]">
          {!selectedSlot ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-main)]">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-300 rounded-full flex items-center justify-center mb-4">
                <User size={32} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Ningún calzo seleccionado</h3>
              <p className="text-sm text-[var(--text-muted)]">Haz clic en un calzo del mapa para ver los detalles.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className={`p-5 ${selectedSlot.status === 'occupied' ? 'bg-blue-600' :
                selectedSlot.status === 'reserved' ? 'bg-green-600' :
                  selectedSlot.status === 'forbidden' ? 'bg-gray-800 dark:bg-black' :
                    'bg-gray-200 dark:bg-gray-800'
                }`}>
                <div className="flex justify-between items-start">
                  <h3 className={`text-2xl font-black ${selectedSlot.status === 'available' ? 'text-gray-800 dark:text-white' : 'text-white'}`}>
                    Calzo {selectedSlot.label}
                  </h3>
                  <button
                    onClick={() => setSelectedSlot(null)}
                    className={`p-1 rounded-full ${selectedSlot.status === 'available' ? 'hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300' : 'hover:bg-white/20 text-white'}`}
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className={`mt-1 font-medium text-md ${selectedSlot.status === 'available' ? 'text-gray-600 dark:text-gray-300' : 'text-white/90'}`}>
                  Estado actual: {getStatusText(selectedSlot.status)}
                </p>
              </div>

              <div className="p-5 flex-1 bg-[var(--bg-main)]">
                {selectedSlot.status === 'available' || selectedSlot.status === 'forbidden' ? (
                  <div className="text-center py-10">
                    <p className="text-[var(--text-muted)] text-md">No hay reservas activas para este día.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Lista de Reservas ({realSlotsData[selectedSlot.id]?.length || 0})
                    </h4>

                    <div className="space-y-4">
                      {realSlotsData[selectedSlot.id]?.map((reserva) => (
                        <div key={reserva.ID_Reserva} className={`p-4 rounded-2xl border shadow-sm transition-all ${reserva.Estado_Reserva === 'Ocupada'
                          ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-900/50'
                          : 'bg-[var(--bg-card)] border-[var(--border-color)]'
                          }`}>
                          <div className="flex items-center mb-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 shrink-0 ${reserva.Estado_Reserva === 'Ocupada' ? 'bg-blue-600 text-white' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600'
                              }`}>
                              <User size={20} />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <p className="font-bold text-[var(--text-main)] text-md leading-tight">
                                  {reserva.Nombre_Empleado}
                                </p>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${reserva.Estado_Reserva === 'Ocupada' ? 'bg-blue-600 text-white' : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                  }`}>
                                  {reserva.Estado_Reserva}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--text-muted)]">RUT: {reserva.ID_Empleado}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-1">
                            <div className="bg-[var(--bg-main)] p-2 rounded-lg border border-[var(--border-color)]">
                              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Entrada</p>
                              <p className="text-sm font-black text-[var(--text-main)]">
                                {new Date(reserva.Fecha_Entrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="bg-[var(--bg-main)] p-2 rounded-lg border border-[var(--border-color)]">
                              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Salida Est.</p>
                              <p className="text-sm font-black text-[var(--text-main)]">
                                {new Date(reserva.Fecha_Salida_Estimada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>

                          <p className="text-[10px] text-[var(--text-muted)] mt-2 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mr-1.5"></span>
                            Patente: <span className="font-bold text-[var(--text-main)] ml-1">{reserva.Matricula}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
