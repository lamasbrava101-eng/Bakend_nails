import { useEffect, useState } from 'react';
import { TopBar } from '../components/TopBar';
import { apiFetch } from '../api/client';
import type { AppointmentRecord, AppointmentLogRecord } from '../types/appointment';
import type { InventoryItemRecord } from '../types/inventory';
import type { StudioConfigRecord } from '../types/studioConfig';
import type { CatalogService, CatalogEffect, NailLength, ServiceCategory, EffectType } from '../types/catalog';
import { CATEGORY_LABELS } from '../types/catalog';
import { formatDuration } from '../lib/format';

type Tab = 'agenda' | 'bitacora' | 'inventario' | 'config' | 'catalogo';

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-700',
};

function within60Min(startAt: string): boolean {
  const diff = new Date(startAt).getTime() - Date.now();
  return diff >= 0 && diff <= 60 * 60 * 1000;
}

function waLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function Admin() {
  const [tab, setTab] = useState<Tab>('agenda');
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logsTarget, setLogsTarget] = useState<string>('');
  const [logs, setLogs] = useState<AppointmentLogRecord[]>([]);
  const [noteText, setNoteText] = useState('');
  const [inventory, setInventory] = useState<InventoryItemRecord[]>([]);
  const [invForm, setInvForm] = useState({
    name: '',
    brand: '',
    quantity: 0,
    unit: '',
    cost: 0,
    purchasedAt: '',
    notes: '',
  });

  const [studioForm, setStudioForm] = useState<StudioConfigRecord>({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    accountType: '',
    idNumber: '',
    instructions: '',
  });
  const [savingStudio, setSavingStudio] = useState(false);
  const [catalogServices, setCatalogServices] = useState<CatalogService[]>([]);
  const [catalogEffects, setCatalogEffects] = useState<CatalogEffect[]>([]);
  const [catalogLengths, setCatalogLengths] = useState<NailLength[]>([]);

  type ServiceFormState = {
    open: boolean;
    mode: 'create' | 'edit';
    id?: string;
    name: string;
    description: string;
    category: ServiceCategory;
    basePrice: number;
    baseDurationMin: number;
    removalPrice: number;
    removalDurationMin: number;
    imageUrl: string;
    active: boolean;
  };
  const emptyServiceForm = (): ServiceFormState => ({
    open: false,
    mode: 'create',
    name: '',
    description: '',
    category: 'SEMI_PERMANENT',
    basePrice: 0,
    baseDurationMin: 30,
    removalPrice: 0,
    removalDurationMin: 0,
    imageUrl: '',
    active: true,
  });
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(emptyServiceForm());
  const [savingService, setSavingService] = useState(false);

  type EffectFormState = {
    open: boolean;
    mode: 'create' | 'edit';
    id?: string;
    name: string;
    type: EffectType;
    price: number;
    durationMin: number;
    imageUrl: string;
    active: boolean;
  };
  const emptyEffectForm = (): EffectFormState => ({
    open: false,
    mode: 'create',
    name: '',
    type: 'EFFECT',
    price: 0,
    durationMin: 0,
    imageUrl: '',
    active: true,
  });
  const [effectForm, setEffectForm] = useState<EffectFormState>(emptyEffectForm());
  const [savingEffect, setSavingEffect] = useState(false);

  const loadAppointments = async () => {
    try {
      const res = await apiFetch('/admin/appointments');
      if (!res.ok) throw new Error('Error al cargar citas');
      const json = (await res.json()) as { data: AppointmentRecord[] };
      setAppointments(json.data ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const loadInventory = async () => {
    try {
      const res = await apiFetch('/admin/inventory');
      if (!res.ok) throw new Error('Error al cargar inventario');
      const json = (await res.json()) as { data: InventoryItemRecord[] };
      setInventory(json.data ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const loadStudio = async () => {
    try {
      const res = await apiFetch('/admin/studio-config');
      if (!res.ok) throw new Error('Error al cargar configuración');
      const json = (await res.json()) as { data: StudioConfigRecord };
      setStudioForm(json.data);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const loadCatalog = async () => {
    try {
      const [s, e, l] = await Promise.all([
        apiFetch('/catalog/services?includeInactive=true'),
        apiFetch('/catalog/effects?includeInactive=true'),
        apiFetch('/catalog/lengths'),
      ]);
      if (s.ok) setCatalogServices(((await s.json()) as { data: CatalogService[] }).data ?? []);
      if (e.ok) setCatalogEffects(((await e.json()) as { data: CatalogEffect[] }).data ?? []);
      if (l.ok) setCatalogLengths(((await l.json()) as { data: NailLength[] }).data ?? []);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const openCreateService = () => setServiceForm({ ...emptyServiceForm(), open: true, mode: 'create' });
  const openEditService = (s: CatalogService) =>
    setServiceForm({
      open: true,
      mode: 'edit',
      id: s.id,
      name: s.name,
      description: s.description ?? '',
      category: s.category,
      basePrice: s.basePrice,
      baseDurationMin: s.baseDurationMin,
      removalPrice: s.removalPrice ?? 0,
      removalDurationMin: s.removalDurationMin ?? 0,
      imageUrl: s.imageUrl ?? '',
      active: s.active,
    });

  const saveServiceForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingService(true);
    setError(null);
    try {
      const payload = {
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim() || null,
        category: serviceForm.category,
        basePrice: Number(serviceForm.basePrice),
        baseDurationMin: Number(serviceForm.baseDurationMin),
        removalPrice: Number(serviceForm.removalPrice),
        removalDurationMin: Number(serviceForm.removalDurationMin),
        imageUrl: serviceForm.imageUrl.trim() || null,
        active: serviceForm.active,
      };
      const url = serviceForm.mode === 'create' ? '/catalog/services' : `/catalog/services/${serviceForm.id}`;
      const method = serviceForm.mode === 'create' ? 'POST' : 'PUT';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(j?.error?.message ?? 'No se pudo guardar el sistema');
      }
      setServiceForm(emptyServiceForm());
      await loadCatalog();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingService(false);
    }
  };

  const openCreateEffect = () => setEffectForm({ ...emptyEffectForm(), open: true, mode: 'create' });
  const openEditEffect = (ef: CatalogEffect) =>
    setEffectForm({
      open: true,
      mode: 'edit',
      id: ef.id,
      name: ef.name,
      type: ef.type,
      price: ef.price,
      durationMin: ef.durationMin,
      imageUrl: ef.imageUrl ?? '',
      active: ef.active,
    });

  const saveEffectForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEffect(true);
    setError(null);
    try {
      const payload = {
        name: effectForm.name.trim(),
        type: effectForm.type,
        price: Number(effectForm.price),
        durationMin: Number(effectForm.durationMin),
        imageUrl: effectForm.imageUrl.trim() || null,
        active: effectForm.active,
      };
      const url = effectForm.mode === 'create' ? '/catalog/effects' : `/catalog/effects/${effectForm.id}`;
      const method = effectForm.mode === 'create' ? 'POST' : 'PUT';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(j?.error?.message ?? 'No se pudo guardar el efecto');
      }
      setEffectForm(emptyEffectForm());
      await loadCatalog();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingEffect(false);
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

  useEffect(() => {
    if (tab === 'inventario') void loadInventory();
    if (tab === 'config') void loadStudio();
    if (tab === 'bitacora' && appointments.length === 0) void loadAppointments();
    if (tab === 'catalogo') void loadCatalog();
  }, [tab]);

  // browser notifications for appointments within 60 min
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    const notified = new Set<string>();
    const check = () => {
      for (const a of appointments) {
        if (a.status !== 'CONFIRMED' && a.status !== 'PENDING_PAYMENT') continue;
        if (!within60Min(a.startAt)) continue;
        if (notified.has(a.id)) continue;
        if (Notification.permission === 'granted') {
          new Notification('NailStudio - Cita en 1 hora', {
            body: `${a.clientName} - ${a.serviceName} a las ${new Date(a.startAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`,
          });
          notified.add(a.id);
        }
      }
    };
    const interval = setInterval(check, 60000);
    check();
    return () => clearInterval(interval);
  }, [appointments]);

  const doAction = async (id: string, action: 'approve' | 'reject' | 'complete' | 'cancel') => {
    setError(null);
    try {
      const res = await apiFetch(`/admin/appointments/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'cancel' ? JSON.stringify({ reason: 'Cancelada por admin' }) : undefined,
      });
      if (!res.ok) throw new Error('Acción no disponible');
      await loadAppointments();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const loadLogs = async (id: string) => {
    setLogsTarget(id);
    try {
      const res = await apiFetch(`/admin/appointments/${id}/logs`);
      if (!res.ok) throw new Error('Error al cargar bitácora');
      const json = (await res.json()) as { data: AppointmentLogRecord[] };
      setLogs(json.data ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const addNote = async () => {
    if (!logsTarget || !noteText.trim()) return;
    try {
      const res = await apiFetch(`/admin/appointments/${logsTarget}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText.trim() }),
      });
      if (!res.ok) throw new Error('No se pudo guardar la nota');
      setNoteText('');
      await loadLogs(logsTarget);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submitInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiFetch('/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: invForm.name,
          brand: invForm.brand || null,
          quantity: invForm.quantity,
          unit: invForm.unit,
          cost: invForm.cost,
          purchasedAt: invForm.purchasedAt || null,
          notes: invForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error('No se pudo crear item');
      setInvForm({ name: '', brand: '', quantity: 0, unit: '', cost: 0, purchasedAt: '', notes: '' });
      await loadInventory();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const deleteInventory = async (id: string) => {
    try {
      const res = await apiFetch(`/admin/inventory/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo eliminar');
      await loadInventory();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStudio(true);
    setError(null);
    try {
      const res = await apiFetch('/admin/studio-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studioForm),
      });
      if (!res.ok) throw new Error('No se pudo guardar');
      const json = (await res.json()) as { data: StudioConfigRecord };
      setStudioForm(json.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingStudio(false);
    }
  };

  return (
    <div className="min-h-full bg-brand-cream">
      <TopBar />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-brand-cacao">Panel de Administración</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex overflow-x-auto gap-2 whitespace-nowrap scrollbar-hide pb-1">
          {(['agenda', 'bitacora', 'inventario', 'config', 'catalogo'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border whitespace-nowrap min-h-[44px] ${
                tab === t
                  ? 'bg-[#C59B76] text-white border-[#C59B76] hover:bg-[#B8895E]'
                  : 'bg-[#F2DFD8] text-[#3E2723] border-[#C59B76] hover:bg-[#E8D0C8]'
              }`}
            >
              {t === 'agenda' ? 'Agenda' : t === 'bitacora' ? 'Bitácora' : t === 'inventario' ? 'Inventario' : t === 'config' ? 'Configuración' : 'Catálogo'}
            </button>
          ))}
        </div>

        {tab === 'agenda' && (
          <div className="space-y-4">
            {appointments.map((a) => {
              const urgent = within60Min(a.startAt);
              return (
                <div
                  key={a.id}
                  className={`bg-brand-pearl rounded-2xl shadow-soft border p-4 space-y-2 ${
                    urgent ? 'border-brand-gold border-2' : 'border-brand-gold/30'
                  }`}
                >
                  {urgent && (
                    <p className="text-brand-gold font-semibold text-sm">¡En 1 hora!</p>
                  )}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-brand-cacao">{a.clientName}</p>
                      <p className="text-xs text-brand-cacao/60">{a.clientPhone} · {a.clientEmail}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </div>
                  <p className="text-sm text-brand-cacao">
                    {a.serviceName} · {new Date(a.startAt).toLocaleString('es-EC')} – {new Date(a.endAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-brand-cacao/60">Duración {formatDuration(a.durationMin)} · Total ${a.priceTotal.toFixed(2)}</p>
                  {a.voucherUrl && (
                    <div>
                      <a
                        href={a.voucherUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-brand-gold underline"
                      >
                        Ver comprobante
                      </a>
                      {a.voucherUrl.startsWith('data:image') && (
                        <img src={a.voucherUrl} alt="comprobante" className="mt-2 max-h-40 rounded-lg" />
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {a.status === 'PENDING_PAYMENT' && (
                      <>
                        <button onClick={() => doAction(a.id, 'approve')} className="px-3 py-1.5 bg-[#C59B76] text-white rounded-lg text-xs font-semibold hover:bg-[#B8895E] min-h-[36px]">
                          Aprobar
                        </button>
                        <button onClick={() => doAction(a.id, 'reject')} className="px-3 py-1.5 bg-[#E57373] text-white rounded-lg text-xs font-semibold hover:bg-[#C62828] min-h-[36px]">
                          Rechazar
                        </button>
                      </>
                    )}
                    {a.status === 'CONFIRMED' && (
                      <button onClick={() => doAction(a.id, 'complete')} className="px-3 py-1.5 bg-[#C59B76] text-white rounded-lg text-xs font-semibold hover:bg-[#B8895E] min-h-[36px]">
                        Completar
                      </button>
                    )}
                    {(a.status === 'PENDING_PAYMENT' || a.status === 'CONFIRMED') && (
                      <button onClick={() => doAction(a.id, 'cancel')} className="px-3 py-1.5 bg-[#E57373] text-white rounded-lg text-xs font-semibold hover:bg-[#C62828] min-h-[36px]">
                        Cancelar
                      </button>
                    )}
                    <a
                      href={waLink(a.clientPhone, `Hola ${a.clientName}, te recordamos tu cita de ${a.serviceName} el ${new Date(a.startAt).toLocaleString('es-EC')}.`)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-[#C59B76] text-white rounded-lg text-xs font-semibold hover:bg-[#B8895E] min-h-[36px]"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
            {appointments.length === 0 && <p className="text-brand-cacao/60">Sin citas.</p>}
          </div>
        )}

        {tab === 'bitacora' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-cacao mb-1">Cita</label>
              <select
                value={logsTarget}
                onChange={(e) => {
                  const v = e.target.value;
                  setLogsTarget(v);
                  if (v) void loadLogs(v);
                }}
                className="border border-brand-gold/40 rounded-lg px-3 py-2 w-full max-w-md"
              >
                <option value="">Selecciona una cita</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.clientName} - {a.serviceName} - {new Date(a.startAt).toLocaleDateString('es-EC')}
                  </option>
                ))}
              </select>
            </div>
            {logsTarget && (
              <>
                <div className="flex gap-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Nota de bitácora..."
                    className="flex-1 border border-brand-gold/40 rounded-lg px-3 py-2"
                    rows={3}
                  />
                  <button onClick={addNote} className="px-4 py-2 bg-[#C59B76] text-white rounded-lg text-sm font-semibold hover:bg-[#B8895E] self-end min-h-[44px]">
                    Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {logs.map((l) => (
                    <div key={l.id} className="bg-brand-pearl rounded-xl border border-brand-gold/30 p-3">
                      <p className="text-sm text-brand-cacao">{l.note}</p>
                      <p className="text-xs text-brand-cacao/50 mt-1">{new Date(l.createdAt).toLocaleString('es-EC')}</p>
                    </div>
                  ))}
                  {logs.length === 0 && <p className="text-brand-cacao/60 text-sm">Sin notas.</p>}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'inventario' && (
          <div className="space-y-6">
            <form onSubmit={submitInventory} className="bg-brand-pearl rounded-2xl shadow-soft border border-brand-gold/30 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                placeholder="Nombre"
                value={invForm.name}
                onChange={(e) => setInvForm({ ...invForm, name: e.target.value })}
                className="border border-brand-gold/40 rounded-lg px-3 py-2"
                required
              />
              <input
                placeholder="Marca"
                value={invForm.brand}
                onChange={(e) => setInvForm({ ...invForm, brand: e.target.value })}
                className="border border-brand-gold/40 rounded-lg px-3 py-2"
              />
              <input
                type="number"
                placeholder="Cantidad"
                value={invForm.quantity}
                onChange={(e) => setInvForm({ ...invForm, quantity: Number(e.target.value) })}
                className="border border-brand-gold/40 rounded-lg px-3 py-2"
                required
              />
              <input
                placeholder="Unidad"
                value={invForm.unit}
                onChange={(e) => setInvForm({ ...invForm, unit: e.target.value })}
                className="border border-brand-gold/40 rounded-lg px-3 py-2"
                required
              />
              <input
                type="number"
                placeholder="Costo"
                value={invForm.cost}
                onChange={(e) => setInvForm({ ...invForm, cost: Number(e.target.value) })}
                className="border border-brand-gold/40 rounded-lg px-3 py-2"
              />
              <input
                type="date"
                value={invForm.purchasedAt}
                onChange={(e) => setInvForm({ ...invForm, purchasedAt: e.target.value })}
                className="border border-brand-gold/40 rounded-lg px-3 py-2"
              />
              <input
                placeholder="Notas"
                value={invForm.notes}
                onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })}
                className="border border-brand-gold/40 rounded-lg px-3 py-2 sm:col-span-2"
              />
              <button type="submit" className="sm:col-span-2 bg-[#C59B76] text-white font-semibold py-2 rounded-lg hover:bg-[#B8895E] min-h-[44px]">
                Agregar insumo
              </button>
            </form>

            <div className="space-y-3">
              {inventory.map((i) => (
                <div key={i.id} className="bg-brand-pearl rounded-xl border border-brand-gold/30 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-brand-cacao">{i.name} {i.brand ? `(${i.brand})` : ''}</p>
                    <p className="text-xs text-brand-cacao/60">
                      {i.quantity} {i.unit} · costo ${i.cost.toFixed(2)}
                      {i.purchasedAt ? ` · ${i.purchasedAt}` : ''}
                    </p>
                    {i.notes && <p className="text-xs text-brand-cacao/50">{i.notes}</p>}
                  </div>
                  <button onClick={() => deleteInventory(i.id)} className="text-[#C62828] text-sm hover:underline min-h-[36px]">
                    Eliminar
                  </button>
                </div>
              ))}
              {inventory.length === 0 && <p className="text-brand-cacao/60">Sin insumos.</p>}
            </div>
          </div>
        )}

        {tab === 'config' && (
          <form onSubmit={saveStudio} className="bg-brand-pearl rounded-2xl shadow-soft border border-brand-gold/30 p-6 space-y-3 max-w-2xl">
            {(['bankName', 'accountHolder', 'accountNumber', 'accountType', 'idNumber', 'instructions'] as const).map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-brand-cacao mb-1">
                  {field === 'bankName'
                    ? 'Banco'
                    : field === 'accountHolder'
                    ? 'Titular'
                    : field === 'accountNumber'
                    ? 'Número de cuenta'
                    : field === 'accountType'
                    ? 'Tipo de cuenta'
                    : field === 'idNumber'
                    ? 'Cédula/RUC'
                    : 'Instrucciones'}
                </label>
                {field === 'instructions' ? (
                  <textarea
                    value={studioForm[field]}
                    onChange={(e) => setStudioForm({ ...studioForm, [field]: e.target.value })}
                    className="w-full border border-brand-gold/40 rounded-lg px-3 py-2"
                    rows={3}
                  />
                ) : (
                  <input
                    value={studioForm[field]}
                    onChange={(e) => setStudioForm({ ...studioForm, [field]: e.target.value })}
                    className="w-full border border-brand-gold/40 rounded-lg px-3 py-2"
                  />
                )}
              </div>
            ))}
            <button
              type="submit"
              disabled={savingStudio}
              className="bg-[#C59B76] text-white font-semibold py-2 px-4 rounded-lg hover:bg-[#B8895E] disabled:opacity-50 min-h-[44px]"
            >
              {savingStudio ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </form>
        )}

        {tab === 'catalogo' && (
          <div className="space-y-6">
            <div className="bg-brand-pearl rounded-2xl border border-brand-gold/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="font-semibold text-brand-cacao">Sistemas / Servicios</h2>
                <button
                  type="button"
                  onClick={openCreateService}
                  className="px-4 py-2 rounded-lg bg-[#C59B76] text-white text-sm font-semibold hover:bg-[#B8895E] min-h-[44px] shadow-soft"
                >
                  + Agregar nuevo sistema
                </button>
              </div>
              <div className="space-y-3">
                {catalogServices.map((s) => (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-brand-gold/20 pb-3">
                    <div className="flex gap-3 min-w-0">
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.name} className="w-16 h-16 rounded-lg object-cover border border-brand-gold/30 flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-[#F2DFD8] border border-brand-gold/30 flex items-center justify-center text-xs text-[#3E2723]/60 flex-shrink-0">Sin foto</div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-brand-cacao text-sm">{s.name}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${s.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                            {s.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <div className="text-xs text-brand-cacao/70 mt-0.5">
                          {CATEGORY_LABELS[s.category] ?? s.category} · Base ${s.basePrice.toFixed(2)} · {formatDuration(s.baseDurationMin)}
                        </div>
                        <div className="text-xs text-brand-cacao/70">
                          Retiro: ${Number(s.removalPrice ?? 0).toFixed(2)} · {formatDuration(Number(s.removalDurationMin ?? 0))}
                        </div>
                        {s.description && <p className="text-xs text-brand-cacao/60 mt-1 line-clamp-2">{s.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditService(s)}
                        className="px-3 py-1.5 rounded-lg bg-[#F2DFD8] text-[#3E2723] border border-[#C59B76] text-sm font-medium hover:bg-[#E8D0C8] min-h-[36px]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`¿Eliminar "${s.name}"?`)) return;
                          const res = await apiFetch(`/catalog/services/${s.id}`, { method: 'DELETE' });
                          if (res.ok) await loadCatalog();
                          else setError('No se pudo eliminar el sistema');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#E57373] text-white text-sm font-medium hover:bg-[#C62828] min-h-[36px]"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {catalogServices.length === 0 && <p className="text-sm text-brand-cacao/60">No hay sistemas registrados.</p>}
              </div>
            </div>

            <div className="bg-brand-pearl rounded-2xl border border-brand-gold/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="font-semibold text-brand-cacao">Efectos y extras</h2>
                <button
                  type="button"
                  onClick={openCreateEffect}
                  className="px-4 py-2 rounded-lg bg-[#C59B76] text-white text-sm font-semibold hover:bg-[#B8895E] min-h-[44px] shadow-soft"
                >
                  + Agregar nuevo efecto
                </button>
              </div>
              <div className="space-y-3">
                {catalogEffects.map((ef) => (
                  <div key={ef.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-gold/20 pb-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-brand-cacao text-sm">{ef.name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F2DFD8] text-[#3E2723] border border-[#C59B76]/40">
                          {ef.type === 'REMOVAL' ? 'Retiro' : 'Efecto'}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${ef.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                          {ef.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="text-xs text-brand-cacao/70 mt-0.5">
                        +${ef.price.toFixed(2)} · +{formatDuration(ef.durationMin)}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditEffect(ef)}
                        className="px-3 py-1.5 rounded-lg bg-[#F2DFD8] text-[#3E2723] border border-[#C59B76] text-sm font-medium hover:bg-[#E8D0C8] min-h-[36px]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`¿Eliminar "${ef.name}"?`)) return;
                          const res = await apiFetch(`/catalog/effects/${ef.id}`, { method: 'DELETE' });
                          if (res.ok) await loadCatalog();
                          else setError('No se pudo eliminar el efecto');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#E57373] text-white text-sm font-medium hover:bg-[#C62828] min-h-[36px]"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {catalogEffects.length === 0 && <p className="text-sm text-brand-cacao/60">No hay efectos registrados.</p>}
              </div>
            </div>

            <div className="bg-brand-pearl rounded-2xl border border-brand-gold/30 p-4">
              <h2 className="font-semibold text-brand-cacao mb-3">Largos de uña</h2>
              <div className="space-y-2">
                {catalogLengths.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 border-b border-brand-gold/20 pb-2">
                    <div>
                      <div className="font-medium text-brand-cacao text-sm">{l.label} ({l.code})</div>
                      <div className="text-xs text-brand-cacao/60">+${l.priceModifier.toFixed(2)} · +{formatDuration(l.durationModifier)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const label = window.prompt('Etiqueta:', l.label);
                          if (label === null) return;
                          const priceStr = window.prompt('Modificador precio:', String(l.priceModifier));
                          if (priceStr === null) return;
                          const durStr = window.prompt('Modificador duración (min):', String(l.durationModifier));
                          if (durStr === null) return;
                          const res = await apiFetch(`/catalog/lengths/${l.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ label, priceModifier: Number(priceStr), durationModifier: Number(durStr) }),
                          });
                          if (res.ok) await loadCatalog();
                          else setError('No se pudo editar');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#F2DFD8] text-[#3E2723] border border-[#C59B76] text-sm font-medium hover:bg-[#E8D0C8] min-h-[36px]"
                      >
                        Editar
                      </button>
                      <button
                        onClick={async () => {
                          const res = await apiFetch(`/catalog/lengths/${l.id}`, { method: 'DELETE' });
                          if (res.ok) await loadCatalog();
                          else setError('No se pudo eliminar');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#E57373] text-white text-sm font-medium hover:bg-[#C62828] min-h-[36px]"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {serviceForm.open && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setServiceForm(emptyServiceForm())}>
                <div className="bg-brand-pearl rounded-2xl shadow-soft border border-brand-gold/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold text-brand-cacao mb-4">
                    {serviceForm.mode === 'create' ? 'Agregar nuevo sistema' : 'Editar sistema'}
                  </h3>
                  <form onSubmit={saveServiceForm} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="sm:col-span-2 text-sm text-brand-cacao">
                      Nombre del sistema *
                      <input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} required className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px]" />
                    </label>
                    <label className="sm:col-span-2 text-sm text-brand-cacao">
                      Descripción
                      <textarea value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} rows={2} className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2" />
                    </label>
                    <label className="text-sm text-brand-cacao">
                      Categoría *
                      <select value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value as ServiceCategory })} className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px] bg-white">
                        <option value="ACRYLIC">Acrílicas</option>
                        <option value="SOFT_GEL">Soft Gel</option>
                        <option value="SEMI_PERMANENT">Semi-permanente</option>
                        <option value="NAIL_ART">Nail Art</option>
                      </select>
                    </label>
                    <label className="text-sm text-brand-cacao">
                      Estado
                      <select value={serviceForm.active ? 'active' : 'inactive'} onChange={(e) => setServiceForm({ ...serviceForm, active: e.target.value === 'active' })} className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px] bg-white">
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                      </select>
                    </label>
                    <label className="text-sm text-brand-cacao">
                      Precio base ($) *
                      <input type="number" step="0.01" min="0" value={serviceForm.basePrice} onChange={(e) => setServiceForm({ ...serviceForm, basePrice: Number(e.target.value) })} required className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px]" />
                    </label>
                    <label className="text-sm text-brand-cacao">
                      Duración base (min) *
                      <input type="number" min="1" value={serviceForm.baseDurationMin} onChange={(e) => setServiceForm({ ...serviceForm, baseDurationMin: Number(e.target.value) })} required className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px]" />
                    </label>
                    <label className="text-sm text-brand-cacao">
                      Costo adicional de retiro ($)
                      <input type="number" step="0.01" min="0" value={serviceForm.removalPrice} onChange={(e) => setServiceForm({ ...serviceForm, removalPrice: Number(e.target.value) })} className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px]" />
                    </label>
                    <label className="text-sm text-brand-cacao">
                      Tiempo adicional de retiro (min)
                      <input type="number" min="0" value={serviceForm.removalDurationMin} onChange={(e) => setServiceForm({ ...serviceForm, removalDurationMin: Number(e.target.value) })} className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px]" />
                    </label>
                    <label className="sm:col-span-2 text-sm text-brand-cacao">
                      Foto / imagen (URL)
                      <input type="url" placeholder="https://..." value={serviceForm.imageUrl} onChange={(e) => setServiceForm({ ...serviceForm, imageUrl: e.target.value })} className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px]" />
                    </label>
                    <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setServiceForm(emptyServiceForm())} className="px-4 py-2 rounded-lg bg-[#F2DFD8] text-[#3E2723] border border-[#C59B76] font-semibold min-h-[44px] hover:bg-[#E8D0C8]">
                        Cancelar
                      </button>
                      <button type="submit" disabled={savingService} className="px-4 py-2 rounded-lg bg-[#C59B76] text-white font-semibold min-h-[44px] hover:bg-[#B8895E] disabled:opacity-50">
                        {savingService ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {effectForm.open && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEffectForm(emptyEffectForm())}>
                <div className="bg-brand-pearl rounded-2xl shadow-soft border border-brand-gold/30 w-full max-w-xl max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold text-brand-cacao mb-4">
                    {effectForm.mode === 'create' ? 'Agregar nuevo efecto' : 'Editar efecto'}
                  </h3>
                  <form onSubmit={saveEffectForm} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="sm:col-span-2 text-sm text-brand-cacao">
                      Nombre del efecto *
                      <input value={effectForm.name} onChange={(e) => setEffectForm({ ...effectForm, name: e.target.value })} required className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px]" />
                    </label>
                    <label className="text-sm text-brand-cacao">
                      Tipo *
                      <select value={effectForm.type} onChange={(e) => setEffectForm({ ...effectForm, type: e.target.value as EffectType })} className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px] bg-white">
                        <option value="EFFECT">Efecto / extra</option>
                        <option value="REMOVAL">Retiro</option>
                      </select>
                    </label>
                    <label className="text-sm text-brand-cacao">
                      Estado
                      <select value={effectForm.active ? 'active' : 'inactive'} onChange={(e) => setEffectForm({ ...effectForm, active: e.target.value === 'active' })} className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px] bg-white">
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                      </select>
                    </label>
                    <label className="text-sm text-brand-cacao">
                      Precio adicional ($) *
                      <input type="number" step="0.01" min="0" value={effectForm.price} onChange={(e) => setEffectForm({ ...effectForm, price: Number(e.target.value) })} required className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px]" />
                    </label>
                    <label className="text-sm text-brand-cacao">
                      Tiempo extra (min) *
                      <input type="number" min="0" value={effectForm.durationMin} onChange={(e) => setEffectForm({ ...effectForm, durationMin: Number(e.target.value) })} required className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px]" />
                    </label>
                    <label className="sm:col-span-2 text-sm text-brand-cacao">
                      Imagen (URL, opcional)
                      <input type="url" placeholder="https://..." value={effectForm.imageUrl} onChange={(e) => setEffectForm({ ...effectForm, imageUrl: e.target.value })} className="mt-1 w-full border border-brand-gold/40 rounded-lg px-3 py-2 min-h-[44px]" />
                    </label>
                    <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setEffectForm(emptyEffectForm())} className="px-4 py-2 rounded-lg bg-[#F2DFD8] text-[#3E2723] border border-[#C59B76] font-semibold min-h-[44px] hover:bg-[#E8D0C8]">
                        Cancelar
                      </button>
                      <button type="submit" disabled={savingEffect} className="px-4 py-2 rounded-lg bg-[#C59B76] text-white font-semibold min-h-[44px] hover:bg-[#B8895E] disabled:opacity-50">
                        {savingEffect ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
