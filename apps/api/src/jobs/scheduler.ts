import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { store } from '../store/inMemoryStore.js';
import { expirePendingAppointments } from '../services/appointment.service.js';

export function startScheduler(): void {
  cron.schedule('* * * * *', async () => {
    try {
      expirePendingAppointments();
      await sendReminders();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Scheduler error:', e);
    }
  });
}

async function sendReminders(): Promise<void> {
  const now = Date.now();
  const minMs = 55 * 60 * 1000;
  const maxMs = 65 * 60 * 1000;

  for (const appt of store.appointments.values()) {
    if (appt.deletedAt) continue;
    if (appt.status !== 'CONFIRMED') continue;
    if (appt.remindedAt) continue;
    const start = new Date(appt.startAt).getTime();
    const diff = start - now;
    if (diff < minMs || diff > maxMs) continue;

    const subject = `Recordatorio de cita - ${appt.serviceName}`;
    const text = `Hola ${appt.clientName}, tu cita es en 1 hora (${appt.startAt}).`;
    await sendEmail(appt.clientEmail, subject, text);
    appt.remindedAt = new Date().toISOString();
    store.appointments.set(appt.id, appt);
  }
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    // eslint-disable-next-line no-console
    console.log(`[reminder] to=${to} subject=${subject} text=${text}`);
    return;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user ?? 'no-reply@nailstudio.local';
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass: pass ?? '' } : undefined,
  });
  try {
    await transporter.sendMail({ from, to, subject, text });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to send reminder email:', e);
  }
}