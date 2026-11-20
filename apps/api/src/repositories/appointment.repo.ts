import { store } from '../store/inMemoryStore.js';
import type {
  AppointmentRecord,
  AppointmentLogRecord,
  AppointmentStatus,
} from '../types/index.js';

export const appointmentRepo = {
  list(filter?: { status?: AppointmentStatus; from?: string; to?: string }): AppointmentRecord[] {
    let items = [...store.appointments.values()].filter((a) => !a.deletedAt);
    if (filter?.status) items = items.filter((a) => a.status === filter.status);
    if (filter?.from) {
      const from = parseBound(filter.from, false);
      items = items.filter((a) => new Date(a.startAt).getTime() >= from.getTime());
    }
    if (filter?.to) {
      const to = parseBound(filter.to, true);
      items = items.filter((a) => new Date(a.startAt).getTime() <= to.getTime());
    }
    return items.sort((a, b) => a.startAt.localeCompare(b.startAt));
  },

  find(id: string): AppointmentRecord | null {
    const a = store.appointments.get(id);
    if (!a || a.deletedAt) return null;
    return a;
  },

  create(rec: AppointmentRecord): AppointmentRecord {
    store.appointments.set(rec.id, rec);
    store.appointmentLogs.set(rec.id, []);
    return rec;
  },

  update(id: string, patch: Partial<AppointmentRecord>): AppointmentRecord | null {
    const rec = store.appointments.get(id);
    if (!rec || rec.deletedAt) return null;
    const updated = { ...rec, ...patch };
    store.appointments.set(id, updated);
    return updated;
  },

  logs(id: string): AppointmentLogRecord[] {
    return store.appointmentLogs.get(id) ?? [];
  },

  addLog(log: AppointmentLogRecord): AppointmentLogRecord {
    const arr = store.appointmentLogs.get(log.appointmentId) ?? [];
    arr.push(log);
    store.appointmentLogs.set(log.appointmentId, arr);
    return log;
  },
};

function parseBound(value: string, endOfDay: boolean): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
    return new Date(value + suffix);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date(value) : d;
}