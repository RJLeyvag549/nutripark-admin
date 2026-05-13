import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, LayoutDashboard, Users, CarFront, AlertTriangle, FileBarChart, Moon, Sun, HelpCircle, Info, ClipboardList } from 'lucide-react';
import NutriparkLogo from './NutriparkLogo';

export default function Navbar() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showVisitasMenu, setShowVisitasMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const navigate = useNavigate();

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

  return (
    <nav className="bg-[#1E3A8A] text-white shadow-lg relative z-50">
      <div className="w-full mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          
          {/* Left: Profile Menu */}
          <div className="relative flex-shrink-0">
            <button 
              onClick={() => { 
                setShowProfileMenu(!showProfileMenu); 
                setShowSettingsMenu(false); 
                setShowVisitasMenu(false);
              }}
              className="p-3 bg-blue-800 hover:bg-blue-700 rounded-full transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <User size={30} className="text-white" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl py-2 border border-gray-100 dark:border-[#333] transform origin-top-left transition-all">
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 flex items-center">
                  <User size={16} className="mr-2" /> Ver Perfil
                </button>
                <div className="h-px bg-gray-200 dark:bg-[#333] my-1"></div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                >
                  <LogOut size={16} className="mr-2" /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>

          {/* Center: Tabs and Logo */}
          <div className="flex items-center flex-1 justify-center px-8 lg:px-12 space-x-3 lg:space-x-6">
            
            {/* Tabs Izquierda */}
            {navItems.slice(0, 3).map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : 'text-blue-100 hover:bg-blue-800/80 hover:text-white'
                  }`
                }
              >
                <item.icon size={18} className="mr-2" />
                {item.name}
              </NavLink>
            ))}

            {/* Logo en el medio (Color Naranjo Original) */}
            <div className="mx-2 lg:mx-6 flex-shrink-0 flex items-center justify-center">
              <NutriparkLogo size="small" />
            </div>

            {/* Visitas Dropdown */}
            <div className="relative">
              <button
                onClick={() => { 
                  setShowVisitasMenu(!showVisitasMenu); 
                  setShowProfileMenu(false); 
                  setShowSettingsMenu(false); 
                }}
                className={`flex items-center px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  window.location.pathname.startsWith('/visitas')
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'text-blue-100 hover:bg-blue-800/80 hover:text-white'
                }`}
              >
                <CarFront size={18} className="mr-2" />
                Visitas
              </button>

              {showVisitasMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl py-2 border border-gray-100 dark:border-[#333] transform origin-top-left transition-all">
                  <NavLink
                    to="/visitas"
                    onClick={() => setShowVisitasMenu(false)}
                    className={({ isActive }) =>
                      `w-full text-left px-4 py-2 text-sm flex items-center ${
                        isActive ? 'text-orange-600 font-bold bg-orange-50 dark:bg-orange-900/10' : 'text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600'
                      }`
                    }
                  >
                    <ClipboardList size={16} className="mr-2" /> Pendientes
                  </NavLink>
                  <NavLink
                    to="/visitas-historial"
                    onClick={() => setShowVisitasMenu(false)}
                    className={({ isActive }) =>
                      `w-full text-left px-4 py-2 text-sm flex items-center ${
                        isActive ? 'text-orange-600 font-bold bg-orange-50 dark:bg-orange-900/10' : 'text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600'
                      }`
                    }
                  >
                    <FileBarChart size={16} className="mr-2" /> Historial / Aprobadas
                  </NavLink>
                </div>
              )}
            </div>

            {/* Tabs Derecha */}
            {navItems.slice(4).map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : 'text-blue-100 hover:bg-blue-800/80 hover:text-white'
                  }`
                }
              >
                <item.icon size={18} className="mr-2" />
                {item.name}
              </NavLink>
            ))}

          </div>

          {/* Right: Settings Menu */}
          <div className="relative flex-shrink-0">
            <button 
              onClick={() => { 
                setShowSettingsMenu(!showSettingsMenu); 
                setShowProfileMenu(false); 
                setShowVisitasMenu(false);
              }}
              className="p-3 hover:bg-blue-800 rounded-full transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <Settings size={34} className="text-orange-400" />
            </button>

            {/* Settings Dropdown */}
            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl py-2 border border-gray-100 dark:border-[#333] transform origin-top-right transition-all">
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

        </div>
      </div>
    </nav>
  );
}
