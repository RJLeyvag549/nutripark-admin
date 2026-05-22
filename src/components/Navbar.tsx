import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Settings, LogOut, LayoutDashboard, Users, CarFront, AlertTriangle, FileBarChart, Moon, Sun, HelpCircle, Info, ClipboardList } from 'lucide-react';
import NutriparkLogo from './NutriparkLogo';
import { io } from 'socket.io-client';

export default function Navbar() {

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [incidentCount, setIncidentCount] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_URL}/admin/incidencias`, {
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          const unseen = data.filter((inc: any) => !inc.visto).length;
          setIncidentCount(unseen);
        }
      } catch (e) {
        console.error('Error fetching incident count:', e);
      }
    };

    fetchCount();

    const socket = io(API_URL);

    socket.on('incidencia:nueva', () => {
      fetchCount();
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => { });
    });

    socket.on('incidencia:actualizada', () => {
      fetchCount();
    });

    socket.on('incidencia:vista', () => {
      fetchCount();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Empleados', path: '/empleados', icon: Users },
    { name: 'Lista de Espera', path: '/listaespera', icon: ClipboardList },
    { name: 'Visitas', path: '/visitas', icon: CarFront },
    { name: 'Incidencias', path: '/incidencias', icon: AlertTriangle },
    { name: 'Reportes', path: '/reportes', icon: FileBarChart },
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${isActive
      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
      : 'text-blue-100 hover:bg-blue-800/80 hover:text-white'
    }`;

  const renderNavLink = (item: typeof navItems[0], showLabel = true) => (
    <NavLink
      key={item.name}
      to={item.path}
      className={navLinkClass}
    >
      <item.icon size={18} className={showLabel ? 'mr-2 shrink-0' : 'shrink-0'} />
      {showLabel && <span>{item.name}</span>}
      {item.name === 'Incidencias' && incidentCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#1E3A8A] animate-pulse">
          {incidentCount}
        </span>
      )}
    </NavLink>
  );

  return (
    <nav className="bg-[#1E3A8A] text-white shadow-lg relative z-50">
      <div className="w-full mx-auto px-3 sm:px-4">

        {/* ── Escritorio ancho (≥1280px): barra original en una fila ── */}
        <div className="hidden xl:flex justify-between items-center h-20 gap-2">
          <div className="flex-shrink-0">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 lg:px-4 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-xl transition-all duration-200 text-sm font-semibold border border-red-500/30 hover:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <LogOut size={18} />
              <span>Cerrar Sesión</span>
            </button>
          </div>

          <div className="flex items-center flex-1 justify-center min-w-0 px-2 lg:px-6 space-x-2 lg:space-x-4">
            {navItems.slice(0, 3).map((item) => (
              <NavLink key={item.name} to={item.path} className={({ isActive }) =>
                `relative flex items-center px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${isActive
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-blue-100 hover:bg-blue-800/80 hover:text-white'
                }`
              }>
                <item.icon size={18} className="mr-2 shrink-0" />
                {item.name}
              </NavLink>
            ))}

            <div className="mx-2 lg:mx-4 flex-shrink-0 flex items-center justify-center">
              <NutriparkLogo size="small" />
            </div>

            {navItems.slice(3).map((item) => (
              <NavLink key={item.name} to={item.path} className={({ isActive }) =>
                `relative flex items-center px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${isActive
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-blue-100 hover:bg-blue-800/80 hover:text-white'
                }`
              }>
                <item.icon size={18} className="mr-2 shrink-0" />
                {item.name}
                {item.name === 'Incidencias' && incidentCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#1E3A8A] animate-pulse">
                    {incidentCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          <SettingsMenu
            showSettingsMenu={showSettingsMenu}
            setShowSettingsMenu={setShowSettingsMenu}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        </div>

        {/* ── Ventana reducida (<1280px): logo arriba + tabs con scroll ── */}
        <div className="xl:hidden py-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-xl transition-all text-xs sm:text-sm font-semibold border border-red-500/30 shrink-0"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>

            <div className="flex-shrink-0">
              <NutriparkLogo size="small" />
            </div>

            <SettingsMenu
              showSettingsMenu={showSettingsMenu}
              setShowSettingsMenu={setShowSettingsMenu}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              compact
            />
          </div>

          <div className="overflow-x-auto hide-scrollbar flex items-center gap-2 pb-0.5 -mx-1 px-1">
            {navItems.map((item) => (
              <div key={item.name} className="relative">
                {renderNavLink(item)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function SettingsMenu({
  showSettingsMenu,
  setShowSettingsMenu,
  isDarkMode,
  setIsDarkMode,
  compact = false,
}: {
  showSettingsMenu: boolean;
  setShowSettingsMenu: (v: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setShowSettingsMenu(!showSettingsMenu)}
        className={`hover:bg-blue-800 rounded-full transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-orange-500 ${compact ? 'p-2' : 'p-3'}`}
      >
        <Settings size={compact ? 28 : 34} className="text-orange-400" />
      </button>

      {showSettingsMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl py-2 border border-gray-100 dark:border-[#333] transform origin-top-right transition-all z-[60]">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center justify-between group"
          >
            <div className="flex items-center">
              {isDarkMode ? <Sun size={18} className="mr-3 text-orange-500" /> : <Moon size={18} className="mr-3 text-gray-400" />}
              {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${isDarkMode ? 'bg-orange-500' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-all ${isDarkMode ? 'left-5' : 'left-1'}`}></div>
            </div>
          </button>
          <div className="h-px bg-gray-100 dark:bg-[#333] my-1"></div>
          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center">
            <HelpCircle size={18} className="mr-3 text-gray-400" /> Ayuda
          </button>
          <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center">
            <Info size={18} className="mr-3 text-gray-400" /> Acerca de
          </button>
        </div>
      )}
    </div>
  );
}
