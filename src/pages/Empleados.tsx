import { useState, useEffect, useRef } from 'react';
import NutriparkLogo from '../components/NutriparkLogo';
import PageLoader from '../components/PageLoader';
import CargoSelector from '../components/CargoSelector';
import FixedSlotModal from '../components/FixedSlotModal';

declare global {
  interface Window {
    DataTable: any;
    $: any;
    jQuery: any;
  }
}

interface Empleado {
  id: number;
  nombre: string;
  rut: string;
  idCargo: number;
  nombreCargo: string;
  idCalzoAsignado: number | null;
  correo: string;
  matricula: string;
  tipoVehiculo: string;
  discapacidad: boolean;
  idZona?: number;
  nombreZona?: string;
}

interface Cargo {
  id: number;
  descripcion: string;
}

export default function Empleados() {
  const [employees, setEmployees] = useState<Empleado[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Empleado | null>(null);
  const [employeeToEdit, setEmployeeToEdit] = useState<Empleado | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [employeeToView, setEmployeeToView] = useState<Empleado | null>(null);
  const [zonas, setZonas] = useState<any[]>([]);
  const [rutError, setRutError] = useState('');
  const [formError, setFormError] = useState('');
  const [isRutValidating, setIsRutValidating] = useState(false);
  const [showFixedModal, setShowFixedModal] = useState(false);
  const [showFixedRemoveModal, setShowFixedRemoveModal] = useState(false);
  const [fixedModalEmployee, setFixedModalEmployee] = useState<Empleado | null>(null);
  const [pendingFixedRemove, setPendingFixedRemove] = useState<Empleado | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableInstance = useRef<any>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Bloqueo de scroll del body cuando hay modales abiertos
  useEffect(() => {
    const isAnyModalOpen = showModal || showDeleteModal || showViewModal || showFixedModal || showFixedRemoveModal || showSuccess || deleting || submitting;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, showDeleteModal, showViewModal, showFixedModal, showFixedRemoveModal, showSuccess, deleting, submitting]);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    idCargo: '',
    correo: '',
    matricula: '',
    tipoVehiculo: 'particular',
    discapacidad: false,
    contrasena: 'admin123'
  });

  // 1. Cargar recursos externos solo una vez (jQuery primero, luego DataTables)
  useEffect(() => {
    // 1.1 Cargar jQuery
    const jqueryScript = document.createElement('script');
    jqueryScript.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
    jqueryScript.async = true;
    jqueryScript.onload = () => {
      console.log('jQuery cargado');

      // 1.2 Cargar CSS de DataTables
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '//cdn.datatables.net/2.3.8/css/dataTables.dataTables.min.css';
      document.head.appendChild(link);

      // 1.3 Cargar JS de DataTables
      const script = document.createElement('script');
      script.src = '//cdn.datatables.net/2.3.8/js/dataTables.min.js';
      script.async = true;
      script.onload = () => {
        console.log('DataTables cargado');
        fetchData();
      };
      document.body.appendChild(script);
    };
    document.body.appendChild(jqueryScript);

    return () => {
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy(true);
      }
      // Limpieza de scripts si fuera necesario (opcional en SPAs)
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
      const [empRes, cargoRes, zonaRes] = await Promise.all([
        fetch(`${API_URL}/admin/empleados`, {
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        }),
        fetch(`${API_URL}/admin/cargos`, {
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        }),
        fetch(`${API_URL}/admin/zonas`, {
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        })
      ]);

      if (empRes.ok && cargoRes.ok && zonaRes.ok) {
        const empData = await empRes.json();
        const cargoData = await cargoRes.json();
        const zonaData = await zonaRes.json();
        setEmployees(empData);
        setCargos(cargoData);
        setZonas(zonaData);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  // 2. Inicializar DataTable cuando los datos estén listos
  useEffect(() => {
    if (!loading && window.DataTable && tableRef.current) {
      if (dataTableInstance.current) {
        dataTableInstance.current.destroy();
      }

      // Inicialización pura según instrucción
      dataTableInstance.current = new window.DataTable('#myTable', {
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_ registros',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
          infoEmpty: 'Sin registros disponibles',
          paginate: {
            first: 'Primero',
            last: 'Último',
            next: 'Siguiente',
            previous: 'Anterior'
          },
          zeroRecords: 'No se encontraron resultados'
        },
        pageLength: 10,
        stateSave: true, // Persistencia de estado (paginación, filtros, etc)
        order: [[1, 'asc']], // Sort by Nombre
        scrollX: false, // Deshabilitar scroll horizontal ya que la tabla es más compacta
        // Forzamos que se muestren las líneas y el estilo estándar
        columnDefs: [
          { orderable: false, targets: [0], width: '120px' }, // Acciones (Ensanchado para el ojo)
          { width: '200px', targets: [1] }, // Nombre
          { width: '120px', targets: [2] }, // RUT
          { width: '180px', targets: [3] }, // Cargo
          { width: '150px', targets: [4] }, // Zona
          { width: '100px', targets: [5] }, // Calzo
          { className: "dt-center", targets: [0, 5] } // Center specific columns
        ]
      });
    }
  }, [loading, employees]);

  const formatRut = (value: string) => {
    let clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length <= 1) return clean;
    let body = clean.slice(0, -1);
    let dv = clean.slice(-1);
    return `${body}-${dv}`;
  };

  const validateRutChecksum = (rut: string) => {
    let clean = rut.replace(/[^0-9Kk]/g, '').toUpperCase();
    if (clean.length < 8) return false;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const expectedDv = 11 - (sum % 11);
    const dvChar = expectedDv === 11 ? '0' : expectedDv === 10 ? 'K' : expectedDv.toString();
    return dvChar === dv;
  };

  const handleRutChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value);
    setFormData({ ...formData, rut: formatted });
    setRutError('');

    const clean = formatted.replace(/[^0-9K]/g, '');

    // 1. Validación de formato y checksum
    if (clean.length >= 8) {
      if (!validateRutChecksum(formatted)) {
        setRutError('RUT Inválido (Dígito verificador incorrecto)');
        return;
      }
      // 2. Validación de existencia en API
      validateRutWithApi(formatted);
    }
  };

  const validateRutWithApi = async (rut: string) => {
    setIsRutValidating(true);
    try {
      const token = localStorage.getItem('admin_token');
      const cleanRut = rut.replace(/[^0-9K]/g, '');
      const res = await fetch(`${API_URL}/admin/empleados/validar-rut/${cleanRut}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.available) {
        setRutError(`Este RUT ya está registrado a nombre de: ${data.nombre}`);
      }
    } catch (error) {
      console.error('Error validating RUT:', error);
    } finally {
      setIsRutValidating(false);
    }
  };

  const handleDeleteSingle = (emp: Empleado) => {
    setEmployeeToDelete(emp);
    setShowDeleteModal(true);
  };

  const handleEditSingle = (emp: Empleado) => {
    setEmployeeToEdit(emp);
    setFormData({
      nombre: emp.nombre || '',
      rut: emp.rut || '',
      idCargo: emp.idCargo ? emp.idCargo.toString() : '',
      correo: emp.correo || '',
      matricula: emp.matricula || '',
      tipoVehiculo: emp.tipoVehiculo || 'particular',
      discapacidad: emp.discapacidad || false,
      contrasena: ''
    });
    setRutError('');
    setFormError('');
    setShowModal(true);
  };

  const handleViewSingle = (emp: Empleado) => {
    setEmployeeToView(emp);
    setShowViewModal(true);
  };

  const openNewEmployeeModal = () => {
    setEmployeeToEdit(null);
    setFormData({
      nombre: '', rut: '', idCargo: '', correo: '',
      matricula: '', tipoVehiculo: 'particular', discapacidad: false, contrasena: 'admin123'
    });
    setRutError('');
    setFormError('');
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    setShowDeleteModal(false);
    setDeleting(true);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/admin/empleados`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: [employeeToDelete.id] })
      });

      if (res.ok) {
        setEmployeeToDelete(null);
        await fetchData();
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFixedCalzo = (emp: Empleado, currentStatus: boolean) => {
    if (currentStatus) {
      // Si ya tiene calzo y lo desmarcan, abrimos confirmación
      setPendingFixedRemove(emp);
      setShowFixedRemoveModal(true);
    } else {
      // Si no tiene y lo marcan, abrimos el modal del wizard
      setFixedModalEmployee(emp);
      setShowFixedModal(true);
    }
  };

  const handleConfirmRemoveFixed = async () => {
    if (!pendingFixedRemove) return;
    setShowFixedRemoveModal(false);
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/admin/empleados/${pendingFixedRemove.id}/calzo-fijo`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ idCalzo: null })
      });

      if (res.ok) {
        setEmployees(prev => prev.map(e => e.id === pendingFixedRemove.id ? { ...e, idCalzoAsignado: null } : e));
      }
    } catch (error) {
      console.error('Error toggling calzo:', error);
    } finally {
      setSubmitting(false);
      setPendingFixedRemove(null);
    }
  };

  const handleConfirmFixedSlot = async (data: any) => {
    if (!fixedModalEmployee) return;

    setSubmitting(true); // Mostrar loading global
    setShowFixedModal(false); // Cerrar wizard para que se vea el loading

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/admin/empleados/${fixedModalEmployee.id}/generar-calzo-fijo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const result = await res.json();
        await fetchData(); // Recargar para ver el cambio
        if (result.status === 'success') {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        }
        return result;
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Fallo al generar reservas fijas');
      }
    } catch (error) {
      console.error(error);
      alert('Error al generar las reservas');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const isEditing = !!employeeToEdit;
      const url = isEditing
        ? `${API_URL}/admin/empleados/${employeeToEdit.id}`
        : `${API_URL}/admin/empleados`;

      const payload: any = {
        ...formData,
        idCargo: parseInt(formData.idCargo)
      };

      if (isEditing) {
        delete payload.contrasena;
      }

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        setEmployeeToEdit(null);
        setFormData({
          nombre: '', rut: '', idCargo: '', correo: '',
          matricula: '', tipoVehiculo: 'particular', discapacidad: false, contrasena: 'admin123'
        });

        // Mostrar pantalla naranja de éxito
        setShowSuccess(true);

        // Esperar un poco antes de recargar y cerrar
        setTimeout(async () => {
          await fetchData();
          setShowSuccess(false);
        }, 2000);
      } else {
        const errorData = await res.json();
        setFormError(errorData.message || 'Error al guardar los datos');
      }
    } catch (error) {
      console.error('Error registering:', error);
      setFormError('Error de conexión al servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCargo = async (nombre: string, idZona: number) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/admin/cargos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ descripcion: nombre, idZona })
      });
      if (res.ok) {
        const created = await res.json();
        const formattedCargo = { id: created.id, descripcion: created.descripcion };
        setCargos(prev => [...prev, formattedCargo]);
        return formattedCargo;
      }
    } catch (error) {
      console.error('Error creating cargo:', error);
    }
    return null;
  };

  const handleDeleteCargo = async (id: number) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/admin/cargos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setCargos(prev => prev.filter(c => c.id !== id));
      } else {
        const data = await res.json();
        alert(data.message || 'No se pudo eliminar el cargo');
      }
    } catch (error) {
      console.error('Error deleting cargo:', error);
      alert('Error de conexión al intentar eliminar el cargo');
    }
  };



  return (
    <div className="p-8 min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-200 employees-page">
      <style>{`
        /* Personalización dinámica de DataTables */
        .employees-page .dt-container {
          color: var(--text-main) !important;
          font-family: 'Inter', sans-serif;
        }

        /* Fondo de la tabla dinámica */
        table.dataTable {
          background-color: var(--bg-card) !important;
          border-radius: 15px;
          overflow: hidden;
          border: 1px solid var(--border-color) !important;
          margin-top: 20px !important;
        }

        /* Encabezados */
        table.dataTable thead th {
          background-color: var(--bg-main) !important;
          color: #ff7700 !important; /* Mantenemos naranja para identidad */
          border-bottom: 2px solid #ff7700 !important;
          padding: 15px !important;
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 0.05em;
        }

        /* Celdas y líneas de separación */
        table.dataTable tbody td {
          background-color: transparent !important;
          color: var(--text-main) !important;
          border-bottom: 1px solid var(--border-color) !important;
          padding: 12px 15px !important;
        }

        /* Buscador y Length */
        .dt-search input {
          background-color: var(--bg-main) !important;
          border: 1px solid var(--border-color) !important;
          color: var(--text-main) !important;
          border-radius: 8px !important;
          padding: 6px 12px !important;
          outline: none;
        }

        .dt-search input:focus {
          border-color: #ff7700 !important;
          box-shadow: 0 0 0 2px rgba(255, 119, 0, 0.2);
        }

        .dt-container .dt-layout-row:first-child {
          display: flex !important;
          justify-content: flex-end !important;
          align-items: center !important;
          gap: 1rem !important;
          margin-bottom: 1rem !important;
        }

        .dt-layout-cell.dt-layout-end {
          display: flex !important;
          align-items: center !important;
          gap: 1rem !important;
        }

        .dt-length {
          margin-right: auto !important;
        }

        .dt-length select {
          background-color: var(--bg-main) !important;
          border: 1px solid var(--border-color) !important;
          color: var(--text-main) !important;
          border-radius: 8px !important;
        }

        /* Paginación */
        .dt-paging-button {
          color: var(--text-main) !important;
          border: 1px solid var(--border-color) !important;
          background: var(--bg-card) !important;
          margin: 0 4px !important;
          border-radius: 6px !important;
        }

        .dt-paging-button.current {
          background: #ff7700 !important;
          border-color: #ff7700 !important;
          color: #fff !important;
          font-weight: bold;
        }

        .dt-paging-button:hover:not(.current) {
          background: var(--bg-main) !important;
          border-color: var(--border-color) !important;
        }

        /* Info de registros */
        .dt-info {
          color: var(--text-muted) !important;
          font-size: 0.9rem;
        }

        /* Checkbox naranja */
        .accent-orange-500 {
          accent-color: #ff7700;
        }

        .delete-btn-faded {
          opacity: 0.3;
          cursor: not-allowed;
          filter: grayscale(1);
        }

        /* Animaciones para los puntos de carga */
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .dot-bounce {
          animation: bounce 0.8s infinite ease-in-out;
        }
        .dot-delay-1 { animation-delay: 0.15s; }
        .dot-delay-2 { animation-delay: 0.3s; }
      `}</style>

      {/* Overlay de Carga (Eliminando/Registrando) */}
      {(deleting || submitting) && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] p-12 rounded-[40px] shadow-2xl border border-[var(--border-color)] flex flex-col items-center max-w-xs w-full">
            <NutriparkLogo size="large" className="scale-110 mb-4" />
            <div className="flex flex-col items-center mt-6">
              <p className="text-[var(--text-main)] font-black tracking-widest text-xs uppercase text-center mb-6 opacity-80">
                {deleting ? 'ELIMINANDO EMPLEADOS...' :
                  fixedModalEmployee ? 'GENERANDO RESERVAS FIJAS...' :
                    pendingFixedRemove ? 'LIBERANDO CALZO Y RESERVAS...' :
                      'PROCESANDO REGISTRO...'}
              </p>
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full dot-bounce"></div>
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full dot-bounce dot-delay-1"></div>
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full dot-bounce dot-delay-2"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pantalla Naranja de Éxito */}
      {showSuccess && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-[#ff7700] animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center text-white px-8">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter text-center">¡REGISTRO EXITOSO!</h2>
            <p className="text-white/80 font-bold tracking-widest text-sm uppercase text-center">EL COLABORADOR HA SIDO AÑADIDO AL SISTEMA</p>

            <div className="mt-12 flex gap-1 justify-center">
              <div className="w-8 h-1 bg-white/30 rounded-full overflow-hidden">
                <div className="w-full h-full bg-white animate-[progress_2s_linear]"></div>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes progress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
              </div>
              <h3 className="text-2xl font-black text-[var(--text-main)] mb-4">¿Confirmar Eliminación?</h3>
              <p className="text-[var(--text-muted)] text-lg leading-relaxed">
                Estás a punto de eliminar a <span className="text-red-500 font-bold">{employeeToDelete?.nombre}</span> permanentemente del sistema. Sus reservas activas también serán eliminadas.
              </p>
            </div>
            <div className="p-8 bg-[var(--bg-main)]/50 border-t border-[var(--border-color)] flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-4 rounded-2xl font-bold text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-6 py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-900/40 transition-all"
              >
                ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
        <h1 className="text-3xl font-black tracking-tight uppercase italic text-orange-500">Gestión de Empleados</h1>
        <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest">Base de datos centralizada de personal y vehículos</p>
        </div>
        <button
          onClick={openNewEmployeeModal}
          className="bg-[#ff7700] hover:bg-[#e66b00] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/40"
        >
          + NUEVO EMPLEADO
        </button>
      </div>

      <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-2xl relative">
        <div className="mb-4 text-sm text-[var(--text-muted)] flex items-center gap-4">
          <b>Nomenclatura:</b>
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff7700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
            <span>Ver detalles</span>
          </div>
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff7700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
            <span>Editar empleado</span>
          </div>
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff7700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            <span>Eliminar empleado</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20">
            <PageLoader message="Cargando base de datos..." />
          </div>
        ) : (
          <table id="myTable" ref={tableRef} className="display row-border stripe w-full">
            <thead>
              <tr>
                <th className="text-center w-10">Acciones</th>
                <th>Nombre</th>
                <th>RUT</th>
                <th>Cargo</th>
                <th>Zona Asignada</th>
                <th className="text-center">Calzo Fijo</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="text-center">
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() => handleViewSingle(emp)}
                        className="text-[#ff7700] hover:scale-110 transition-transform"
                        title="Ver detalles"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                      </button>
                      <button
                        onClick={() => handleEditSingle(emp)}
                        className="text-[#ff7700] hover:scale-110 transition-transform"
                        title="Editar empleado"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSingle(emp)}
                        className="text-[#ff7700] hover:scale-110 transition-transform"
                        title="Eliminar empleado"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                      </button>
                    </div>
                  </td>
                  <td>{emp.nombre}</td>
                  <td>{emp.rut}</td>
                  <td>
                    <span className="bg-orange-500/10 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 px-2 py-1 rounded text-xs font-bold">
                      {emp.nombreCargo || 'Sin Cargo'}
                    </span>
                  </td>
                  <td>
                    <span className="bg-blue-500/10 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold">
                      {emp.nombreZona || `Zona ${emp.idZona || '?'}`}
                    </span>
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={emp.idCalzoAsignado !== null}
                      onChange={() => handleToggleFixedCalzo(emp, emp.idCalzoAsignado !== null)}
                      className="w-5 h-5 accent-orange-500 cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Confirmación para Quitar Calzo Fijo */}
      {showFixedRemoveModal && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 border border-orange-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="m21 2-2 2m-7.61 7.61a2 2 0 1 1-2.78-2.78" /><path d="M18 10a8 8 0 0 0-16 0" /><path d="M12 2v3" /><path d="M18.5 4.5l-2.1 2.1" /><path d="M5.5 4.5l2.1 2.1" /><path d="M22 10h-3" /><path d="M2 10h3" /><path d="M20 22 10 12" /><path d="m13 22-3-3 3-3" /><path d="m9 22-3-3 3-3" /></svg>
              </div>
              <h3 className="text-2xl font-black text-[var(--text-main)] mb-4">¿Quitar Calzo Fijo?</h3>
              <p className="text-[var(--text-muted)] text-lg leading-relaxed">
                Se eliminará la asignación permanente y <span className="text-orange-500 font-bold">todas las reservas futuras</span> generadas para este calzo.
              </p>
            </div>
            <div className="p-8 bg-[var(--bg-main)]/50 border-t border-[var(--border-color)] flex gap-4">
              <button
                onClick={() => setShowFixedRemoveModal(false)}
                className="flex-1 px-6 py-4 rounded-2xl font-bold text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleConfirmRemoveFixed}
                className="flex-1 px-6 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-900/40 transition-all"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro con Tema Adaptable */}
      {showModal && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl w-full max-w-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[var(--text-main)]">
                {employeeToEdit ? 'Editar Empleado' : 'Nuevo Registro'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {formError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold animate-shake">
                    ⚠️ {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-[var(--text-main)] outline-none focus:border-orange-500 transition-colors"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">RUT (Sin puntos)</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formData.rut}
                        onChange={handleRutChange}
                        disabled={!!employeeToEdit}
                        className={`w-full bg-[var(--bg-main)] border ${rutError ? 'border-red-500' : 'border-[var(--border-color)]'} rounded-xl px-4 py-2 text-[var(--text-main)] outline-none focus:border-orange-500 transition-colors ${employeeToEdit ? 'opacity-50' : ''}`}
                        placeholder="12345678-9"
                      />
                      {isRutValidating && (
                        <div className="absolute right-3 top-3.5">
                          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    {rutError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-tighter mt-1">{rutError}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Correo Corporativo</label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => {
                      setFormData({ ...formData, correo: e.target.value.toLowerCase() });
                      if (formError.toLowerCase().includes('correo')) setFormError('');
                    }}
                    className={`w-full bg-[var(--bg-main)] border ${formError.toLowerCase().includes('correo') ? 'border-red-500 ring-1 ring-red-500/20' : 'border-[var(--border-color)]'} rounded-xl px-4 py-2 text-[var(--text-main)] outline-none focus:border-orange-500 transition-colors`}
                    placeholder="juan.perez@nutrisco.com (Opcional)"
                  />
                  {formData.correo && formError.toLowerCase().includes('correo') && (
                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-tight animate-pulse">
                      Dominio no permitido. Revisa el correo corporativo.
                    </p>
                  )}
                </div>

                <div className="mt-2">
                  <CargoSelector
                    cargos={cargos}
                    zonas={zonas}
                    selectedCargoId={formData.idCargo}
                    onSelect={(id) => setFormData({ ...formData, idCargo: id })}
                    onCreateCargo={handleCreateCargo}
                    onDeleteCargo={handleDeleteCargo}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Matrícula</label>
                    <input
                      type="text"
                      value={formData.matricula}
                      onChange={(e) => setFormData({ ...formData, matricula: e.target.value.toUpperCase() })}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-[var(--text-main)] outline-none focus:border-orange-500 transition-colors uppercase"
                      placeholder="ABCD-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Tipo de Vehículo</label>
                    <select
                      value={formData.tipoVehiculo}
                      onChange={(e) => setFormData({ ...formData, tipoVehiculo: e.target.value })}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-[var(--text-main)] outline-none focus:border-orange-500 transition-colors"
                    >
                      <option value="particular">Particular</option>
                      <option value="pool">Pool</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]">
                  <input
                    type="checkbox"
                    id="discapacidad"
                    checked={formData.discapacidad}
                    onChange={(e) => setFormData({ ...formData, discapacidad: e.target.checked })}
                    className="w-5 h-5 accent-orange-500 cursor-pointer"
                  />
                  <label htmlFor="discapacidad" className="text-sm font-bold text-[var(--text-main)] cursor-pointer">
                    Requiere Estacionamiento para Personas con Discapacidad
                  </label>
                </div>

              </div>

              <div className="p-8 bg-[var(--bg-main)]/50 border-t border-[var(--border-color)] flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={submitting || !!rutError || isRutValidating}
                  className="flex-1 px-6 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-900/40 transition-all disabled:opacity-50"
                >
                  {submitting ? 'GUARDANDO...' : (employeeToEdit ? 'ACTUALIZAR' : 'REGISTRAR')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualización de Empleado */}
      {showViewModal && employeeToView && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[35px] shadow-2xl w-full max-w-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-orange-500 to-orange-600"></div>

            <button
              onClick={() => setShowViewModal(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-colors z-10"
            >
              ✕
            </button>

            <div className="pt-12 pb-8 px-10 relative">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-24 h-24 bg-white rounded-[30px] shadow-xl flex items-center justify-center mb-4 border-4 border-[var(--bg-card)] overflow-hidden">
                  <div className="text-4xl">👤</div>
                </div>
                <h2 className="text-2xl font-black text-[var(--text-main)] mb-1 uppercase tracking-tight">
                  {employeeToView.nombre}
                </h2>
                <p className="text-orange-500 font-black tracking-widest text-[10px] uppercase">
                  {employeeToView.nombreCargo || 'Sin Cargo'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border-color)]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">RUT</p>
                  <p className="text-[var(--text-main)] font-bold text-base">{employeeToView.rut}</p>
                </div>
                <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border-color)]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Zona Asignada</p>
                  <p className="text-[var(--text-main)] font-bold text-base">{employeeToView.nombreZona || 'N/A'}</p>
                </div>

                <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border-color)]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Correo Electrónico</p>
                  <p className="text-[var(--text-main)] font-bold text-sm truncate" title={employeeToView.correo}>{employeeToView.correo || 'No registrado'}</p>
                </div>
                <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border-color)]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Matrícula</p>
                  <p className="text-[var(--text-main)] font-bold text-base font-mono">{employeeToView.matricula || 'N/A'}</p>
                </div>

                <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border-color)]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Tipo de Vehículo</p>
                  <p className="text-[var(--text-main)] font-bold text-base capitalize">{employeeToView.tipoVehiculo || 'Particular'}</p>
                </div>

                <div className="flex gap-2">
                  <div className={`flex-1 p-3 rounded-2xl border flex items-center gap-2 ${employeeToView.discapacidad ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'bg-gray-500/5 border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                    <span className="text-[14px]">♿</span>
                    <span className="text-[9px] font-black uppercase tracking-tight leading-none">
                      {employeeToView.discapacidad ? 'Discapacidad' : 'Sin Discapacidad'}
                    </span>
                  </div>
                  <div className={`flex-1 p-3 rounded-2xl border flex items-center gap-2 ${employeeToView.idCalzoAsignado ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' : 'bg-gray-500/5 border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                    <span className="text-[14px]">🅿️</span>
                    <span className="text-[9px] font-black uppercase tracking-tight leading-none">
                      {employeeToView.idCalzoAsignado ? 'Calzo Fijo' : 'Sin Calzo Fijo'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditSingle(employeeToView);
                  }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black tracking-widest text-xs uppercase shadow-lg shadow-orange-900/20 transition-all"
                >
                  EDITAR COLABORADOR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Calzo Fijo */}
      <FixedSlotModal
        isOpen={showFixedModal}
        onClose={() => setShowFixedModal(false)}
        employee={fixedModalEmployee}
        onConfirm={handleConfirmFixedSlot}
      />
    </div>
  );
}
