import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import NutriparkLogo from '../components/NutriparkLogo';
// Asumimos que la imagen está en la carpeta assets como mencionaste
import bgImage from '../assets/PlantaOrizon.jpg';

export default function Login() {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Función para formatear RUT
  const formatRut = (value: string) => {
    const cleanRut = value.replace(/[^0-9kK]/g, '');
    if (cleanRut.length === 0) return '';
    if (cleanRut.length <= 1) return cleanRut;
    
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();
    
    let formattedBody = '';
    for (let i = body.length - 1, j = 1; i >= 0; i--, j++) {
      formattedBody = body.charAt(i) + formattedBody;
      if (j % 3 === 0 && i !== 0) {
        formattedBody = '.' + formattedBody;
      }
    }
    
    return `${formattedBody}-${dv}`;
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRut(formatRut(e.target.value));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      // Conexión con la API
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ rut, contrasena: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      // Verificación de cargos de administrador (41 y 50)
      if (data.user.idCargo !== 41 && data.user.idCargo !== 50) {
        throw new Error('No tienes permisos de administrador para acceder a este panel.');
      }

      // Guardar token y datos del usuario (con duración simulada o usando localStorage)
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-900">
      {/* Imagen de fondo con overlay oscuro para resaltar el panel */}
      <div 
        className="absolute inset-0 z-0 opacity-40 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-0" />

      {/* Contenedor del Login (Glassmorphism) */}
      <div className="z-10 w-full max-w-md p-8 m-4 rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <NutriparkLogo size="large" className="mb-2 drop-shadow-lg" />
          <p className="text-gray-300 text-sm mt-1 uppercase tracking-widest">Panel de Control</p>
        </div>

        {/* Contenedor de Error con altura fija para evitar el 'pestañeo' o salto visual */}
        <div className={`mb-6 p-4 rounded-xl text-sm text-center transition-all duration-300 min-h-[56px] flex items-center justify-center ${
          error ? 'bg-red-500/20 border border-red-500/50 text-red-100 opacity-100' : 'opacity-0 border border-transparent'
        }`}>
          {error}
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="text-gray-300 text-sm ml-1 font-medium">RUT del Administrador</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={rut}
                onChange={handleRutChange}
                placeholder="Ej: 12.345.678-9"
                maxLength={12}
                className="w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-gray-300 text-sm ml-1 font-medium">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl text-white font-bold tracking-wide shadow-lg shadow-orange-500/20 transition-all ${
              loading 
                ? 'bg-orange-500/70 cursor-not-allowed' 
                : 'bg-orange-600 hover:bg-orange-500 hover:shadow-orange-500/40 transform hover:-translate-y-0.5'
            }`}
          >
            {loading ? 'AUTENTICANDO...' : 'INGRESAR AL SISTEMA'}
          </button>
        </form>
      </div>
    </div>
  );
}
