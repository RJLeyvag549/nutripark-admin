import { useState, useEffect, useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import {
  Download, FileText, BarChart2, PieChart, Activity, Users, AlertTriangle,
  Calendar, Clock, CheckCircle2, Shield, Search, ChevronLeft, ChevronRight,
  Award, UserX, AlertCircle, Unlock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ZONES } from '../constants/Zones';

const tabs = [
  { id: 'auditoria', name: 'Auditoría', icon: Shield },
  { id: 'ocupacion', name: 'Ocupación', icon: BarChart2 },
  { id: 'espera', name: 'Lista de Espera', icon: Users },
  { id: 'visitas', name: 'Visitas', icon: CheckCircle2 },
  { id: 'conducta', name: 'Conducta', icon: Search },
];

export default function Reportes() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('reportesActiveTab') || 'ocupacion';
  });

  useEffect(() => {
    localStorage.setItem('reportesActiveTab', activeTab);
  }, [activeTab]);

  // Custom picker state
  const [showPicker, setShowPicker] = useState(false);
  const monthsList = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Selector de mes, por defecto el mes actual
  const today = new Date();
  const currentMonthString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthString);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());

  const [auditoriaData, setAuditoriaData] = useState<any[]>([]);
  const [ocupacionData, setOcupacionData] = useState<any>({
    kpis: { tasaOcupacionPromedio: '0%', zonaMayorUso: 'N/A', tiempoUsoPromedio: '0 hrs' },
    ocupacionPorZona: {},
    ocupacionHoraPunta: [],
    historialUsoReal: []
  });
  
  const [listaesperaData, setListaesperaData] = useState<any>({
    kpis: { totalInscripciones: 0, tasaAsignacionGlobal: '0%', tasaAbandonoManual: '0%', tasaAbandonoSistema: '0%' },
    desgloseZonas: [],
    historial: []
  });
  const [waitlistSearch, setWaitlistSearch] = useState('');
  const [waitlistFilterEstado, setWaitlistFilterEstado] = useState('todos');
  const [waitlistPage, setWaitlistPage] = useState(1);

  // Estados para Auditoría
  const [auditoriaSearch, setAuditoriaSearch] = useState('');
  const [auditoriaFilterAccion, setAuditoriaFilterAccion] = useState('todos');
  const [auditoriaPage, setAuditoriaPage] = useState(1);

  // Estados para Ocupación
  const [ocupacionSearch, setOcupacionSearch] = useState('');
  const [ocupacionFilterZona, setOcupacionFilterZona] = useState('todos');
  const [ocupacionPage, setOcupacionPage] = useState(1);

  // Estados para Visitas
  const [visitasData, setVisitasData] = useState<any>({
    kpis: {
      totalVisitas: 0,
      visitasAprobadas: 0,
      visitasRechazadas: 0,
      visitasPendientes: 0,
      tasaAprobacion: '0%',
      visitasEnPlanta: 0,
      visitasFinalizadas: 0
    },
    rankingAnfitriones: [],
    rankingZonas: [],
    historial: []
  });
  const [visitasSearch, setVisitasSearch] = useState('');
  const [visitasFilterEstado, setVisitasFilterEstado] = useState('todos');
  const [visitasFilterOperativo, setVisitasFilterOperativo] = useState('todos');
  const [visitasPage, setVisitasPage] = useState(1);

  // Estados para Conducta (Módulo G)
  const [conductaData, setConductaData] = useState<any>({
    kpis: { totalReservas: 0, totalNoShows: 0, tasaNoShow: '0.0%', noShowsCalzosFijos: 0, totalLiberaciones: 0, totalAsistidas: 0, totalCalzos: 0, totalCalzosFijos: 0, porcentajeCalzosFijos: '0.0%' },
    rankingInfractores: [],
    historial: [],
    empleados: []
  });
  const [conductaSearch, setConductaSearch] = useState('');
  const [sortByInasistencias, setSortByInasistencias] = useState<'nombre' | 'desc' | 'asc'>('nombre');
  const [conductaFilterConducta, setConductaFilterConducta] = useState('todos');
  const [conductaPage, setConductaPage] = useState(1);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const zoneKeys = useMemo(() => {
    if (!ocupacionData.ocupacionHoraPunta || ocupacionData.ocupacionHoraPunta.length === 0) return [];
    const first = ocupacionData.ocupacionHoraPunta[0];
    return Object.keys(first).filter(k => k !== 'hora' && k !== 'global');
  }, [ocupacionData.ocupacionHoraPunta]);

  const getZoneColor = (zoneName: string, index: number) => {
    const name = zoneName.toLowerCase();
    if (name.includes('poniente')) return '#38BDF8'; // Celeste
    if (name.includes('playa')) return '#8B5A2B'; // Café
    if (name.includes('oriente')) return '#F97316'; // Naranja

    const defaultColors = ['#10B981', '#A855F7', '#3B82F6', '#EAB308'];
    return defaultColors[index % defaultColors.length];
  };

  const dynamicOcupacionKpis = useMemo(() => {
    return [
      { title: 'Tasa Promedio Global', value: ocupacionData.kpis.tasaOcupacionPromedio, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
      { title: 'Zona de Mayor Uso', value: ocupacionData.kpis.zonaMayorUso, icon: Award, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
      { title: 'Tiempo Uso Promedio', value: ocupacionData.kpis.tiempoUsoPromedio, icon: Clock, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    ];
  }, [ocupacionData.kpis]);

  // Calcular uso por auditor
  const auditorUsage = useMemo(() => {
    if (!auditoriaData || auditoriaData.length === 0) return [];

    const counts: { [key: string]: { nombre: string; rut: string; count: number } } = {};
    let totalActions = 0;

    auditoriaData.forEach(item => {
      const key = item.rutUsuario;
      if (!key) return;
      totalActions++;
      if (!counts[key]) {
        counts[key] = {
          nombre: item.nombreUsuario || 'Desconocido',
          rut: item.rutUsuario,
          count: 0
        };
      }
      counts[key].count++;
    });

    return Object.values(counts)
      .map(auditor => ({
        ...auditor,
        percentage: totalActions > 0 ? Math.round((auditor.count / totalActions) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [auditoriaData]);

  // Calcular tendencia de actividad por día del mes
  const activityTrend = useMemo(() => {
    if (!auditoriaData || auditoriaData.length === 0 || !selectedMonth) return [];

    const [year, month] = selectedMonth.split('-');
    const y = parseInt(year);
    const m = parseInt(month);
    const daysInMonth = new Date(y, m, 0).getDate();

    // Inicializar el conteo para cada día
    const dayCounts: { [day: number]: number } = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dayCounts[d] = 0;
    }

    // Contar acciones por día
    auditoriaData.forEach(item => {
      const date = new Date(item.fechaHora);
      if (date.getFullYear() === y && (date.getMonth() + 1) === m) {
        const day = date.getDate();
        if (dayCounts[day] !== undefined) {
          dayCounts[day]++;
        }
      }
    });

    // Convertir a formato de gráfico
    return Object.entries(dayCounts).map(([day, count]) => ({
      dia: `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
      operaciones: count
    }));
  }, [auditoriaData, selectedMonth]);

  useEffect(() => {
    const fetchAuditoria = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_URL}/admin/auditoria?mes=${selectedMonth}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          setAuditoriaData(data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const fetchOcupacion = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_URL}/admin/reportes/ocupacion?mes=${selectedMonth}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          setOcupacionData(data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const fetchListaEspera = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_URL}/admin/reportes/listaespera?mes=${selectedMonth}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          setListaesperaData(data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const fetchVisitas = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_URL}/admin/reportes/visitas?mes=${selectedMonth}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          setVisitasData(data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const fetchConducta = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_URL}/admin/reportes/conducta?mes=${selectedMonth}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          setConductaData(data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    setLoading(true);
    if (activeTab === 'auditoria') {
      fetchAuditoria().finally(() => {
        setTimeout(() => setLoading(false), 500);
      });
    } else if (activeTab === 'ocupacion') {
      fetchOcupacion().finally(() => {
        setTimeout(() => setLoading(false), 500);
      });
    } else if (activeTab === 'espera') {
      fetchListaEspera().finally(() => {
        setTimeout(() => setLoading(false), 500);
      });
    } else if (activeTab === 'visitas') {
      fetchVisitas().finally(() => {
        setTimeout(() => setLoading(false), 500);
      });
    } else if (activeTab === 'conducta') {
      fetchConducta().finally(() => {
        setTimeout(() => setLoading(false), 500);
      });
    } else {
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedMonth]);

  // Filtros y Paginación de Lista de Espera
  const filteredWaitlist = useMemo(() => {
    return (listaesperaData.historial || []).filter((item: any) => {
      const matchesSearch =
        item.nombreEmpleado.toLowerCase().includes(waitlistSearch.toLowerCase()) ||
        item.rutEmpleado.toLowerCase().includes(waitlistSearch.toLowerCase());

      const matchesStatus =
        waitlistFilterEstado === 'todos' ||
        item.estado.toLowerCase() === waitlistFilterEstado.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [listaesperaData.historial, waitlistSearch, waitlistFilterEstado]);

  const itemsPerPage = 10;
  const paginatedWaitlist = useMemo(() => {
    const startIndex = (waitlistPage - 1) * itemsPerPage;
    return filteredWaitlist.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredWaitlist, waitlistPage]);

  const totalWaitlistPages = Math.ceil(filteredWaitlist.length / itemsPerPage);

  // Reset de página cuando cambian los filtros
  useEffect(() => {
    setWaitlistPage(1);
  }, [waitlistSearch, waitlistFilterEstado]);

  const isCurrentMonth = selectedMonth === currentMonthString;

  // Para mostrar un texto de sub-título amigable
  const getSubTitleText = () => {
    if (isCurrentMonth) {
      return `Datos generados hasta el ${today.getDate()} de ${today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
    }
    if (!selectedMonth) return "Seleccione un mes para analizar.";
    const [year, month] = selectedMonth.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    return `Datos consolidados de ${dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
  };

  const getCalzoFullLabel = (idCalzo: number | string | null): string => {
    if (!idCalzo) return 'Sin calzo';
    const idNum = typeof idCalzo === 'string' ? parseInt(idCalzo) : idCalzo;
    if (isNaN(idNum)) return String(idCalzo);

    // Encontrar la zona y el label del slot
    for (const zone of ZONES) {
      for (const row of zone.rows) {
        const slot = row.slots.find(s => s.id === idNum);
        if (slot) {
          return `Calzo ${slot.label} (${zone.name})`;
        }
      }
    }
    return `Calzo #${idNum}`;
  };

  // Filtros y Paginación de Auditoría
  const filteredAuditoria = useMemo(() => {
    return (auditoriaData || []).filter((item: any) => {
      const matchesSearch =
        (item.nombreUsuario || '').toLowerCase().includes(auditoriaSearch.toLowerCase()) ||
        (item.rutUsuario || '').toLowerCase().includes(auditoriaSearch.toLowerCase()) ||
        (item.detalle || '').toLowerCase().includes(auditoriaSearch.toLowerCase());

      const matchesAccion =
        auditoriaFilterAccion === 'todos' ||
        item.accion === auditoriaFilterAccion;

      return matchesSearch && matchesAccion;
    });
  }, [auditoriaData, auditoriaSearch, auditoriaFilterAccion]);

  const paginatedAuditoria = useMemo(() => {
    const startIndex = (auditoriaPage - 1) * itemsPerPage;
    return filteredAuditoria.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAuditoria, auditoriaPage]);

  const totalAuditoriaPages = Math.ceil(filteredAuditoria.length / itemsPerPage);

  // Listado de acciones únicas para el selector de auditoría
  const uniqueAcciones = useMemo(() => {
    const set = new Set<string>();
    (auditoriaData || []).forEach((item: any) => {
      if (item.accion) set.add(item.accion);
    });
    return Array.from(set);
  }, [auditoriaData]);

  // Reset de página de auditoría al cambiar filtros
  useEffect(() => {
    setAuditoriaPage(1);
  }, [auditoriaSearch, auditoriaFilterAccion]);

  // Filtros y Paginación de Ocupación (Historial Uso Real)
  const filteredOcupacion = useMemo(() => {
    return (ocupacionData.historialUsoReal || []).filter((item: any) => {
      const matchesSearch =
        (item.nombreEmpleado || '').toLowerCase().includes(ocupacionSearch.toLowerCase()) ||
        (item.rutEmpleado || '').toLowerCase().includes(ocupacionSearch.toLowerCase());

      const matchesZona =
        ocupacionFilterZona === 'todos' ||
        getCalzoFullLabel(item.idCalzo).toLowerCase().includes(ocupacionFilterZona.toLowerCase());

      return matchesSearch && matchesZona;
    });
  }, [ocupacionData.historialUsoReal, ocupacionSearch, ocupacionFilterZona]);

  const paginatedOcupacion = useMemo(() => {
    const startIndex = (ocupacionPage - 1) * itemsPerPage;
    return filteredOcupacion.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOcupacion, ocupacionPage]);

  const totalOcupacionPages = Math.ceil(filteredOcupacion.length / itemsPerPage);

  // Reset de página de ocupación al cambiar filtros
  useEffect(() => {
    setOcupacionPage(1);
  }, [ocupacionSearch, ocupacionFilterZona]);

  // Filtros y Paginación de Visitas
  const filteredVisitas = useMemo(() => {
    return (visitasData.historial || []).filter((item: any) => {
      const matchesSearch =
        (item.nombreVisitante || '').toLowerCase().includes(visitasSearch.toLowerCase()) ||
        (item.rutVisitante || '').toLowerCase().includes(visitasSearch.toLowerCase()) ||
        (item.nombreAnfitrion || '').toLowerCase().includes(visitasSearch.toLowerCase()) ||
        (item.rutAnfitrion || '').toLowerCase().includes(visitasSearch.toLowerCase());

      const matchesEstado =
        visitasFilterEstado === 'todos' ||
        (item.estadoVisita || '').toLowerCase() === visitasFilterEstado.toLowerCase();

      const matchesOperativo =
        visitasFilterOperativo === 'todos' ||
        (item.estadoOperativo || '').toLowerCase() === visitasFilterOperativo.toLowerCase();

      return matchesSearch && matchesEstado && matchesOperativo;
    });
  }, [visitasData.historial, visitasSearch, visitasFilterEstado, visitasFilterOperativo]);

  const paginatedVisitas = useMemo(() => {
    const startIndex = (visitasPage - 1) * itemsPerPage;
    return filteredVisitas.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVisitas, visitasPage]);

  const totalVisitasPages = Math.ceil(filteredVisitas.length / itemsPerPage);

  // Reset de página de visitas al cambiar filtros
  useEffect(() => {
    setVisitasPage(1);
  }, [visitasSearch, visitasFilterEstado, visitasFilterOperativo]);

  // Filtros y Paginación de Conducta
  const filteredConducta = useMemo(() => {
    return (conductaData.historial || []).filter((item: any) => {
      const searchLower = conductaSearch.toLowerCase();
      const label = getCalzoFullLabel(item.idCalzo).toLowerCase();
      const matchesSearch =
        (item.nombre || '').toLowerCase().includes(searchLower) ||
        (item.rut || '').toLowerCase().includes(searchLower) ||
        (item.cargo || '').toLowerCase().includes(searchLower) ||
        label.includes(searchLower);

      let matchesConducta = true;
      if (conductaFilterConducta === 'noshow') {
        matchesConducta = item.estadoReserva === 'Cancelada' && (item.tipoLiberacion === 'No Asistió (Fijo)' || item.tipoLiberacion === 'Sistema');
      } else if (conductaFilterConducta === 'noshow_fijo') {
        matchesConducta = item.estadoReserva === 'Cancelada' && item.tipoLiberacion === 'No Asistió (Fijo)';
      } else if (conductaFilterConducta === 'noshow_compartido') {
        matchesConducta = item.estadoReserva === 'Cancelada' && item.tipoLiberacion === 'Sistema';
      } else if (conductaFilterConducta === 'liberacion') {
        matchesConducta = item.estadoReserva === 'Cancelada' && item.tipoLiberacion === 'Manual';
      } else if (conductaFilterConducta === 'asistencia') {
        matchesConducta = item.fechaEntradaReal !== null || item.estadoReserva === 'Finalizada';
      }

      return matchesSearch && matchesConducta;
    });
  }, [conductaData.historial, conductaSearch, conductaFilterConducta]);

  const paginatedConducta = useMemo(() => {
    const startIndex = (conductaPage - 1) * itemsPerPage;
    return filteredConducta.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredConducta, conductaPage]);

  // Lista de empleados agrupados por inasistencias
  // Se construye desde el historial completo del mes (sin el filtro de tipo),
  // pero sí aplica el conductaSearch para filtrar por nombre/rut/cargo.
  const empleadosPorInasistencia = useMemo(() => {
    const map = new Map<string, any>();
    const searchLower = conductaSearch.toLowerCase();

    // Inicializar el mapa con todos los empleados (o historial como fallback)
    if (conductaData.empleados && conductaData.empleados.length > 0) {
      conductaData.empleados.forEach((emp: any) => {
        const matchesSearch =
          !searchLower ||
          (emp.nombre || '').toLowerCase().includes(searchLower) ||
          (emp.rut || '').toLowerCase().includes(searchLower) ||
          (emp.cargo || '').toLowerCase().includes(searchLower);

        if (matchesSearch) {
          map.set(emp.rut, {
            rut: emp.rut,
            nombre: emp.nombre,
            cargo: emp.cargo,
            idCalzo: emp.idCalzoFijo,
            totalInasistencias: 0
          });
        }
      });
    } else {
      (conductaData.historial || []).forEach((item: any) => {
        const matchesSearch =
          !searchLower ||
          (item.nombre || '').toLowerCase().includes(searchLower) ||
          (item.rut || '').toLowerCase().includes(searchLower) ||
          (item.cargo || '').toLowerCase().includes(searchLower);

        if (matchesSearch) {
          const key = item.rut;
          if (!map.has(key)) {
            map.set(key, {
              rut: item.rut,
              nombre: item.nombre,
              cargo: item.cargo,
              idCalzo: item.idCalzoFijo,
              totalInasistencias: 0
            });
          }
        }
      });
    }

    // Contar inasistencias reales (canceladas por sistema o por no asistir, excluyendo liberaciones manuales)
    (conductaData.historial || []).forEach((item: any) => {
      const employee = map.get(item.rut);
      if (employee) {
        if (item.estadoReserva === 'Cancelada' && item.tipoLiberacion !== 'Manual') {
          employee.totalInasistencias++;
        }
      }
    });

    return Array.from(map.values())
      .sort((a, b) => {
        if (sortByInasistencias === 'desc') {
          // Mayor a menor; empate → alfabético
          if (b.totalInasistencias !== a.totalInasistencias) return b.totalInasistencias - a.totalInasistencias;
          return a.nombre.localeCompare(b.nombre);
        } else if (sortByInasistencias === 'asc') {
          // Menor a mayor; empate → alfabético
          if (a.totalInasistencias !== b.totalInasistencias) return a.totalInasistencias - b.totalInasistencias;
          return a.nombre.localeCompare(b.nombre);
        } else {
          return a.nombre.localeCompare(b.nombre);
        }
      });
  }, [conductaData.empleados, conductaData.historial, conductaSearch, sortByInasistencias]);

  const paginatedEmpleadosPorInasistencia = useMemo(() => {
    const startIndex = (conductaPage - 1) * itemsPerPage;
    return empleadosPorInasistencia.slice(startIndex, startIndex + itemsPerPage);
  }, [empleadosPorInasistencia, conductaPage]);

  const totalConductaPages = Math.ceil(empleadosPorInasistencia.length / itemsPerPage);

  // Reset de página de conducta al cambiar filtros o cambiar el orden
  useEffect(() => {
    setConductaPage(1);
  }, [conductaSearch, conductaFilterConducta, sortByInasistencias]);

  const formatDetalle = (accion: string, detalleStr: string) => {
    try {
      const data = JSON.parse(detalleStr);
      switch (accion) {
        case 'CREAR_EMPLEADO':
          return `Registró a ${data.nombre || ''} (RUT: ${data.rutRegistrado || ''})`;
        case 'EDITAR_EMPLEADO':
          const cambiosStr = data.cambios ? Object.entries(data.cambios).map(([k, v]) => `${k}: ${v}`).join(', ') : 'Desconocido';
          return `Editó a ${data.nombre || 'ID ' + data.idEmpleadoEditado} (RUT: ${data.rut || ''}). Campos nuevos: ${cambiosStr}`;
        case 'ELIMINAR_EMPLEADO': {
          const nombres = data.eliminados?.filter(Boolean);
          if (nombres && nombres.length > 0) {
            return `Eliminó a: ${nombres.join(', ')}`;
          }
          if (data.idsEliminados && data.idsEliminados.length > 0) {
            return `Eliminó a ID: ${data.idsEliminados.join(', ')}`;
          }
          if (data.idEmpleadoEliminado) {
            return `Eliminó a ID: ${data.idEmpleadoEliminado}`;
          }
          return 'Eliminó empleado';
        }
        case 'ASIGNAR_CALZO_FIJO':
          return `Asignó ${getCalzoFullLabel(data.idCalzo)} como fijo a ${data.nombre || ''} (RUT: ${data.rut || ''})`;
        case 'GENERAR_RESERVAS_CALZO_FIJO':
          return `Asignó ${getCalzoFullLabel(data.idCalzo)} como fijo a ${data.nombre || ''} (RUT: ${data.rut || ''})`;
        case 'REVOCAR_CALZO_FIJO':
          return `Revocó calzo fijo a ${data.nombre || ''} (RUT: ${data.rut || ''})`;
        case 'MODIFICAR_ESTADO_INCIDENCIA':
          return `Cambió la incidencia #${data.idIncidencia} (${data.categoria || 'Sin categoría especificada'}) a estado: ${data.nuevoEstado}`;
        case 'ASIGNAR_CALZO_MANUAL':
          return `Asignó ${getCalzoFullLabel(data.idCalzo)} a la espera de ${data.nombre || ''} (RUT: ${data.rut || ''})`;
        case 'APROBAR_VISITA':
          return `Aprobó visita de ${data.visitante || ''} para el anfitrión ${data.anfitrion || ''} en ${getCalzoFullLabel(data.idCalzo)}`;
        case 'RECHAZAR_VISITA':
          return `Rechazó visita de ${data.visitante || ''} para el anfitrión ${data.anfitrion || ''}`;
        default:
          return Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(' | ');
      }
    } catch (e) {
      return detalleStr;
    }
  };

  const exportToPDF = async () => {
    if (activeTab === 'auditoria') {
      const doc = new jsPDF();

      const img = new Image();
      img.src = '/encabezado.png';

      const renderPDF = () => {
        doc.setFontSize(18);
        doc.text('Reporte de Auditoría', 14, 32);
        doc.setFontSize(12);
        doc.text(`Período analizado: ${selectedMonth}`, 14, 38);

        // Agrupar los datos por Acción
        const groupedData = auditoriaData.reduce((acc: any, item: any) => {
          if (!acc[item.accion]) acc[item.accion] = [];
          acc[item.accion].push(item);
          return acc;
        }, {});

        let currentY = 48;

        Object.keys(groupedData).forEach(accion => {
          // Título del grupo
          doc.setFontSize(12);
          doc.setTextColor(249, 115, 22); // Naranja Nutripark
          doc.text(`> ${accion.replace(/_/g, ' ')}`, 14, currentY);

          const tableColumn = ["Fecha y Hora", "Usuario", "Detalles"];
          const tableRows = groupedData[accion].map((item: any) => [
            new Date(item.fechaHora).toLocaleString('es-CL'),
            `${item.nombreUsuario}\n(RUT: ${item.rutUsuario})`,
            formatDetalle(item.accion, item.detalle)
          ]);

          autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY + 4,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] }, // Naranja con texto negro
            columnStyles: {
              0: { cellWidth: 35 }, // Darle buen espacio a la fecha
              1: { cellWidth: 50 }, // Darle buen espacio al usuario
              2: { cellWidth: 'auto' } // Lo restante para detalles
            }
          });

          currentY = (doc as any).lastAutoTable.finalY + 12;

          // Add new page if we are too close to bottom
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }
        });

        // 1. Nueva Sección: Participación y Uso por Auditor
        doc.addPage();
        currentY = 20;
        doc.setFontSize(14);
        doc.setTextColor(249, 115, 22); // Naranja Nutripark
        doc.text(`> PARTICIPACIÓN Y USO POR AUDITOR`, 14, currentY);

        const auditorColumn = ["Auditor (Nombre)", "RUT", "Operaciones Realizadas", "% Participación"];
        const auditorRows = auditorUsage.map(auditor => [
          auditor.nombre,
          auditor.rut,
          auditor.count.toString(),
          `${auditor.percentage}%`
        ]);

        autoTable(doc, {
          head: [auditorColumn],
          body: auditorRows.length > 0 ? auditorRows : [["Sin datos", "-", "-", "-"]],
          startY: currentY + 4,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 40 },
            2: { cellWidth: 45 },
            3: { cellWidth: 'auto' }
          }
        });

        // 2. Nueva Sección: Tendencia de Actividad por Día
        currentY = (doc as any).lastAutoTable.finalY + 12;
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(249, 115, 22);
        doc.text(`> TENDENCIA DE ACTIVIDAD POR DÍA`, 14, currentY);

        const trendColumn = ["Fecha/Día del Mes", "Cantidad de Operaciones Realizadas"];
        const trendRows = activityTrend
          .filter(t => t.operaciones > 0)
          .map(t => [t.dia, t.operaciones.toString()]);

        autoTable(doc, {
          head: [trendColumn],
          body: trendRows.length > 0 ? trendRows : [["Sin operaciones", "0"]],
          startY: currentY + 4,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 'auto' }
          }
        });

        doc.save(`Auditoria_Nutripark_${selectedMonth}.pdf`);
      };

      img.onload = () => {
        const pdfWidth = doc.internal.pageSize.getWidth();
        const imgProps = doc.getImageProperties(img);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        // Dibujamos el encabezado ajustando el ancho completo
        doc.addImage(img, 'PNG', 0, 0, pdfWidth, imgHeight > 40 ? 40 : imgHeight);
        renderPDF();
      };

      img.onerror = () => {
        console.warn("No se pudo cargar encabezado.png para auditoría, generando sin imagen.");
        renderPDF();
      };

    } else if (activeTab === 'ocupacion') {
      const doc = new jsPDF();

      const img = new Image();
      img.src = '/encabezado.png';

      const renderPDF = () => {
        doc.setFontSize(18);
        doc.text('Reporte de Uso y Ocupación del Estacionamiento', 14, 32);
        doc.setFontSize(12);
        doc.text(`Período analizado: ${selectedMonth}`, 14, 38);

        let currentY = 48;

        // 1. Resumen de KPIs
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22); // Naranja Nutripark
        doc.text(`> RESUMEN DE MÉTRICAS CLAVE`, 14, currentY);

        const kpisColumn = ["Métrica", "Valor"];
        const kpisRows = [
          ["Tasa de Ocupación Promedio Global", ocupacionData.kpis.tasaOcupacionPromedio],
          ["Zona de Mayor Uso", ocupacionData.kpis.zonaMayorUso],
          ["Tiempo de Uso Físico Promedio", ocupacionData.kpis.tiempoUsoPromedio]
        ];

        autoTable(doc, {
          head: [kpisColumn],
          body: kpisRows,
          startY: currentY + 4,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 'auto' }
          }
        });

        // 2. Ocupación por Zona
        currentY = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> TASA DE OCUPACIÓN POR ZONA`, 14, currentY);

        const zonesColumn = ["Zona Física", "Tasa de Ocupación Promedio"];
        const zonesRows = Object.entries(ocupacionData.ocupacionPorZona || {}).map(([zona, rate]) => [
          zona,
          `${rate}%`
        ]);

        autoTable(doc, {
          head: [zonesColumn],
          body: zonesRows.length > 0 ? zonesRows : [["Sin datos", "0%"]],
          startY: currentY + 4,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 'auto' }
          }
        });

        // 3. Gráfico de Tendencia de Ocupación por Hora Punta (Hora Punta)
        currentY = (doc as any).lastAutoTable.finalY + 12;
        if (currentY > 180) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> TASA DE OCUPACIÓN POR HORA PUNTA (00:00 - 23:59)`, 14, currentY);

        currentY += 6;

        // --- DIBUJO DE MAPA DE CALOR NATIVO EN EL PDF ---
        const gridX = 48; // Margen de inicio para la cuadrícula
        const cellW = 5.8;
        const cellH = 6.0;
        const cellGap = 0.5;
        const rowGap = 1.5;

        // 1. Dibujar etiquetas de horas (cabecera de la matriz)
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(120, 120, 120);

        for (let h = 0; h < 24; h++) {
          const labelX = gridX + h * (cellW + cellGap) + cellW / 2;
          doc.text(`${String(h).padStart(2, '0')}`, labelX, currentY + 6, { align: 'center' });
        }

        // Línea divisoria horizontal sutil debajo de las cabeceras
        doc.setLineWidth(0.15);
        doc.setDrawColor(220, 220, 220);
        doc.line(14, currentY + 8, gridX + 24 * (cellW + cellGap), currentY + 8);

        // 2. Dibujar filas por cada zona
        const points = ocupacionData.ocupacionHoraPunta || [];

        zoneKeys.forEach((zone, zIdx) => {
          const rowY = currentY + 14 + zIdx * (cellH + rowGap);

          // Obtener los componentes de color de la zona
          const hex = getZoneColor(zone, zIdx);
          const r = parseInt(hex.substring(1, 3), 16);
          const g = parseInt(hex.substring(3, 5), 16);
          const b = parseInt(hex.substring(5, 7), 16);

          // Dibujar un pequeño cuadrado del color de la zona a la izquierda
          doc.setFillColor(r, g, b);
          doc.rect(14, rowY + cellH / 2 - 1.5, 3, 3, 'F');

          // Nombre de la zona a la izquierda (desplazado para no chocar con el cuadrado)
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(60, 60, 60);
          
          let displayName = zone;
          if (displayName.length > 20) displayName = displayName.substring(0, 18) + "...";
          doc.text(displayName, 19, rowY + cellH / 2 + 1);

          // Celdas de 24 horas para esta zona
          for (let h = 0; h < 24; h++) {
            const cellX = gridX + h * (cellW + cellGap);
            const hourData = points[h] || {};
            const pct = hourData[zone] || 0;

            let cellR = 245;
            let cellG = 245;
            let cellB = 245;
            
            if (pct > 0) {
              const alpha = Math.min(1.0, 0.2 + (pct / 100) * 0.8);
              cellR = Math.round(255 - (255 - r) * alpha);
              cellG = Math.round(255 - (255 - g) * alpha);
              cellB = Math.round(255 - (255 - b) * alpha);
            }

            doc.setFillColor(cellR, cellG, cellB);
            doc.rect(cellX, rowY, cellW, cellH, 'F');

            if (pct > 0) {
              doc.setFontSize(5);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(40, 40, 40);
              doc.text(`${pct}%`, cellX + cellW / 2, rowY + cellH / 2 + 1.2, { align: 'center' });
            }
          }
        });

        // 3. Dibujar leyenda de escala al final del mapa de calor
        const heatmapEndY = currentY + 18 + zoneKeys.length * (cellH + rowGap);
        
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        doc.text("Escala de Ocupación:", 14, heatmapEndY + 4);

        // Cuadritos de leyenda con colores temáticos de Nutripark
        const legendScales = [
          { text: "Sin Ocupación", bg: [245, 245, 245] },
          { text: "Ocupación Baja (1%)", bg: [255, 237, 213] },
          { text: "Ocupación Media-Alta (50% - 100%)", bg: [249, 115, 22] }
        ];

        legendScales.forEach((scale, sIdx) => {
          const legX = 48 + sIdx * 45;
          doc.setFillColor(scale.bg[0], scale.bg[1], scale.bg[2]);
          doc.rect(legX, heatmapEndY + 1.5, 4, 4, 'F');
          
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(scale.text, legX + 6, heatmapEndY + 4.5);
        });

        currentY = heatmapEndY + 10;
        (doc as any).lastAutoTable = { finalY: currentY };

        // 4. Historial de Uso Real (Nueva Página)
        doc.addPage();
        currentY = 20;

        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> HISTORIAL DE USO FÍSICO REAL DEL MES`, 14, currentY);

        const histColumn = ["Empleado", "Calzo y Zona", "Entrada Real", "Salida Real", "Duración"];
        const histRows = (ocupacionData.historialUsoReal || []).map((item: any) => [
          `${item.nombreEmpleado}\n(RUT: ${item.rutEmpleado})`,
          getCalzoFullLabel(item.idCalzo),
          item.fechaEntradaReal,
          item.fechaSalidaReal,
          item.duracion
        ]);

        autoTable(doc, {
          head: [histColumn],
          body: histRows.length > 0 ? histRows : [["Sin registros de uso físico real", "-", "-", "-", "-"]],
          startY: currentY + 4,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 45 },
            2: { cellWidth: 32 },
            3: { cellWidth: 32 },
            4: { cellWidth: 'auto' }
          }
        });

        doc.save(`Reporte_Ocupacion_Nutripark_${selectedMonth}.pdf`);
      };

      img.onload = () => {
        const pdfWidth = doc.internal.pageSize.getWidth();
        const imgProps = doc.getImageProperties(img);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        doc.addImage(img, 'PNG', 0, 0, pdfWidth, imgHeight > 40 ? 40 : imgHeight);
        renderPDF();
      };

      img.onerror = () => {
        console.warn("No se pudo cargar encabezado.png, generando sin imagen.");
        renderPDF();
      };
    } else if (activeTab === 'espera') {
      const doc = new jsPDF();
      const img = new Image();
      img.src = '/encabezado.png';

      const renderPDF = () => {
        doc.setFontSize(18);
        doc.text('Reporte Analítico de Lista de Espera', 14, 32);
        doc.setFontSize(12);
        doc.text(`Período analizado: ${selectedMonth}`, 14, 38);

        let currentY = 48;

        // 1. Resumen de KPIs
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> RESUMEN DE MÉTRICAS CLAVE`, 14, currentY);

        const kpisColumn = ["Métrica", "Valor"];
        const kpisRows = [
          ["Total Inscripciones", listaesperaData.kpis.totalInscripciones.toString()],
          ["Tasa de Asignación Exitosa", listaesperaData.kpis.tasaAsignacionGlobal],
          ["Tasa de Abandono (Manual)", listaesperaData.kpis.tasaAbandonoManual],
          ["Tasa de Abandono (Expirada por Sistema)", listaesperaData.kpis.tasaAbandonoSistema]
        ];

        autoTable(doc, {
          head: [kpisColumn],
          body: kpisRows,
          startY: currentY + 4,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 'auto' }
          }
        });

        // 2. Desglose por Zona
        currentY = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> DETALLE DE LISTA DE ESPERA POR ZONA`, 14, currentY);

        const zonesColumn = ["Zona", "Inscripciones", "Asignados", "Cancelados Manual", "Expirados", "Tasa Asig.", "Tasa Abandono"];
        const zonesRows = (listaesperaData.desgloseZonas || []).map((z: any) => [
          z.nombreZona,
          z.total.toString(),
          z.asignados.toString(),
          z.canceladosManual.toString(),
          z.canceladosSistema.toString(),
          `${z.tasaAsignacion}%`,
          `${z.tasaAbandonoManual + z.tasaAbandonoSistema}%`
        ]);

        autoTable(doc, {
          head: [zonesColumn],
          body: zonesRows.length > 0 ? zonesRows : [["Sin datos", "-", "-", "-", "-", "-", "-"]],
          startY: currentY + 4,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 20 },
            2: { cellWidth: 20 },
            3: { cellWidth: 25 },
            4: { cellWidth: 20 },
            5: { cellWidth: 20 },
            6: { cellWidth: 'auto' }
          }
        });

        // 3. Historial de Eventos Completo
        currentY = (doc as any).lastAutoTable.finalY + 12;
        if (currentY > 180) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> HISTORIAL DETALLADO DE EVENTOS`, 14, currentY);

        const histColumn = ["Empleado", "Zona Solicitada", "Fecha Inscripción", "Rango Solicitado", "Estado", "Reserva"];
        const histRows = (listaesperaData.historial || []).map((item: any) => [
          `${item.nombreEmpleado}\n(RUT: ${item.rutEmpleado})`,
          item.nombreZona,
          item.fechaHoraInscripcion,
          `${item.fechaInicio.split(' ')[1] || item.fechaInicio} -\n${item.fechaFin.split(' ')[1] || item.fechaFin}`,
          item.estado,
          item.idReservaGenerada
        ]);

        autoTable(doc, {
          head: [histColumn],
          body: histRows.length > 0 ? histRows : [["Sin registros históricos", "-", "-", "-", "-", "-"]],
          startY: currentY + 4,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 25 },
            2: { cellWidth: 32 },
            3: { cellWidth: 32 },
            4: { cellWidth: 25 },
            5: { cellWidth: 'auto' }
          }
        });

        doc.save(`Reporte_ListaEspera_Nutripark_${selectedMonth}.pdf`);
      };

      img.onload = () => {
        const pdfWidth = doc.internal.pageSize.getWidth();
        const imgProps = doc.getImageProperties(img);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        doc.addImage(img, 'PNG', 0, 0, pdfWidth, imgHeight > 40 ? 40 : imgHeight);
        renderPDF();
      };

      img.onerror = () => {
        console.warn("No se pudo cargar encabezado.png, generando sin imagen.");
        renderPDF();
      };
    } else if (activeTab === 'visitas') {
      const doc = new jsPDF();
      const img = new Image();
      img.src = '/encabezado.png';

      const renderPDF = () => {
        doc.setFontSize(18);
        doc.text('Reporte de Control de Visitas Externas', 14, 32);
        doc.setFontSize(12);
        doc.text(`Período analizado: ${selectedMonth}`, 14, 38);

        let currentY = 48;

        // 1. Resumen de KPIs
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> RESUMEN DE INDICADORES CLAVE`, 14, currentY);

        const kpisColumn = ["Métrica", "Valor"];
        const kpisRows = [
          ["Total Solicitudes de Visitas", visitasData.kpis.totalVisitas.toString()],
          ["Tasa de Aprobación de Visitas", visitasData.kpis.tasaAprobacion],
          ["Visitas Aprobadas", visitasData.kpis.visitasAprobadas.toString()],
          ["Visitas Rechazadas", visitasData.kpis.visitasRechazadas.toString()],
          ["Visitas Pendientes de Aprobación", visitasData.kpis.visitasPendientes.toString()],
          ["Visitas Finalizadas", visitasData.kpis.visitasFinalizadas.toString()]
        ];

        autoTable(doc, {
          head: [kpisColumn],
          body: kpisRows,
          startY: currentY + 4,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 'auto' }
          }
        });

        // 2. Ranking de Anfitriones
        currentY = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> RANKING DE ANFITRIONES (TOP EMPLEADOS)`, 14, currentY);

        const hostColumn = ["Nombre Anfitrión", "RUT", "Cantidad de Visitas Solicitadas"];
        const hostRows = (visitasData.rankingAnfitriones || []).map((h: any) => [
          h.nombre,
          h.rut,
          h.cantidad.toString()
        ]);

        autoTable(doc, {
          head: [hostColumn],
          body: hostRows.length > 0 ? hostRows : [["Sin datos", "-", "-"]],
          startY: currentY + 4,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 50 },
            2: { cellWidth: 'auto' }
          }
        });

        // 3. Ranking de Calzos
        currentY = (doc as any).lastAutoTable.finalY + 12;
        if (currentY > 220) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> RANKING DE ZONAS (VISITAS APROBADAS Y FINALIZADAS)`, 14, currentY);

        const zonasColumn = ["Zona de Estacionamiento", "Cantidad Aprobada y Finalizada"];
        const zonasRows = (visitasData.rankingZonas || []).map((z: any) => [
          z.nombreZona,
          z.cantidad.toString()
        ]);

        autoTable(doc, {
          head: [zonasColumn],
          body: zonasRows.length > 0 ? zonasRows : [["Sin datos", "-"]],
          startY: currentY + 4,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 'auto' }
          }
        });

        // 4. Historial Detallado de Visitas
        doc.addPage();
        currentY = 20;
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> DETALLE HISTÓRICO DE SOLICITUDES DE VISITAS`, 14, currentY);

        const histColumn = ["Visitante", "Anfitrión", "Calzo / Zona", "Horario", "Solicitud", "Operativo"];
        const histRows = (visitasData.historial || []).map((item: any) => [
          `${item.nombreVisitante}\nRUT: ${item.rutVisitante}\nPatente: ${item.matricula}`,
          `${item.nombreAnfitrion}\nRUT: ${item.rutAnfitrion}`,
          item.idCalzo !== '-' ? `Calzo ${item.numCalzo}\n(${item.nombreZona})` : '-',
          `Entrada: ${item.fechaEntrada}\nSalida: ${item.fechaSalida}`,
          item.estadoVisita,
          item.estadoOperativo || '-'
        ]);

        autoTable(doc, {
          head: [histColumn],
          body: histRows.length > 0 ? histRows : [["Sin registros de visitas", "-", "-", "-", "-", "-"]],
          startY: currentY + 4,
          styles: { fontSize: 7.5 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 35 },
            2: { cellWidth: 32 },
            3: { cellWidth: 43 },
            4: { cellWidth: 20 },
            5: { cellWidth: 'auto' }
          }
        });

        doc.save(`Reporte_Visitas_Nutripark_${selectedMonth}.pdf`);
      };

      img.onload = () => {
        const pdfWidth = doc.internal.pageSize.getWidth();
        const imgProps = doc.getImageProperties(img);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        doc.addImage(img, 'PNG', 0, 0, pdfWidth, imgHeight > 40 ? 40 : imgHeight);
        renderPDF();
      };

      img.onerror = () => {
        console.warn("No se pudo cargar encabezado.png, generando sin imagen.");
        renderPDF();
      };
    } else if (activeTab === 'conducta') {
      const doc = new jsPDF();
      const img = new Image();
      img.src = '/encabezado.png';

      const renderPDF = () => {
        // Calcular ranking completo de empleados con inasistencias ordenados de mayor a menor
        const map = new Map<string, any>();
        if (conductaData.empleados && conductaData.empleados.length > 0) {
          conductaData.empleados.forEach((emp: any) => {
            map.set(emp.rut, {
              rut: emp.rut,
              nombre: emp.nombre,
              cargo: emp.cargo,
              idCalzo: emp.idCalzoFijo,
              totalInasistencias: 0
            });
          });
        } else {
          (conductaData.historial || []).forEach((item: any) => {
            const key = item.rut;
            if (!map.has(key)) {
              map.set(key, {
                rut: item.rut,
                nombre: item.nombre,
                cargo: item.cargo,
                idCalzo: item.idCalzoFijo,
                totalInasistencias: 0
              });
            }
          });
        }

        (conductaData.historial || []).forEach((item: any) => {
          const employee = map.get(item.rut);
          if (employee) {
            if (item.estadoReserva === 'Cancelada' && item.tipoLiberacion !== 'Manual') {
              employee.totalInasistencias++;
            }
          }
        });

        const completeRanking = Array.from(map.values()).sort((a, b) => {
          if (b.totalInasistencias !== a.totalInasistencias) {
            return b.totalInasistencias - a.totalInasistencias;
          }
          return a.nombre.localeCompare(b.nombre);
        });

        // Filtrar reservas que NO estén en estado 'Pendiente' para el historial detallado
        const historialFiltrado = (conductaData.historial || []).filter((item: any) => item.estadoReserva !== 'Pendiente');

        doc.setFontSize(18);
        doc.text('Reporte de Conducta e Inasistencias', 14, 32);
        doc.setFontSize(12);
        doc.text(`Período analizado: ${selectedMonth}`, 14, 38);

        let currentY = 48;

        // 1. Resumen de KPIs
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> RESUMEN DE INDICADORES DE CONDUCTA`, 14, currentY);

        const kpisColumn = ["Métrica", "Valor"];
        const kpisRows = [
          ["Reservas Totales Realizadas", conductaData.kpis.totalReservas.toString()],
          ["Inasistencias (Ausencias sin Liberación)", conductaData.kpis.totalNoShows.toString()],
          ["Tasa Global de Inasistencias", conductaData.kpis.tasaNoShow],
          ["Inasistencias en Calzos Fijos", conductaData.kpis.noShowsCalzosFijos.toString()],
          ["Liberaciones Manuales (Anticipadas)", conductaData.kpis.totalLiberaciones.toString()],
          ["Reservas Asistidas (Ocupadas Real)", conductaData.kpis.totalAsistidas.toString()],
          ["Total de Calzos en Planta", (conductaData.kpis.totalCalzos || 0).toString()],
          ["Calzos Fijos Asignados", (conductaData.kpis.totalCalzosFijos || 0).toString()],
          ["Tasa de Asignación Fija", conductaData.kpis.porcentajeCalzosFijos || "0.0%"]
        ];

        autoTable(doc, {
          head: [kpisColumn],
          body: kpisRows,
          startY: currentY + 4,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 'auto' }
          }
        });

        // 2. Ranking de Inasistencias de Empleados
        currentY = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> RANKING DE EMPLEADOS POR INASISTENCIAS`, 14, currentY);

        const rankColumn = ["Posición", "Empleado", "Cargo", "Calzo Fijo", "Inasistencias"];
        const rankRows = completeRanking.map((item: any, idx: number) => [
          `#${idx + 1}`,
          `${item.nombre}\nRUT: ${item.rut}`,
          item.cargo,
          item.idCalzo ? getCalzoFullLabel(item.idCalzo) : 'Sin calzo asignado',
          `${item.totalInasistencias} Inasistencias`
        ]);

        autoTable(doc, {
          head: [rankColumn],
          body: rankRows.length > 0 ? rankRows : [["-", "Sin inasistencias en este mes", "-", "-", "-"]],
          startY: currentY + 4,
          styles: { fontSize: 8.5 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 50 },
            2: { cellWidth: 40 },
            3: { cellWidth: 45 },
            4: { cellWidth: 'auto' }
          }
        });

        // 3. Historial de Reservas
        doc.addPage();
        currentY = 20;
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`> HISTORIAL DETALLADO DE RESERVAS Y CONDUCTA`, 14, currentY);

        const histColumn = ["Empleado", "Cargo", "Calzo", "Fecha Reserva", "Estado", "Detalle / Acción"];
        const histRows = historialFiltrado.map((item: any) => {
          let estadoTxt = item.estadoReserva;
          if (item.fechaEntradaReal || item.estadoReserva === 'Finalizada') {
            estadoTxt = 'Asistida';
          }

          let detalleTxt = '-';
          if (item.fechaEntradaReal || item.estadoReserva === 'Finalizada') {
            detalleTxt = `Entró ${new Date(item.fechaEntradaReal || item.fechaEntrada).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
          } else if (item.estadoReserva === 'Cancelada') {
            if (item.tipoLiberacion === 'No Asistió (Fijo)') {
              detalleTxt = 'Inasistencia (Fijo)';
            } else if (item.tipoLiberacion === 'Sistema') {
              detalleTxt = 'Inasistencia (Sistema)';
            } else if (item.tipoLiberacion === 'Manual') {
              detalleTxt = 'Liberación Manual';
            } else {
              detalleTxt = item.tipoLiberacion || 'Cancelada';
            }
          }

          return [
            `${item.nombre}\nRUT: ${item.rut}`,
            item.cargo,
            getCalzoFullLabel(item.idCalzo),
            new Date(item.fechaEntrada).toLocaleDateString('es-CL'),
            estadoTxt,
            detalleTxt
          ];
        });

        autoTable(doc, {
          head: [histColumn],
          body: histRows.length > 0 ? histRows : [["Sin registros de conducta", "-", "-", "-", "-", "-"]],
          startY: currentY + 4,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 35 },
            2: { cellWidth: 35 },
            3: { cellWidth: 25 },
            4: { cellWidth: 20 },
            5: { cellWidth: 'auto' }
          }
        });

        doc.save(`Reporte_Conducta_Nutripark_${selectedMonth}.pdf`);
      };

      img.onload = () => {
        const pdfWidth = doc.internal.pageSize.getWidth();
        const imgProps = doc.getImageProperties(img);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        doc.addImage(img, 'PNG', 0, 0, pdfWidth, imgHeight > 40 ? 40 : imgHeight);
        renderPDF();
      };

      img.onerror = () => {
        console.warn("No se pudo cargar encabezado.png, generando sin imagen.");
        renderPDF();
      };
    } else {
      alert("La exportación para esta pestaña no está disponible.");
    }
  };

  const exportToExcel = () => {
    if (activeTab === 'auditoria') {
      // Agrupar y formatear los datos para Excel
      const groupedData = auditoriaData.reduce((acc: any, item: any) => {
        if (!acc[item.accion]) acc[item.accion] = [];
        acc[item.accion].push(item);
        return acc;
      }, {});

      const dataToExport: any[] = [];

      Object.keys(groupedData).forEach(accion => {
        groupedData[accion].forEach((item: any) => {
          dataToExport.push({
            "Categoría de Acción": accion.replace(/_/g, ' '),
            "Fecha y Hora": new Date(item.fechaHora).toLocaleString('es-CL'),
            "Nombre Usuario": item.nombreUsuario,
            "RUT Usuario": item.rutUsuario,
            "Detalles de Operación": formatDetalle(item.accion, item.detalle)
          });
        });
      });

      // Hoja de Resumen por Auditor
      const auditorToExport = auditorUsage.map(auditor => ({
        "Nombre Auditor": auditor.nombre,
        "RUT Auditor": auditor.rut,
        "Operaciones Realizadas": auditor.count,
        "Porcentaje de Participación": `${auditor.percentage}%`
      }));

      // Hoja de Tendencia Diaria
      const trendToExport = activityTrend.map(t => ({
        "Fecha (Día/Mes)": t.dia,
        "Operaciones Realizadas": t.operaciones
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const worksheetAuditor = XLSX.utils.json_to_sheet(auditorToExport);
      const worksheetTrend = XLSX.utils.json_to_sheet(trendToExport);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Detalles de Auditoría");
      XLSX.utils.book_append_sheet(workbook, worksheetAuditor, "Resumen por Auditor");
      XLSX.utils.book_append_sheet(workbook, worksheetTrend, "Tendencia de Actividad");

      XLSX.writeFile(workbook, `Auditoria_Nutripark_${selectedMonth}.xlsx`);
    } else if (activeTab === 'ocupacion') {
      // 1. Hoja "Métricas y Ocupación por Zona"
      const kpisData = [
        { "Métrica / KPI": "Tasa de Ocupación Promedio Global", "Valor": ocupacionData.kpis.tasaOcupacionPromedio },
        { "Métrica / KPI": "Zona de Mayor Uso", "Valor": ocupacionData.kpis.zonaMayorUso },
        { "Métrica / KPI": "Tiempo de Uso Físico Promedio", "Valor": ocupacionData.kpis.tiempoUsoPromedio },
        { "Métrica / KPI": "", "Valor": "" } // Espacio en blanco
      ];

      Object.entries(ocupacionData.ocupacionPorZona || {}).forEach(([zona, rate]) => {
        kpisData.push({
          "Métrica / KPI": `Tasa Promedio ${zona}`,
          "Valor": `${rate}%`
        });
      });

      // 2. Hoja "Ocupación por Horas"
      const hourData = (ocupacionData.ocupacionHoraPunta || []).map((hItem: any) => {
        const obj: any = {
          "Hora": hItem.hora,
          "Tasa Global (%)": hItem.global
        };
        zoneKeys.forEach(z => {
          obj[`Tasa ${z} (%)`] = hItem[z];
        });
        return obj;
      });

      // 3. Hoja "Historial de Uso Real"
      const historyExport = (ocupacionData.historialUsoReal || []).map((item: any) => ({
        "Nombre Empleado": item.nombreEmpleado,
        "RUT Empleado": item.rutEmpleado,
        "Calzo y Zona": getCalzoFullLabel(item.idCalzo),
        "Entrada Real": item.fechaEntradaReal,
        "Salida Real": item.fechaSalidaReal,
        "Duración Real": item.duracion
      }));

      const worksheetKpi = XLSX.utils.json_to_sheet(kpisData);
      const worksheetHour = XLSX.utils.json_to_sheet(hourData);
      const worksheetHistory = XLSX.utils.json_to_sheet(historyExport);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheetKpi, "Ocupación por Zona");
      XLSX.utils.book_append_sheet(workbook, worksheetHour, "Ocupación por Horas");
      XLSX.utils.book_append_sheet(workbook, worksheetHistory, "Historial de Uso Real");

      XLSX.writeFile(workbook, `Reporte_Ocupacion_Nutripark_${selectedMonth}.xlsx`);
    } else if (activeTab === 'espera') {
      const kpisData = [
        { "Métrica / KPI": "Total Inscripciones", "Valor": listaesperaData.kpis.totalInscripciones },
        { "Métrica / KPI": "Tasa de Asignación Exitosa", "Valor": listaesperaData.kpis.tasaAsignacionGlobal },
        { "Métrica / KPI": "Tasa de Abandono (Manual)", "Valor": listaesperaData.kpis.tasaAbandonoManual },
        { "Métrica / KPI": "Tasa de Abandono (Expirada por Sistema)", "Valor": listaesperaData.kpis.tasaAbandonoSistema },
        { "Métrica / KPI": "", "Valor": "" }
      ];

      (listaesperaData.desgloseZonas || []).forEach((z: any) => {
        kpisData.push({
          "Métrica / KPI": `Inscripciones Totales en ${z.nombreZona}`,
          "Valor": z.total
        });
        kpisData.push({
          "Métrica / KPI": `Tasa Asignación en ${z.nombreZona}`,
          "Valor": `${z.tasaAsignacion}%`
        });
        kpisData.push({
          "Métrica / KPI": `Cancelaciones Manuales en ${z.nombreZona}`,
          "Valor": z.canceladosManual
        });
        kpisData.push({
          "Métrica / KPI": `Expiraciones Sistema en ${z.nombreZona}`,
          "Valor": z.canceladosSistema
        });
      });

      const historyExport = (listaesperaData.historial || []).map((item: any) => ({
        "Nombre Empleado": item.nombreEmpleado,
        "RUT Empleado": item.rutEmpleado,
        "Zona Solicitada": item.nombreZona,
        "Fecha Inscripción": item.fechaHoraInscripcion,
        "Fecha Inicio Rango": item.fechaInicio,
        "Fecha Fin Rango": item.fechaFin,
        "Estado Final": item.estado,
        "ID Reserva Asignada": item.idReservaGenerada
      }));

      const worksheetKpis = XLSX.utils.json_to_sheet(kpisData);
      const worksheetHistory = XLSX.utils.json_to_sheet(historyExport);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheetKpis, "Métricas de Espera");
      XLSX.utils.book_append_sheet(workbook, worksheetHistory, "Detalle Historial");

      XLSX.writeFile(workbook, `Reporte_ListaEspera_Nutripark_${selectedMonth}.xlsx`);
    } else if (activeTab === 'visitas') {
      const kpisData = [
        { "Métrica / KPI": "Total Solicitudes de Visitas", "Valor": visitasData.kpis.totalVisitas },
        { "Métrica / KPI": "Tasa de Aprobación", "Valor": visitasData.kpis.tasaAprobacion },
        { "Métrica / KPI": "Visitas Aprobadas", "Valor": visitasData.kpis.visitasAprobadas },
        { "Métrica / KPI": "Visitas Rechazadas", "Valor": visitasData.kpis.visitasRechazadas },
        { "Métrica / KPI": "Visitas Pendientes de Aprobación", "Valor": visitasData.kpis.visitasPendientes },
        { "Métrica / KPI": "Visitas Finalizadas", "Valor": visitasData.kpis.visitasFinalizadas }
      ];

      const rankingAnfitrionesExport = (visitasData.rankingAnfitriones || []).map((h: any) => ({
        "Nombre Anfitrión": h.nombre,
        "RUT Anfitrión": h.rut,
        "Cantidad de Solicitudes": h.cantidad
      }));

      const rankingZonasExport = (visitasData.rankingZonas || []).map((z: any) => ({
        "Zona": z.nombreZona,
        "Cantidad Aprobada y Finalizada": z.cantidad
      }));

      const historyExport = (visitasData.historial || []).map((item: any) => ({
        "Nombre Visitante": item.nombreVisitante,
        "RUT Visitante": item.rutVisitante,
        "Patente / Matrícula": item.matricula,
        "Nombre Anfitrión": item.nombreAnfitrion,
        "RUT Anfitrión": item.rutAnfitrion,
        "Número de Calzo": item.numCalzo,
        "Zona": item.nombreZona,
        "Fecha Entrada Programada": item.fechaEntrada,
        "Fecha Salida Programada": item.fechaSalida,
        "Estado Solicitud": item.estadoVisita,
        "Estado Operativo": item.estadoOperativo || '-'
      }));

      const worksheetKpis = XLSX.utils.json_to_sheet(kpisData);
      const worksheetHosts = XLSX.utils.json_to_sheet(rankingAnfitrionesExport);
      const worksheetZonas = XLSX.utils.json_to_sheet(rankingZonasExport);
      const worksheetHistory = XLSX.utils.json_to_sheet(historyExport);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheetKpis, "Resumen e Indicadores");
      XLSX.utils.book_append_sheet(workbook, worksheetHosts, "Ranking de Anfitriones");
      XLSX.utils.book_append_sheet(workbook, worksheetZonas, "Ranking de Zonas");
      XLSX.utils.book_append_sheet(workbook, worksheetHistory, "Historial Completo");

      XLSX.writeFile(workbook, `Reporte_Visitas_Nutripark_${selectedMonth}.xlsx`);
    } else if (activeTab === 'conducta') {
      const kpisData = [
        { "Métrica / KPI": "Reservas Totales Realizadas", "Valor": conductaData.kpis.totalReservas },
        { "Métrica / KPI": "Inasistencias (Ausencias sin Liberación)", "Valor": conductaData.kpis.totalNoShows },
        { "Métrica / KPI": "Tasa Global de Inasistencias", "Valor": conductaData.kpis.tasaNoShow },
        { "Métrica / KPI": "Inasistencias en Calzos Fijos", "Valor": conductaData.kpis.noShowsCalzosFijos },
        { "Métrica / KPI": "Liberaciones Manuales (Anticipadas)", "Valor": conductaData.kpis.totalLiberaciones },
        { "Métrica / KPI": "Reservas Asistidas (Ocupadas Real)", "Valor": conductaData.kpis.totalAsistidas },
        { "Métrica / KPI": "Total de Calzos en Planta", "Valor": conductaData.kpis.totalCalzos || 0 },
        { "Métrica / KPI": "Calzos Fijos Asignados", "Valor": conductaData.kpis.totalCalzosFijos || 0 },
        { "Métrica / KPI": "Tasa de Asignación Fija", "Valor": conductaData.kpis.porcentajeCalzosFijos || "0.0%" }
      ];

      // Calcular ranking completo de empleados con inasistencias ordenados de mayor a menor
      const map = new Map<string, any>();
      if (conductaData.empleados && conductaData.empleados.length > 0) {
        conductaData.empleados.forEach((emp: any) => {
          map.set(emp.rut, {
            rut: emp.rut,
            nombre: emp.nombre,
            cargo: emp.cargo,
            idCalzo: emp.idCalzoFijo,
            totalInasistencias: 0
          });
        });
      } else {
        (conductaData.historial || []).forEach((item: any) => {
          const key = item.rut;
          if (!map.has(key)) {
            map.set(key, {
              rut: item.rut,
              nombre: item.nombre,
              cargo: item.cargo,
              idCalzo: item.idCalzoFijo,
              totalInasistencias: 0
            });
          }
        });
      }

      (conductaData.historial || []).forEach((item: any) => {
        const employee = map.get(item.rut);
        if (employee) {
          if (item.estadoReserva === 'Cancelada' && item.tipoLiberacion !== 'Manual') {
            employee.totalInasistencias++;
          }
        }
      });

      const completeRanking = Array.from(map.values()).sort((a, b) => {
        if (b.totalInasistencias !== a.totalInasistencias) {
          return b.totalInasistencias - a.totalInasistencias;
        }
        return a.nombre.localeCompare(b.nombre);
      });

      const rankingExport = completeRanking.map((item: any, idx: number) => ({
        "Posición": `#${idx + 1}`,
        "Nombre Empleado": item.nombre,
        "RUT Empleado": item.rut,
        "Cargo": item.cargo,
        "Calzo Asignado": item.idCalzo ? getCalzoFullLabel(item.idCalzo) : 'Sin calzo asignado',
        "Inasistencias Registradas": item.totalInasistencias
      }));

      // Filtrar reservas que NO estén en estado 'Pendiente' para el historial detallado
      const historialFiltrado = (conductaData.historial || []).filter((item: any) => item.estadoReserva !== 'Pendiente');

      const historialExport = historialFiltrado.map((item: any) => {
        let estadoTxt = item.estadoReserva;
        if (item.fechaEntradaReal || item.estadoReserva === 'Finalizada') {
          estadoTxt = 'Asistida';
        }

        let detalleTxt = '-';
        if (item.fechaEntradaReal || item.estadoReserva === 'Finalizada') {
          detalleTxt = `Entró ${new Date(item.fechaEntradaReal || item.fechaEntrada).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (item.estadoReserva === 'Cancelada') {
          if (item.tipoLiberacion === 'No Asistió (Fijo)') {
            detalleTxt = 'Inasistencia (Fijo)';
          } else if (item.tipoLiberacion === 'Sistema') {
            detalleTxt = 'Inasistencia (Sistema)';
          } else if (item.tipoLiberacion === 'Manual') {
            detalleTxt = 'Liberación Manual';
          } else {
            detalleTxt = item.tipoLiberacion || 'Cancelada';
          }
        }

        return {
          "Nombre Empleado": item.nombre,
          "RUT Empleado": item.rut,
          "Cargo": item.cargo,
          "Calzo Reservado": getCalzoFullLabel(item.idCalzo),
          "Fecha Reserva": new Date(item.fechaEntrada).toLocaleDateString('es-CL'),
          "Estado Reserva": estadoTxt,
          "Detalle / Acción": detalleTxt
        };
      });

      const worksheetKpis = XLSX.utils.json_to_sheet(kpisData);
      const worksheetRanking = XLSX.utils.json_to_sheet(rankingExport);
      const worksheetHistorial = XLSX.utils.json_to_sheet(historialExport);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheetKpis, "Resumen Conducta");
      XLSX.utils.book_append_sheet(workbook, worksheetRanking, "Ranking Inasistencias");
      XLSX.utils.book_append_sheet(workbook, worksheetHistorial, "Historial de Conducta");

      XLSX.writeFile(workbook, `Reporte_Conducta_Nutripark_${selectedMonth}.xlsx`);
    } else {
      alert("La exportación para esta pestaña no está disponible.");
    }
  };

  return (
    <div className="page-content space-y-4 sm:space-y-6">

      {/* HEADER DE LA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-card)] p-4 sm:p-6 rounded-3xl shadow-sm border border-[var(--border-color)]">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] uppercase tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
            <PieChart className="text-orange-500 shrink-0" size={28} />
            Reportes y Estadísticas
          </h2>
          <p className="text-[var(--text-muted)] mt-1 sm:ml-11 font-medium text-sm sm:text-base">
            {getSubTitleText()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Month Picker con Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setPickerYear(parseInt(selectedMonth.split('-')[0]));
                setShowPicker(!showPicker);
              }}
              className="flex items-center pl-3 pr-4 py-2.5 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/50 rounded-xl transition-all hover:bg-orange-100 dark:hover:bg-orange-900/20 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <Calendar className="h-5 w-5 text-orange-500 mr-2" />
              <span className="text-sm font-bold text-orange-700 dark:text-orange-400 capitalize">
                {(() => {
                  const [year, month] = selectedMonth.split('-');
                  const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
                  const monthName = dateObj.toLocaleDateString('es-ES', { month: 'long' });
                  return `${monthName} ${year}`;
                })()}
              </span>
            </button>

            {showPicker && (
              <>
                {/* Overlay to close on click outside */}
                <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)}></div>

                {/* Popover */}
                <div className="absolute top-full right-0 md:left-0 md:right-auto mt-2 w-64 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-2xl shadow-xl z-50 p-4 animate-fade-in">
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setPickerYear(y => y - 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg transition-colors">
                      <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <span className="font-black text-lg text-[var(--text-main)]">{pickerYear}</span>
                    <button
                      onClick={() => setPickerYear(y => y + 1)}
                      disabled={pickerYear >= today.getFullYear()}
                      className={`p-1 rounded-lg transition-colors ${pickerYear >= today.getFullYear() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-[#333]'}`}
                    >
                      <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {monthsList.map((m, idx) => {
                      const monthNum = String(idx + 1).padStart(2, '0');
                      const monthVal = `${pickerYear}-${monthNum}`;
                      const isSelected = selectedMonth === monthVal;
                      const isFuture = pickerYear === today.getFullYear() && idx > today.getMonth();

                      return (
                        <button
                          key={m}
                          disabled={isFuture}
                          onClick={() => {
                            setSelectedMonth(monthVal);
                            setShowPicker(false);
                          }}
                          className={`py-2 rounded-xl text-sm font-semibold transition-all ${isSelected
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                            : isFuture
                              ? 'bg-gray-50 text-gray-300 dark:bg-[#111] dark:text-gray-600 cursor-not-allowed'
                              : 'bg-gray-50 text-gray-700 hover:bg-orange-100 hover:text-orange-700 dark:bg-[#222] dark:text-gray-300 dark:hover:bg-orange-900/30'
                            }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#333] flex justify-center">
                    <button
                      onClick={() => {
                        setSelectedMonth(currentMonthString);
                        setPickerYear(today.getFullYear());
                        setShowPicker(false);
                      }}
                      className="text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors"
                    >
                      Ir al mes actual
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="h-8 w-px bg-gray-200 dark:bg-[#333] mx-1 hidden md:block"></div>

          {/* Botones de Exportación */}
          <button onClick={exportToPDF} className="flex items-center px-4 py-2 bg-white dark:bg-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#333] border border-gray-200 dark:border-[#444] rounded-xl text-sm font-semibold transition-all shadow-sm text-gray-700 dark:text-gray-300">
            <FileText size={16} className="mr-2 text-red-500" />
            PDF
          </button>
          <button onClick={exportToExcel} className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
            <Download size={16} className="mr-2" />
            Excel
          </button>
        </div>
      </div>

      {/* NAVEGACIÓN DE TABS */}
      <div className="flex overflow-x-auto hide-scrollbar space-x-2 bg-[var(--bg-card)] p-2 rounded-2xl shadow-sm border border-[var(--border-color)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-5 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
              ? 'bg-orange-500 text-white shadow-md'
              : 'text-[var(--text-muted)] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] hover:text-[var(--text-main)]'
              }`}
          >
            <tab.icon size={18} className="mr-2" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="relative min-h-[500px]">
        {loading && <PageLoader message="Generando visualizaciones..." />}

        {!loading && activeTab === 'auditoria' && (
          <div className="space-y-6 animate-fade-in">
            {/* Gráfico de Tendencia de Actividad por Día */}
            {activityTrend.length > 0 && (
              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)]">
                <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center">
                  <Activity className="mr-2 text-orange-500 animate-pulse" /> Tendencia de Actividad (Operaciones por Día)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height={260} minWidth={0}>
                    <AreaChart data={activityTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorOperaciones" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F97316" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#F97316" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="dia" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }} />
                      <Area type="monotone" dataKey="operaciones" stroke="#F97316" strokeWidth={3} fillOpacity={1} fill="url(#colorOperaciones)" name="Operaciones" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center">
                    <Shield className="mr-2 text-orange-500" /> Registro de Actividad del Sistema
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] font-medium">Buzón de auditoría con operaciones y transacciones administrativas registradas.</p>
                </div>

                {/* Filtros de Tabla */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Buscador */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Buscar por usuario o detalle..."
                      value={auditoriaSearch}
                      onChange={(e) => setAuditoriaSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-[var(--bg-body)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500 w-60 font-medium"
                    />
                  </div>

                  {/* Selector de Acciones */}
                  <select
                    value={auditoriaFilterAccion}
                    onChange={(e) => setAuditoriaFilterAccion(e.target.value)}
                    className="px-3 py-2 bg-[var(--bg-body)] dark:bg-[#2a2a2a] border border-[var(--border-color)] dark:border-[#444] rounded-xl text-sm text-[var(--text-main)] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium cursor-pointer [&_option]:dark:bg-[#2a2a2a] [&_option]:dark:text-gray-100"
                  >
                    <option value="todos">Todas las Acciones</option>
                    {uniqueAcciones.map((acc) => (
                      <option key={acc} value={acc}>{acc.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contenedor de Tabla */}
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-orange-500/10 border-b border-[var(--border-color)]">
                        <th className="p-4 font-bold text-orange-500 text-sm whitespace-nowrap">Fecha y Hora</th>
                        <th className="p-4 font-bold text-orange-500 text-sm whitespace-nowrap">Usuario</th>
                        <th className="p-4 font-bold text-orange-500 text-sm whitespace-nowrap">Acción</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Detalles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
                      {paginatedAuditoria.length > 0 ? (
                        paginatedAuditoria.map((item: any) => (
                          <tr key={item.idAuditoria} className="hover:bg-orange-500/5 transition-colors text-sm">
                            <td className="p-4 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">
                              {new Date(item.fechaHora).toLocaleString('es-CL')}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className="font-semibold block">{item.nombreUsuario}</span>
                              <span className="block text-xs text-[var(--text-muted)] font-medium">{item.rutUsuario}</span>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className="bg-orange-500/10 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-extrabold inline-block border border-orange-500/20">
                                {item.accion.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-4 text-xs font-medium text-[var(--text-muted)] max-w-md break-words">
                              {formatDetalle(item.accion, item.detalle)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-[var(--text-muted)] font-medium">
                            No se encontraron registros de auditoría para esta búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginación */}
              {totalAuditoriaPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    Mostrando página {auditoriaPage} de {totalAuditoriaPages} ({filteredAuditoria.length} registros en total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={auditoriaPage === 1}
                      onClick={() => setAuditoriaPage(p => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-orange-500/10 hover:text-orange-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      disabled={auditoriaPage === totalAuditoriaPages}
                      onClick={() => setAuditoriaPage(p => Math.min(totalAuditoriaPages, p + 1))}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-orange-500/10 hover:text-orange-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && activeTab === 'ocupacion' && (
          <div className="space-y-6 animate-fade-in">
            {/* Tarjetas de Métricas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {dynamicOcupacionKpis.map((card, idx) => (
                <div key={idx} className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] flex items-center">
                  <div className={`p-4 rounded-2xl ${card.bg} mr-4`}>
                    <card.icon className={card.color} size={28} />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)] font-medium">{card.title}</p>
                    <p className="text-2xl font-black text-[var(--text-main)]">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Gráfico de Barras: Tasa de Ocupación por Zona */}
            {Object.keys(ocupacionData.ocupacionPorZona || {}).length > 0 && (
              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)]">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center">
                    <BarChart2 className="mr-2 text-orange-500" size={20} />
                    Tasa de Ocupación Promedio por Zona
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">
                    Porcentaje de días en que cada zona tuvo al menos una reserva física completada.
                  </p>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height={260} minWidth={0}>
                    <BarChart
                      data={Object.entries(ocupacionData.ocupacionPorZona).map(([zona, rate]) => ({ zona, tasa: rate }))}
                      margin={{ top: 5, right: 20, left: -10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis
                        dataKey="zona"
                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        unit="%"
                        domain={[0, 'auto']}
                      />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }}
                        formatter={(value: any) => [`${value}%`, 'Tasa de Ocupación']}
                      />
                      <Bar dataKey="tasa" radius={[8, 8, 0, 0]} maxBarSize={64}>
                        {Object.entries(ocupacionData.ocupacionPorZona).map(([zona], index) => (
                          <Cell key={zona} fill={getZoneColor(zona, index)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Gráfico Principal: Mapa de Calor de Ocupación */}
            <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-main)]">Mapa de Calor: Ocupación por Hora (%)</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">Visualización de la densidad de ocupación por zona y hora. Pasa el cursor sobre las celdas para ver detalles.</p>
              </div>

              <div className="w-full">
                {ocupacionData.ocupacionHoraPunta && ocupacionData.ocupacionHoraPunta.length > 0 ? (
                  <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                    <div className="min-w-[900px] space-y-4 pr-4">
                      {/* Cabecera de Horas */}
                      <div className="flex items-center border-b border-[var(--border-color)] pb-2 text-[var(--text-muted)] text-xs font-bold">
                        <div className="w-48 flex-shrink-0 text-left pl-2">ZONA / HORA</div>
                        <div className="flex-1 gap-1 text-center" style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                          {Array.from({ length: 24 }).map((_, h) => (
                            <div key={h} className="text-[10px] whitespace-nowrap">
                              {String(h).padStart(2, '0')}:00
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Filas de Zonas */}
                      <div className="space-y-3">
                        {zoneKeys.map((zone, zIdx) => {
                          const color = getZoneColor(zone, zIdx);
                          
                          // Parsear hex a RGB
                          const r = parseInt(color.substring(1, 3), 16);
                          const g = parseInt(color.substring(3, 5), 16);
                          const b = parseInt(color.substring(5, 7), 16);

                          return (
                            <div key={zone} className="flex items-center">
                              {/* Nombre de la Zona */}
                              <div className="w-48 flex-shrink-0 flex items-center pr-4">
                                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></span>
                                <span className="text-xs font-bold text-[var(--text-main)] truncate" title={zone}>
                                  {zone}
                                </span>
                              </div>

                              {/* Celdas de 24 horas */}
                              <div className="flex-1 gap-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                                {ocupacionData.ocupacionHoraPunta.map((hourData: any, h: number) => {
                                  const pct = hourData[zone] || 0;
                                  
                                  // Opacidad escalada: resalta de forma sutil las ocupaciones bajas
                                  const opacity = pct > 0 ? Math.min(1.0, 0.2 + (pct / 100) * 0.8) : 0.05;
                                  const cellBg = pct > 0 
                                    ? `rgba(${r}, ${g}, ${b}, ${opacity})`
                                    : 'rgba(150, 150, 150, 0.05)';
                                  const cellBorder = pct > 0
                                    ? `1px solid rgba(${r}, ${g}, ${b}, 0.4)`
                                    : '1px solid var(--border-color)';

                                  return (
                                    <div
                                      key={h}
                                      className="group relative h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105 cursor-help"
                                      style={{ 
                                        backgroundColor: cellBg,
                                        border: cellBorder,
                                      }}
                                    >
                                      {/* Valor de porcentaje sutil */}
                                      {pct > 0 && (
                                        <span className="text-[9px] font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                                          {pct}%
                                        </span>
                                      )}

                                      {/* Tooltip Premium */}
                                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 bg-gray-900 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap pointer-events-none transform -translate-x-1/2 left-1/2">
                                        <span className="text-orange-400">{zone}</span> a las {hourData.hora}
                                        <div className="text-white font-extrabold text-center mt-0.5">Ocupación: {pct}%</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-[var(--text-muted)] font-medium py-12">
                    No hay registros de ocupación para graficar en este período.
                  </div>
                )}
              </div>
            </div>

            {/* Historial de Uso Físico Real */}
            <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)]">Historial de Uso Físico Real del Mes</h3>
                  <p className="text-sm text-[var(--text-muted)] font-medium">Listado completo de todas las reservas que registraron escaneo QR de ingreso en portería.</p>
                </div>

                {/* Filtros de Tabla */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Buscador */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Buscar por RUT o Nombre..."
                      value={ocupacionSearch}
                      onChange={(e) => setOcupacionSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-[var(--bg-body)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500 w-60 font-medium"
                    />
                  </div>

                  {/* Selector de Zona */}
                  <select
                    value={ocupacionFilterZona}
                    onChange={(e) => setOcupacionFilterZona(e.target.value)}
                    className="px-3 py-2 bg-[var(--bg-body)] dark:bg-[#2a2a2a] border border-[var(--border-color)] dark:border-[#444] rounded-xl text-sm text-[var(--text-main)] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium cursor-pointer [&_option]:dark:bg-[#2a2a2a] [&_option]:dark:text-gray-100"
                  >
                    <option value="todos">Todas las Zonas</option>
                    {zoneKeys.map((zoneName: string) => (
                      <option key={zoneName} value={zoneName}>{zoneName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contenedor de Tabla */}
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-orange-500/10 border-b border-[var(--border-color)]">
                        <th className="p-4 font-bold text-orange-500 text-sm">Empleado</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Calzo y Zona</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Entrada Real</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Salida Real</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Duración</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
                      {paginatedOcupacion.length > 0 ? (
                        paginatedOcupacion.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-orange-500/5 transition-colors text-sm">
                            <td className="p-4">
                              <span className="font-semibold block">{item.nombreEmpleado}</span>
                              <span className="block text-xs text-[var(--text-muted)] font-medium">{item.rutEmpleado}</span>
                            </td>
                            <td className="p-4 font-medium">{getCalzoFullLabel(item.idCalzo)}</td>
                            <td className="p-4 text-xs font-semibold text-green-500">{item.fechaEntradaReal}</td>
                            <td className="p-4 text-xs font-semibold text-orange-500">{item.fechaSalidaReal}</td>
                            <td className="p-4 text-xs font-bold text-blue-500">{item.duracion}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-[var(--text-muted)] font-medium">
                            No se encontraron registros de uso físico real para esta búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginación */}
              {totalOcupacionPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    Mostrando página {ocupacionPage} de {totalOcupacionPages} ({filteredOcupacion.length} registros en total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={ocupacionPage === 1}
                      onClick={() => setOcupacionPage(p => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-orange-500/10 hover:text-orange-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      disabled={ocupacionPage === totalOcupacionPages}
                      onClick={() => setOcupacionPage(p => Math.min(totalOcupacionPages, p + 1))}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-orange-500/10 hover:text-orange-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && activeTab === 'espera' && (
          <div className="space-y-6 animate-fade-in">
            {/* Tarjetas de KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] flex items-center">
                <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/30 mr-4">
                  <Users className="text-orange-500" size={28} />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] font-medium">Inscripciones Totales</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{listaesperaData.kpis.totalInscripciones}</p>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] flex items-center">
                <div className="p-4 rounded-2xl bg-green-100 dark:bg-green-900/30 mr-4">
                  <CheckCircle2 className="text-green-500" size={28} />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] font-medium">Tasa de Asignación (Éxito)</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{listaesperaData.kpis.tasaAsignacionGlobal}</p>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] flex items-center">
                <div className="p-4 rounded-2xl bg-red-100 dark:bg-red-900/30 mr-4">
                  <AlertTriangle className="text-red-500" size={28} />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] font-medium">Tasa de Abandono Total</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">
                    {Math.min(100, (parseInt(listaesperaData.kpis.tasaAbandonoManual) || 0) + (parseInt(listaesperaData.kpis.tasaAbandonoSistema) || 0))}%
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 font-bold">
                    Manual: {listaesperaData.kpis.tasaAbandonoManual} | Expirada: {listaesperaData.kpis.tasaAbandonoSistema}
                  </p>
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="w-full">
              {/* Gráfico de Barras Apilado */}
              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[var(--text-main)]">Actividad de Lista de Espera por Zona</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">Comparativa del volumen de solicitudes y su resolución (asignado, cancelado o expirado) por zona.</p>
                </div>
                <div className="h-[350px] w-full mt-auto">
                  {listaesperaData.desgloseZonas && listaesperaData.desgloseZonas.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350} minWidth={0}>
                      <BarChart data={listaesperaData.desgloseZonas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="nombreZona" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }} />
                        <Legend iconType="circle" />
                        <Bar dataKey="asignados" stackId="a" fill="#10B981" name="Asignadas (Éxito)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="canceladosManual" stackId="a" fill="#3B82F6" name="Canceladas Manual" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="canceladosSistema" stackId="a" fill="#EF4444" name="Expiradas por Sistema" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)] font-medium">
                      Sin datos para graficar.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla de Historial Detallado */}
            <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)]">Historial Detallado de Lista de Espera</h3>
                  <p className="text-sm text-[var(--text-muted)] font-medium">Listado de todas las solicitudes inscritas en lista de espera durante el mes.</p>
                </div>

                {/* Filtros de Tabla */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Buscador */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Buscar por RUT o Nombre..."
                      value={waitlistSearch}
                      onChange={(e) => setWaitlistSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-[var(--bg-body)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500 w-60 font-medium"
                    />
                  </div>

                  {/* Selector de Estado */}
                  <select
                    value={waitlistFilterEstado}
                    onChange={(e) => setWaitlistFilterEstado(e.target.value)}
                    className="px-3 py-2 bg-[var(--bg-body)] dark:bg-[#2a2a2a] border border-[var(--border-color)] dark:border-[#444] rounded-xl text-sm text-[var(--text-main)] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium cursor-pointer [&_option]:dark:bg-[#2a2a2a] [&_option]:dark:text-gray-100"
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="asignado">Asignado (Auto)</option>
                    <option value="completada">Completada (Portero)</option>
                    <option value="cancelada">Cancelada (Empleado)</option>
                    <option value="expirada">Expirada (Sistema)</option>
                  </select>
                </div>
              </div>

              {/* Contenedor de Tabla */}
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-orange-500/10 border-b border-[var(--border-color)]">
                        <th className="p-4 font-bold text-orange-500 text-sm">Empleado</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Zona</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Fecha Inscripción</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Rango Solicitado</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Estado</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Reserva</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
                      {paginatedWaitlist.length > 0 ? (
                        paginatedWaitlist.map((item: any) => (
                          <tr key={item.idEspera} className="hover:bg-orange-500/5 transition-colors text-sm">
                            <td className="p-4">
                              <span className="font-semibold block">{item.nombreEmpleado}</span>
                              <span className="block text-xs text-[var(--text-muted)] font-medium">{item.rutEmpleado}</span>
                            </td>
                            <td className="p-4 font-semibold">{item.nombreZona}</td>
                            <td className="p-4 text-xs font-semibold text-[var(--text-muted)]">{item.fechaHoraInscripcion}</td>
                            <td className="p-4 text-xs font-semibold">
                              <span className="block text-blue-500">{item.fechaInicio.split(' ')[1] || item.fechaInicio}</span>
                              <span className="block text-orange-500">{item.fechaFin.split(' ')[1] || item.fechaFin}</span>
                            </td>
                            <td className="p-4">
                              {(() => {
                                let badgeClass = '';
                                let labelText = item.estado;
                                if (item.estado === 'Pendiente') {
                                  badgeClass = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
                                } else if (item.estado === 'Asignado') {
                                  badgeClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
                                  labelText = 'Asignado (Auto)';
                                } else if (item.estado === 'Completada') {
                                  badgeClass = 'bg-green-500/10 text-green-600 border-green-500/20';
                                  labelText = 'Completada (Portero)';
                                } else if (item.estado === 'Cancelada') {
                                  badgeClass = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
                                  labelText = 'Cancelada (Empleado)';
                                } else if (item.estado === 'Expirada') {
                                  badgeClass = 'bg-rose-500/10 text-rose-600 border-rose-500/20';
                                  labelText = 'Expirada (Sistema)';
                                }
                                return (
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${badgeClass}`}>
                                    {labelText}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="p-4 text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
                              {item.idReservaGenerada !== '-' ? `#${item.idReservaGenerada}` : '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[var(--text-muted)] font-medium">
                            No se encontraron registros de lista de espera para esta búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginación */}
              {totalWaitlistPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    Mostrando página {waitlistPage} de {totalWaitlistPages} ({filteredWaitlist.length} registros en total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={waitlistPage === 1}
                      onClick={() => setWaitlistPage(p => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-orange-500/10 hover:text-orange-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      disabled={waitlistPage === totalWaitlistPages}
                      onClick={() => setWaitlistPage(p => Math.min(totalWaitlistPages, p + 1))}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-orange-500/10 hover:text-orange-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && activeTab === 'visitas' && (
          <div className="space-y-6 animate-fade-in">
            {/* Tarjetas de KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] flex items-center">
                <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/30 mr-4">
                  <Users className="text-orange-500" size={28} />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] font-medium">Total Solicitudes</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{visitasData.kpis.totalVisitas}</p>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] flex items-center">
                <div className="p-4 rounded-2xl bg-green-100 dark:bg-green-900/30 mr-4">
                  <CheckCircle2 className="text-green-500" size={28} />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] font-medium">Tasa de Aprobación</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{visitasData.kpis.tasaAprobacion}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 font-bold">
                    Aprobadas: {visitasData.kpis.visitasAprobadas} | Rechazadas: {visitasData.kpis.visitasRechazadas}
                  </p>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] flex items-center">
                <div className="p-4 rounded-2xl bg-blue-100 dark:bg-blue-900/30 mr-4">
                  <Activity className="text-blue-500" size={28} />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] font-medium">Flujo Operativo (Visitas)</p>
                  <p className="text-lg font-black text-[var(--text-main)]">
                    En Planta: {visitasData.kpis.visitasEnPlanta}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 font-bold">
                    Completadas/Finalizadas: {visitasData.kpis.visitasFinalizadas}
                  </p>
                </div>
              </div>
            </div>

            {/* Gráficos de Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ranking de Anfitriones */}
              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[var(--text-main)]">Top Anfitriones (Empleados)</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">Ranking de colaboradores que registran la mayor cantidad de solicitudes de visitas.</p>
                </div>
                <div className="h-[300px] w-full mt-auto">
                  {visitasData.rankingAnfitriones && visitasData.rankingAnfitriones.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={visitasData.rankingAnfitriones} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                        <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="nombre" tick={{ fill: 'var(--text-main)', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} width={110} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }} />
                        <Bar dataKey="cantidad" fill="#F97316" radius={[0, 8, 8, 0]} name="Solicitudes" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)] font-medium">
                      Sin datos para graficar.
                    </div>
                  )}
                </div>
              </div>

              {/* Ranking de Zonas */}
              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[var(--text-main)]">Ranking por Zona</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">Zonas con mayor volumen de visitas aprobadas y finalizadas.</p>
                </div>
                <div className="h-[300px] w-full mt-auto">
                  {visitasData.rankingZonas && visitasData.rankingZonas.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={visitasData.rankingZonas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="nombreZona" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} interval={0} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }} />
                        <Bar dataKey="cantidad" fill="#3B82F6" radius={[8, 8, 0, 0]} name="Aprobadas y Finalizadas" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)] font-medium">
                      Sin datos para graficar.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla de Historial */}
            <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)]">Registro de Visitas Externas</h3>
                  <p className="text-sm text-[var(--text-muted)] font-medium">Historial completo de solicitudes de ingreso para visitas y proveedores.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Buscador */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Buscar por visitante o anfitrión..."
                      value={visitasSearch}
                      onChange={(e) => setVisitasSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-[var(--bg-body)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500 w-60 font-medium"
                    />
                  </div>

                  {/* Filtro Estado Solicitud */}
                  <select
                    value={visitasFilterEstado}
                    onChange={(e) => setVisitasFilterEstado(e.target.value)}
                    className="px-3 py-2 bg-[var(--bg-body)] dark:bg-[#2a2a2a] border border-[var(--border-color)] dark:border-[#444] rounded-xl text-sm text-[var(--text-main)] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium cursor-pointer [&_option]:dark:bg-[#2a2a2a] [&_option]:dark:text-gray-100"
                  >
                    <option value="todos">Estados de Solicitud</option>
                    <option value="aprobada">Aprobada</option>
                    <option value="rechazada">Rechazada</option>
                    <option value="pendiente">Pendiente</option>
                  </select>

                  {/* Filtro Operativo */}
                  <select
                    value={visitasFilterOperativo}
                    onChange={(e) => setVisitasFilterOperativo(e.target.value)}
                    className="px-3 py-2 bg-[var(--bg-body)] dark:bg-[#2a2a2a] border border-[var(--border-color)] dark:border-[#444] rounded-xl text-sm text-[var(--text-main)] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium cursor-pointer [&_option]:dark:bg-[#2a2a2a] [&_option]:dark:text-gray-100"
                  >
                    <option value="todos">Flujos Operativos</option>
                    <option value="esperando">Esperando</option>
                    <option value="en planta">En Planta</option>
                    <option value="finalizada">Finalizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Contenedor de Tabla */}
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-orange-500/10 border-b border-[var(--border-color)]">
                        <th className="p-4 font-bold text-orange-500 text-sm">Visitante</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Anfitrión</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Calzo</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Horario Programado</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Estado Solicitud</th>
                        <th className="p-4 font-bold text-orange-500 text-sm">Flujo Operativo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
                      {paginatedVisitas.length > 0 ? (
                        paginatedVisitas.map((item: any) => (
                          <tr key={item.idVisita} className="hover:bg-orange-500/5 transition-colors text-sm">
                            <td className="p-4">
                              <span className="font-semibold block">{item.nombreVisitante}</span>
                              <span className="block text-xs text-[var(--text-muted)] font-medium">RUT: {item.rutVisitante}</span>
                              <span className="block text-xs text-blue-500 font-bold mt-0.5">Matrícula: {item.matricula}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-semibold block">{item.nombreAnfitrion}</span>
                              <span className="block text-xs text-[var(--text-muted)] font-medium">RUT: {item.rutAnfitrion}</span>
                            </td>
                            <td className="p-4">
                              {item.idCalzo !== '-' ? (
                                <span className="font-semibold block">{getCalzoFullLabel(item.idCalzo)}</span>
                              ) : (
                                <span className="text-[var(--text-muted)]">-</span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-semibold">
                              <span className="block text-blue-500">Entrada: {item.fechaEntrada}</span>
                              <span className="block text-orange-500">Salida: {item.fechaSalida}</span>
                            </td>
                            <td className="p-4">
                              {(() => {
                                let badgeClass = '';
                                if (item.estadoVisita === 'Aprobada') {
                                  badgeClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
                                } else if (item.estadoVisita === 'Rechazada') {
                                  badgeClass = 'bg-rose-500/10 text-rose-600 border-rose-500/20';
                                } else if (item.estadoVisita === 'Pendiente') {
                                  badgeClass = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
                                }
                                return (
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${badgeClass}`}>
                                    {item.estadoVisita}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="p-4">
                              {(() => {
                                let badgeClass = 'bg-gray-500/10 text-gray-600 border-gray-500/20';
                                if (item.estadoOperativo === 'Esperando') {
                                  badgeClass = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
                                } else if (item.estadoOperativo === 'En Planta') {
                                  badgeClass = 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
                                } else if (item.estadoOperativo === 'Finalizada') {
                                  badgeClass = 'bg-green-500/10 text-green-600 border-green-500/20';
                                } else if (item.estadoOperativo === 'Cancelada') {
                                  badgeClass = 'bg-gray-500/10 text-gray-600 border-gray-500/20';
                                } else if (item.estadoOperativo === 'Rechazada') {
                                  badgeClass = 'bg-rose-500/10 text-rose-600 border-rose-500/20';
                                }
                                return (
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${badgeClass}`}>
                                    {item.estadoOperativo || '-'}
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[var(--text-muted)] font-medium">
                            No se encontraron registros de visitas para esta búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginación */}
              {totalVisitasPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    Mostrando página {visitasPage} de {totalVisitasPages} ({filteredVisitas.length} registros en total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={visitasPage === 1}
                      onClick={() => setVisitasPage(p => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-orange-500/10 hover:text-orange-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      disabled={visitasPage === totalVisitasPages}
                      onClick={() => setVisitasPage(p => Math.min(totalVisitasPages, p + 1))}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-orange-500/10 hover:text-orange-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && activeTab === 'conducta' && (
          <div className="space-y-6 animate-fade-in">
            {/* Tarjetas de KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-4">
              {/* Fila 1 */}
              <div className="bg-[var(--bg-card)] p-5 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col gap-3">
                <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-500 w-fit">
                  <Calendar size={22} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium leading-snug">Reservas Totales</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{conductaData.kpis.totalReservas}</p>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] p-5 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col gap-3">
                <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-500 w-fit">
                  <UserX size={22} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium leading-snug">Inasistencias Totales</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{conductaData.kpis.totalNoShows}</p>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] p-5 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col gap-3">
                <div className="p-3 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-500 w-fit">
                  <Activity size={22} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium leading-snug">Tasa de Inasistencias</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{conductaData.kpis.tasaNoShow}</p>
                </div>
              </div>

              {/* Fila 2 */}
              <div className="bg-[var(--bg-card)] p-5 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col gap-3">
                <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-500 w-fit">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium leading-snug">Inasistencias Fijos</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{conductaData.kpis.noShowsCalzosFijos}</p>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] p-5 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col gap-3">
                <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 w-fit">
                  <Unlock size={22} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium leading-snug">Liberaciones</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{conductaData.kpis.totalLiberaciones}</p>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] p-5 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col gap-3">
                <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 w-fit">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium leading-snug">Asistidas</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{conductaData.kpis.totalAsistidas}</p>
                </div>
              </div>

              {/* Fila 3 — Métricas de Calzos */}
              <div className="bg-[var(--bg-card)] p-5 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col gap-3">
                <div className="p-3 rounded-2xl bg-sky-100 dark:bg-sky-900/30 text-sky-500 w-fit">
                  <Activity size={22} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium leading-snug">Total Calzos en Planta</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{conductaData.kpis.totalCalzos || 0}</p>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] p-5 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col gap-3">
                <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-500 w-fit">
                  <Award size={22} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium leading-snug">Calzos Fijos Asignados</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{conductaData.kpis.totalCalzosFijos || 0}</p>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] p-5 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col gap-3">
                <div className="p-3 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-500 w-fit">
                  <Shield size={22} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium leading-snug">Tasa Asignación Fija</p>
                  <p className="text-2xl font-black text-[var(--text-main)]">{conductaData.kpis.porcentajeCalzosFijos || '0.0%'}</p>
                </div>
              </div>
            </div>

            {/* Lista de Empleados por Inasistencias */}
            <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] space-y-6">
              <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center">
                <UserX className="mr-2 text-rose-500" size={20} /> Lista de Empleados por Inasistencias
              </h3>

              {/* Filtros y búsqueda */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar empleado, cargo o calzo..."
                    value={conductaSearch}
                    onChange={(e) => setConductaSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg-body)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => setSortByInasistencias(prev => prev === 'nombre' ? 'desc' : prev === 'desc' ? 'asc' : 'nombre')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all shadow-sm ${
                      sortByInasistencias !== 'nombre'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/20'
                        : 'bg-[var(--bg-body)] dark:bg-[#2a2a2a] text-[var(--text-main)] border-[var(--border-color)] hover:opacity-90'
                    }`}
                  >
                    <AlertTriangle size={16} className={sortByInasistencias !== 'nombre' ? 'text-white' : 'text-rose-500'} />
                    {sortByInasistencias === 'desc' && '↓ Mayor a Menor'}
                    {sortByInasistencias === 'asc' && '↑ Menor a Mayor'}
                    {sortByInasistencias === 'nombre' && 'Ordenar por nombre de empleado'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-rose-500/10 border-b border-[var(--border-color)]">
                      <th className="p-4 font-bold text-rose-600 text-sm">Empleado</th>
                      <th className="p-4 font-bold text-rose-600 text-sm">Cargo</th>
                      <th className="p-4 font-bold text-rose-600 text-sm">Calzo Fijo</th>
                      <th className="p-4 font-bold text-rose-600 text-sm text-center">Inasistencias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
                    {paginatedEmpleadosPorInasistencia.length > 0 ? (
                      paginatedEmpleadosPorInasistencia.map((item: any, idx: number) => (
                        <tr key={item.rut} className="hover:bg-rose-500/5 transition-colors text-sm">
                          <td className="p-4">
                            <span className="font-semibold block">{item.nombre}</span>
                            <span className="block text-xs text-[var(--text-muted)] font-medium">RUT: {item.rut}</span>
                          </td>
                          <td className="p-4 font-medium text-[var(--text-muted)]">{item.cargo}</td>
                          <td className="p-4">
                            {item.idCalzo ? (
                              <span className="font-semibold block text-orange-500">{getCalzoFullLabel(item.idCalzo)}</span>
                            ) : (
                              <span className="text-[var(--text-muted)] font-medium">Sin calzo asignado</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              {item.totalInasistencias} Inasistencias
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-[var(--text-muted)] font-medium">
                          No hay registros de inasistencias en este mes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalConductaPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    Mostrando página {conductaPage} de {totalConductaPages} ({empleadosPorInasistencia.length} empleados en total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={conductaPage === 1}
                      onClick={() => setConductaPage(p => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-orange-500/10 hover:text-orange-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      disabled={conductaPage === totalConductaPages}
                      onClick={() => setConductaPage(p => Math.min(totalConductaPages, p + 1))}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-orange-500/10 hover:text-orange-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Placeholder para los demás */}
        {!loading && !['ocupacion', 'auditoria', 'espera', 'visitas', 'conducta'].includes(activeTab) && (
          <div className="bg-[var(--bg-card)] p-12 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col items-center justify-center text-center h-[500px] animate-fade-in">
            <Activity size={64} className="text-orange-500 mb-6 opacity-80" />
            <h3 className="text-2xl font-black text-[var(--text-main)] mb-2">Construyendo Módulo Analítico</h3>
            <p className="text-[var(--text-muted)] max-w-md">
              La visualización de datos reales para la categoría <strong>{tabs.find(t => t.id === activeTab)?.name}</strong> se conectará con el backend en la siguiente fase de desarrollo.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
