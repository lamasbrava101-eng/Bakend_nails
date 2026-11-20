import { TopBar } from '../components/TopBar';

export function MyAppointments() {
  return (
    <div className="min-h-full bg-brand-cream">
      <TopBar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-brand-cacao mb-2">Mis Citas</h1>
        <p className="text-brand-cacao/70">Aquí verás tus próximas citas. Próximamente.</p>
      </main>
    </div>
  );
}