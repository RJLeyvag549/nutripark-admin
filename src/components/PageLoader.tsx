import NutriparkLogo from './NutriparkLogo';

interface PageLoaderProps {
  message?: string;
}

export default function PageLoader({ message = 'CONECTANDO CON EL SERVIDOR...' }: PageLoaderProps) {
  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[var(--bg-main)] animate-in fade-in duration-500">
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .dot-bounce {
          animation: bounce 0.8s infinite ease-in-out;
        }
        .dot-delay-1 { animation-delay: 0.15s; }
        .dot-delay-2 { animation-delay: 0.3s; }
      `}</style>
      
      <div className="relative mb-12">
        <NutriparkLogo size="large" className="scale-150" />
      </div>

      <div className="flex flex-col items-center">
        <p className="text-[var(--text-main)] font-black tracking-[0.3em] text-sm uppercase text-center mb-8 opacity-80">
          {message}
        </p>
        
        <div className="flex gap-3">
          <div className="w-3 h-3 bg-[#ff7700] rounded-full shadow-[0_0_15px_rgba(255,119,0,0.5)] dot-bounce"></div>
          <div className="w-3 h-3 bg-[#ff7700] rounded-full shadow-[0_0_15px_rgba(255,119,0,0.5)] dot-bounce dot-delay-1"></div>
          <div className="w-3 h-3 bg-[#ff7700] rounded-full shadow-[0_0_15px_rgba(255,119,0,0.5)] dot-bounce dot-delay-2"></div>
        </div>
      </div>

      <div className="absolute bottom-12 text-[var(--text-muted)] text-[10px] font-bold tracking-widest uppercase opacity-40">
        Sistema de Gestión de Estacionamientos Nutripark v2.0
      </div>
    </div>
  );
}
