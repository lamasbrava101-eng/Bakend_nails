import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/client';
import { InstallApp } from '../components/InstallApp';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        let msg = 'Credenciales inválidas';
        try {
          const json = (await res.json()) as { error?: { message?: string } };
          if (json?.error?.message) msg = json.error.message;
        } catch {
          // ignore
        }
        setError(msg);
        return;
      }
      const json = (await res.json()) as { data: { accessToken: string; user: Parameters<typeof login>[1] } };
      login(json.data.accessToken, json.data.user);
      navigate('/', { replace: true });
    } catch {
      setError('Error de red');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-brand-cream p-4 gap-4">
      <div className="w-full max-w-md bg-brand-pearl rounded-2xl shadow-soft border border-brand-gold/30 p-8">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/Logo_imagen-1.jpg"
            alt="NailStudio"
            className="w-24 h-24 object-contain mb-2"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect fill='%23FAF5F0' width='100%' height='100%'/></svg>";
            }}
          />
          <h1 className="text-2xl font-bold text-brand-cacao">NailStudio</h1>
          <p className="text-sm text-brand-cacao/70">Iniciar sesión</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-cacao mb-1" htmlFor="email">
              Correo
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-brand-gold/40 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-gold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-cacao mb-1" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-brand-gold/40 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-gold"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#C59B76] text-white font-semibold py-2 rounded-lg shadow-soft hover:bg-[#B8895E] disabled:opacity-60 min-h-[44px]"
          >
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="text-sm text-center text-brand-cacao/80 mt-4">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-semibold underline">
            Regístrate
          </Link>
        </p>
      </div>
      <InstallApp />
    </div>
  );
}