import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import type { AppointmentRecord } from '../types/appointment';
import type { StudioConfigRecord } from '../types/studioConfig';
import { formatDuration } from '../lib/format';

const DEFAULT_STUDIO: StudioConfigRecord = {
  bankName: 'Banco (configurar)',
  accountHolder: 'NailStudio',
  accountNumber: '0000000000',
  accountType: 'Ahorros',
  idNumber: '0000000000',
  instructions: 'Transferir $5.00 y subir comprobante.',
};

interface Props {
  open: boolean;
  onClose: () => void;
  serviceId: string;
  serviceName: string;
  length: string;
  effectIds: string[];
  includeRemoval: boolean;
  durationMin: number;
  priceTotal: number;
}

type Step = 'slot' | 'transfer' | 'details' | 'success';

export function BookingModal({
  open,
  onClose,
  serviceId,
  serviceName,
  length,
  effectIds,
  includeRemoval,
  durationMin,
  priceTotal,
}: Props) {
  const [step, setStep] = useState<Step>('slot');
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [studio, setStudio] = useState<StudioConfigRecord>(DEFAULT_STUDIO);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [voucherData, setVoucherData] = useState<string | null>(null);
  const [voucherName, setVoucherName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);

  useEffect(() => {
    if (!open) return;
    // reset
    setStep('slot');
    setSelectedSlot(null);
    setError(null);
    setAppointment(null);
    setVoucherData(null);
    setVoucherName('');
    // fetch studio config (public) with fallback
    (async () => {
      try {
        const res = await apiFetch('/studio-config');
        if (res.ok) {
          const json = (await res.json()) as { data: StudioConfigRecord };
          if (json?.data) setStudio(json.data);
        }
      } catch {
        // fallback defaults
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingSlots(true);
      setSlots([]);
      try {
        const res = await apiFetch(
          `/availability?date=${encodeURIComponent(date)}&durationMin=${durationMin}`,
        );
        if (!res.ok) throw new Error('No se pudo cargar disponibilidad');
        const json = (await res.json()) as { data: string[] };
        if (!cancelled) setSlots(json.data ?? []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, date, durationMin]);

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setVoucherData(typeof reader.result === 'string' ? reader.result : null);
      setVoucherName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!selectedSlot) {
      setError('Selecciona un horario');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch('/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientPhone,
          clientEmail,
          serviceId,
          length,
          effectIds,
          includeRemoval,
          startAt: selectedSlot,
        }),
      });
      if (!res.ok) {
        let msg = 'No se pudo crear la cita';
        try {
          const json = (await res.json()) as { error?: { message?: string } };
          if (json?.error?.message) msg = json.error.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      const json = (await res.json()) as { data: AppointmentRecord };
      const appt = json.data;
      if (voucherData) {
        const vRes = await apiFetch(`/appointments/${appt.id}/voucher`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voucherData }),
        });
        if (vRes.ok) {
          const vJson = (await vRes.json()) as { data: AppointmentRecord };
          setAppointment(vJson.data);
        } else {
          setAppointment(appt);
        }
      } else {
        setAppointment(appt);
      }
      setStep('success');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const formatSlot = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-x-hidden">
      <div className="w-full max-w-full sm:max-w-2xl bg-brand-pearl rounded-2xl shadow-soft border border-brand-gold/30 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-brand-gold/20">
          <h2 className="text-lg font-bold text-brand-cacao">Reservar cita</h2>
          <button onClick={onClose} className="text-[#3E2723] hover:text-[#C59B76] text-xl min-h-[44px] min-w-[44px] flex items-center justify-center">
            ×
          </button>
        </div>
        <div className="p-4 space-y-4">
          {step === 'slot' && (
            <>
              <div>
                <label className="block text-sm font-medium text-brand-cacao mb-1">Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-[#C59B76]/40 rounded-lg px-3 py-2 min-h-[44px]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-cacao mb-2">Horarios disponibles</p>
                {loadingSlots && <p className="text-sm text-brand-cacao/60">Cargando...</p>}
                {!loadingSlots && slots.length === 0 && (
                  <p className="text-sm text-brand-cacao/60">No hay horarios disponibles.</p>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSlot(s)}
                      className={`min-h-[44px] px-3 py-2 rounded-lg text-sm border transition ${
                        selectedSlot === s
                          ? 'bg-[#C59B76] text-white border-[#C59B76] font-semibold'
                          : 'bg-[#F2DFD8] text-[#3E2723] border-[#C59B76] hover:bg-[#E8D0C8] font-semibold'
                      }`}
                    >
                      {formatSlot(s)}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-[#3E2723] hover:text-[#C59B76] min-h-[44px]">
                  Cancelar
                </button>
                <button
                  disabled={!selectedSlot}
                  onClick={() => setStep('transfer')}
                  className="px-4 py-2 bg-[#C59B76] text-white rounded-lg text-sm font-semibold hover:bg-[#B8895E] disabled:opacity-50 min-h-[44px]"
                >
                  Continuar
                </button>
              </div>
            </>
          )}

          {step === 'transfer' && (
            <>
              <div className="bg-brand-cream rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-brand-cacao">Resumen</h3>
                <div className="flex justify-between text-sm">
                  <span>Servicio</span>
                  <span className="font-medium">{serviceName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Duración</span>
                  <span>{formatDuration(durationMin)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Precio total</span>
                  <span>${priceTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Depósito</span>
                  <span>$5.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Saldo pendiente</span>
                  <span>${Math.max(0, priceTotal - 5).toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-brand-cream rounded-xl p-4 space-y-1">
                <h3 className="font-semibold text-brand-cacao">Datos bancarios</h3>
                <p className="text-sm">Banco: {studio.bankName}</p>
                <p className="text-sm">Titular: {studio.accountHolder}</p>
                <p className="text-sm">Cuenta: {studio.accountNumber}</p>
                <p className="text-sm">Tipo: {studio.accountType}</p>
                <p className="text-sm">ID: {studio.idNumber}</p>
                {studio.instructions && <p className="text-sm italic">{studio.instructions}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setStep('slot')} className="px-4 py-2 text-sm text-[#3E2723] hover:text-[#C59B76] min-h-[44px]">
                  Atrás
                </button>
                <button
                  onClick={() => setStep('details')}
                  className="px-4 py-2 bg-[#C59B76] text-white rounded-lg text-sm font-semibold hover:bg-[#B8895E] min-h-[44px]"
                >
                  Ya realicé la transferencia
                </button>
              </div>
            </>
          )}

          {step === 'details' && (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-brand-cacao mb-1">Nombre</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full border border-brand-gold/40 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-cacao mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full border border-brand-gold/40 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-cacao mb-1">Correo</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full border border-brand-gold/40 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-cacao mb-1">Comprobante (imagen)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm min-h-[44px]"
                  />
                  {voucherName && <p className="text-xs text-brand-cacao/60 mt-1">{voucherName}</p>}
                </div>
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setStep('transfer')} className="px-4 py-2 text-sm text-[#3E2723] hover:text-[#C59B76] min-h-[44px]">
                  Atrás
                </button>
                <button
                  disabled={submitting}
                  onClick={submit}
                  className="px-4 py-2 bg-[#C59B76] text-white rounded-lg text-sm font-semibold hover:bg-[#B8895E] disabled:opacity-50 min-h-[44px]"
                >
                  {submitting ? 'Enviando...' : 'Confirmar reserva'}
                </button>
              </div>
            </>
          )}

          {step === 'success' && appointment && (
            <div className="space-y-3 text-center">
              <h3 className="text-xl font-bold text-brand-cacao">¡Reserva recibida!</h3>
              <p className="text-brand-cacao/80">Tu cita está pendiente de confirmación.</p>
              <div className="bg-brand-cream rounded-xl p-4 text-left space-y-1">
                <p className="text-sm">Servicio: {appointment.serviceName}</p>
                <p className="text-sm">Fecha: {new Date(appointment.startAt).toLocaleString('es-EC')}</p>
                <p className="text-sm">Duración: {formatDuration(appointment.durationMin)}</p>
                <p className="text-sm">Total: ${appointment.priceTotal.toFixed(2)}</p>
                <p className="text-sm">Estado: {appointment.status}</p>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#C59B76] text-white rounded-lg text-sm font-semibold hover:bg-[#B8895E] min-h-[44px]"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
