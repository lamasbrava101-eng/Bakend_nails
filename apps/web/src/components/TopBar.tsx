import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/client';
import { InstallApp } from './InstallApp';

export function TopBar() {
  const { user, logout, clearSession } = useAuth();
  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearSession();
    logout();
  };
  return (
    <header className="sticky top-0 z-30 bg-brand-cream/95 backdrop-blur border-b border-brand-gold/30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="flex items-center gap-2 min-h-[44px]">
          <img
            src="/Logo_imagen-1.jpg"
            alt="NailStudio"
            className="w-9 h-9 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'><rect fill='%23FAF5F0' width='100%' height='100%'/></svg>";
            }}
          />
          <span className="font-semibold text-[#3E2723] text-lg">NailStudio</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3 text-sm flex-wrap justify-end">
          <a href="#catalogo" className="text-[#3E2723]/80 hover:text-[#C59B76] hidden sm:inline min-h-[44px] flex items-center">
            Catálogo
          </a>
          <a href="#cotizador" className="text-[#3E2723]/80 hover:text-[#C59B76] hidden sm:inline min-h-[44px] flex items-center">
            Cotizador
          </a>
          <Link to="/admin" className="text-[#3E2723]/40 hover:text-[#C59B76] text-xs min-h-[44px] flex items-center">
            Admin
          </Link>
          <InstallApp />
          {user && (
            <button onClick={handleLogout} className="text-[#3E2723] hover:text-[#C59B76] min-h-[44px] px-2">
              Salir
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}