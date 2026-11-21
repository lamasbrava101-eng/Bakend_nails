import type { Request, Response, NextFunction } from 'express';
import { usersRepo } from '../repositories/users.repo.js';
import { techSheetsRepo } from '../repositories/techSheets.repo.js';
import { store } from '../store/inMemoryStore.js';
import { toStudyDate, studyMinutesOfDay } from '../utils/time.js';
import type { AppointmentRecord, UserRecord } from '../types/index.js';

function normalizeText(v: string | null | undefined): string {
  return String(v ?? '').trim().toLowerCase();
}

function normalizePhone(v: string | null | undefined): string {
  return String(v ?? '').replace(/\D+/g, '');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function hhmmFromStudyMinutes(min: number): string {
  const m = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

function matchesClient(appt: AppointmentRecord, user: UserRecord): boolean {
  if (appt.deletedAt) return false;
  if (appt.clientId) return appt.clientId === user.id;

  // Respaldo solo para citas antiguas/manuales sin clientId (sin cruzar datos)
  const apptEmail = normalizeText(appt.clientEmail);
  const userEmail = normalizeText(user.email);
  if (apptEmail && userEmail && apptEmail === userEmail) return true;

  const apptPhone = normalizePhone(appt.clientPhone);
  const userPhone = normalizePhone(user.phone);
  if (apptPhone && userPhone && apptPhone === userPhone) return true;

  return false;
}

function buildHistoryItem(appt: AppointmentRecord) {
  const start = new Date(appt.startAt);
  const end = new Date(appt.endAt);
  const date = toStudyDate(start);
  const startTime = hhmmFromStudyMinutes(studyMinutesOfDay(start));
  const endTime = hhmmFromStudyMinutes(studyMinutesOfDay(end));
  const lengthName = store.nailLengths.get([...store.nailLengths.values()].find((l) => l.code === appt.length)?.id ?? '')?.label
    ?? [...store.nailLengths.values()].find((l) => l.code === appt.length)?.label
    ?? appt.length;
  const addons = (appt.effectIds || [])
    .map((id) => store.catalogEffects.get(id)?.name)
    .filter((n): n is string => Boolean(n));
  return {
    id: appt.id,
    date,
    startTime,
    endTime,
    serviceName: appt.serviceName,
    length: appt.length,
    lengthName,
    addons,
    withRemoval: Boolean(appt.includeRemoval),
    status: appt.status,
    createdAt: appt.createdAt,
  };
}

export const adminClientsController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const clients = await usersRepo.listClients();
      const allAppointments = [...store.appointments.values()];
      const data = await Promise.all(
        clients.map(async (u) => {
          const sheet = await techSheetsRepo.findByClient(u.id);
          const clientAppointments = allAppointments.filter((a) => matchesClient(a, u));
          const sorted = [...clientAppointments].sort((a, b) => b.startAt.localeCompare(a.startAt));
          const totalAppointments = clientAppointments.length;
          const confirmedOrCompletedCount = clientAppointments.filter(
            (a) => a.status === 'CONFIRMED' || a.status === 'COMPLETED',
          ).length;
          return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            phone: u.phone,
            allergies: sheet?.allergies ?? null,
            totalAppointments,
            confirmedOrCompletedCount,
            history: sorted.map(buildHistoryItem),
          };
        }),
      );
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  },
};
