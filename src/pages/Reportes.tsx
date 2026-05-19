import { useState, useEffect, useRef, useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import {
  Download, FileText, BarChart2, PieChart, Activity, Users, AlertTriangle,
  Calendar, Clock, CheckCircle2, Shield, Search, ChevronLeft, ChevronRight,
  Award
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart,
  Pie, Cell, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ZONES } from '../constants/Zones';

// --- MOCK DATA PARA DEMOSTRACIÓN VISUAL ---
const ocupacionHoraPunta = [
  { hora: '07:00', zonaA: 30, zonaB: 20 },
  { hora: '08:00', zonaA: 85, zonaB: 60 },
  { hora: '09:00', zonaA: 100, zonaB: 95 },
  { hora: '10:00', zonaA: 98, zonaB: 90 },
  { hora: '11:00', zonaA: 85, zonaB: 80 },
  { hora: '12:00', zonaA: 70, zonaB: 65 },
  { hora: '13:00', zonaA: 60, zonaB: 50 },
  { hora: '14:00', zonaA: 85, zonaB: 75 },
  { hora: '15:00', zonaA: 90, zonaB: 85 },
  { hora: '16:00', zonaA: 95, zonaB: 90 },
  { hora: '17:00', zonaA: 60, zonaB: 40 },
  { hora: '18:00', zonaA: 30, zonaB: 15 },
];

const incidenciasPorTipo = [
  { name: 'Calzo Ocupado', value: 45 },
  { name: 'Mal Estacionado', value: 25 },
  { name: 'Choque/Daño', value: 8 },
  { name: 'Acceso Forzado', value: 12 },
];
const COLORS = ['#F97316', '#3B82F6', '#EF4444', '#10B981'];

const metricasCards = {
  ocupacion: [
    { title: 'Tasa Promedio Global', value: '78%', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { title: 'Hora Punta Diaria', value: '09:00', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { title: 'Tiempo Uso Promedio', value: '6h 45m', icon: Clock, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  ],
  incidencias: [
    { title: 'Total del Mes', value: '90', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    { title: 'Tiempo Respuesta Promedio', value: '12 min', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { title: 'Zonas Conflictivas', value: 'Zona A', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ]
};

const tabs = [
  { id: 'auditoria', name: 'Auditoría', icon: Shield },
  { id: 'ocupacion', name: 'Ocupación', icon: BarChart2 },
  { id: 'espera', name: 'Lista de Espera', icon: Users },
  { id: 'visitas', name: 'Visitas', icon: CheckCircle2 },
  { id: 'incidencias', name: 'Incidencias', icon: AlertTriangle },
  { id: 'conducta', name: 'Conducta', icon: Search },
];

export default function Reportes() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ocupacion');

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

    setLoading(true);
    if (activeTab === 'auditoria') {
      fetchAuditoria().finally(() => {
        setTimeout(() => setLoading(false), 500);
      });
    } else if (activeTab === 'ocupacion') {
      fetchOcupacion().finally(() => {
        setTimeout(() => setLoading(false), 500);
      });
    } else {
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedMonth]);

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
    } else {
      alert("La exportación para esta pestaña no está disponible.");
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER DE LA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)]">
        <div>
          <h2 className="text-3xl font-black text-[var(--text-main)] uppercase tracking-tight flex items-center">
            <PieChart className="mr-3 text-orange-500" size={32} />
            Reportes y Estadísticas
          </h2>
          <p className="text-[var(--text-muted)] mt-1 ml-11 font-medium">
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
                  <ResponsiveContainer width="100%" height="100%">
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

            <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)]">
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center">
                <Shield className="mr-2 text-orange-500" /> Registro de Actividad del Sistema
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm uppercase tracking-wider">
                      <th className="p-4 font-semibold whitespace-nowrap">Fecha y Hora</th>
                      <th className="p-4 font-semibold whitespace-nowrap">Usuario</th>
                      <th className="p-4 font-semibold whitespace-nowrap">Acción</th>
                      <th className="p-4 font-semibold">Detalles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {auditoriaData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">
                          No hay registros de auditoría para este mes.
                        </td>
                      </tr>
                    ) : (
                      auditoriaData.map((item) => (
                        <tr key={item.idAuditoria} className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
                          <td className="p-4 text-sm text-[var(--text-main)] whitespace-nowrap">
                            {new Date(item.fechaHora).toLocaleString('es-CL')}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="font-medium text-[var(--text-main)]">{item.nombreUsuario}</div>
                            <div className="text-xs text-[var(--text-muted)]">{item.rutUsuario}</div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="bg-orange-500/10 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold inline-block border border-orange-500/20">
                              {item.accion.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-[var(--text-muted)] max-w-md">
                            {formatDetalle(item.accion, item.detalle)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
              <div>
                <h3 className="text-lg font-bold text-[var(--text-main)]">Historial de Uso Físico Real del Mes</h3>
                <p className="text-sm text-[var(--text-muted)] font-medium">Listado completo de todas las reservas que registraron escaneo QR de ingreso en portería.</p>
              </div>
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
                      {ocupacionData.historialUsoReal && ocupacionData.historialUsoReal.length > 0 ? (
                        ocupacionData.historialUsoReal.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-orange-500/5 transition-colors">
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
                            No hay registros de uso físico real para este período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'incidencias' && (
          <div className="space-y-6 animate-fade-in">
            {/* Tarjetas de Métricas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {metricasCards.incidencias.map((card, idx) => (
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico Circular: Tipos de Incidencia */}
              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)]">
                <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Distribución por Tipo de Incidencia</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={incidenciasPorTipo}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {incidenciasPorTipo.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                      />
                      <Legend iconType="circle" verticalAlign="bottom" height={36} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Simulación de otro gráfico */}
              <div className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                <BarChart2 size={48} className="text-gray-300 dark:text-[#333] mb-4" />
                <h4 className="text-xl font-bold text-[var(--text-main)]">Tendencia de Resoluciones</h4>
                <p className="text-[var(--text-muted)] mt-2 max-w-sm">
                  Aquí se mostrará un gráfico de barras comparando los tiempos de respuesta del equipo de seguridad a lo largo del mes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Placeholder para los demás */}
        {!loading && !['ocupacion', 'incidencias', 'auditoria'].includes(activeTab) && (
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
