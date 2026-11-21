import { store } from '../store/inMemoryStore.js';
import { appointmentRepo } from '../repositories/appointment.repo.js';
import { studyMinutesOfDay } from '../utils/time.js';
import { sendWhatsAppReminder } from './whatsapp.service.js';
import type { AppointmentRecord } from '../types/index.js';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function hhmmLocal(dateIso: string): string {
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return '--:--';
  const min = studyMinutesOfDay(d);
  const m = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

function logStructured(event: string, payload: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ level: payload.ok === false ? 'warn' : 'info', event, ts: new Date().toISOString(), ...payload }));
}

function buildMessages(appt: AppointmentRecord) {
  const startTime = hhmmLocal(appt.startAt);
  const endTime = hhmmLocal(appt.endAt);
  const service = appt.serviceName || 'Servicio';
  const clientName = appt.clientName || 'Clienta';
  return {
    client: `Hola ${clientName}, te recordamos tu cita en Nb_nails hoy a las ${startTime} - ${endTime} (${service}). ¡Te esperamos!`,
    manicurist: `Recordatorio Nb_nails (en 1 hora): Cita con ${clientName} a las ${startTime} - ${endTime} (${service}).`,
    admin: `Recordatorio Nb_nails (en 1 hora): Turno ${startTime} - ${endTime} con ${clientName} (${service}).`,
  };
}

function eligibleFor1hReminder(appt: AppointmentRecord, nowMs: number): boolean {
  if (appt.deletedAt) return false;
  if (appt.status !== 'CONFIRMED') return false;
  if (appt.reminder1hSentAt) return false;
  const startMs = new Date(appt.startAt).getTime();
  if (!Number.isFinite(startMs)) return false;
  const diff = startMs - nowMs;
  const minMs = 55 * 60 * 1000;
  const maxMs = 65 * 60 * 1000;
  return diff >= minMs && diff <= maxMs;
}

export async function processWhatsApp1hReminders(): Promise<void> {
  const nowMs = Date.now();
  const config = store.studioConfig;
  const candidates = [...store.appointments.values()].filter((a) => eligibleFor1hReminder(a, nowMs));

  for (const appt of candidates) {
    // Re-check idempotency (in case of overlapping runs)
    const current = store.appointments.get(appt.id);
    if (!current || current.deletedAt || current.status !== 'CONFIRMED' || current.reminder1hSentAt) continue;

    const messages = buildMessages(current);
    const targets = [
      { recipient: 'client' as const, to: current.clientPhone, body: messages.client },
      { recipient: 'manicurist' as const, to: config.manicuristWhatsappPhone, body: messages.manicurist },
      { recipient: 'admin' as const, to: config.adminWhatsappPhone, body: messages.admin },
    ];

    // Marcar inmediatamente para garantizar idempotencia total y cero duplicados
    const sentAt = new Date().toISOString();
    appointmentRepo.update(current.id, {
      reminder1hSentAt: sentAt,
      reminder1hStatus: 'SENT',
    });

    const results = [] as Array<Record<string, unknown>>;
    for (const t of targets) {
      try {
        const r = await sendWhatsAppReminder({
          to: t.to || '',
          body: t.body,
          recipient: t.recipient,
          appointmentId: current.id,
        });
        results.push({ recipient: r.recipient, ok: r.ok, provider: r.provider, to: r.to, skipped: r.skipped ?? false, error: r.error ?? null });
      } catch (e) {
        results.push({ recipient: t.recipient, ok: false, provider: 'unknown', to: t.to || '', skipped: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    logStructured('whatsapp.reminder1h.processed', {
      appointmentId: current.id,
      startAt: current.startAt,
      sentAt,
      status: 'SENT',
      results,
    });
  }
}
