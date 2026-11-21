const STUDY_OFFSET_MS = 5 * 60 * 60 * 1000; // America/Guayaquil is UTC-5
const STUDY_OFFSET_MINUTES = 5 * 60;

export function toStudyDate(d: Date): string {
  const studyMs = d.getTime() - STUDY_OFFSET_MS;
  const studyDate = new Date(studyMs);
  const y = studyDate.getUTCFullYear();
  const m = String(studyDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(studyDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function studyMinutesOfDay(d: Date): number {
  const studyMs = d.getTime() - STUDY_OFFSET_MS;
  const studyDate = new Date(studyMs);
  return studyDate.getUTCHours() * 60 + studyDate.getUTCMinutes();
}

export function localDayStartUtc(dateStr: string): Date {
  // 00:00 study time -> 05:00 UTC
  return new Date(`${dateStr}T05:00:00.000Z`);
}

export function slotStartUtc(dateStr: string, minutesFromMidnight: number): Date {
  const totalMinutes = minutesFromMidnight + STUDY_OFFSET_MINUTES; // study -> utc
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const dayOffset = Math.floor(h / 24);
  const hh = h % 24;
  const base = new Date(`${dateStr}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + dayOffset);
  base.setUTCHours(hh, m, 0, 0);
  return base;
}

/** Convierte HH:mm (hora local estudio) en una fecha UTC para una fecha YYYY-MM-DD dada. */
export function localTimeToUtc(dateStr: string, hhmm: string): Date {
  const [hhStr, mmStr] = hhmm.split(':');
  const minutes = Number(hhStr) * 60 + Number(mmStr);
  return slotStartUtc(dateStr, minutes);
}

export function withinWorkingHours(start: Date, end: Date): boolean {
  if (toStudyDate(start) !== toStudyDate(end)) return false;
  const startMin = studyMinutesOfDay(start);
  const endMin = studyMinutesOfDay(end);
  // compatibilidad genérica; la validación fina de turnos se hace contra shifts configurados
  return startMin >= 0 && endMin <= 24 * 60 && endMin > startMin;
}