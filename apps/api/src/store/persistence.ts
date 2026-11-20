import fs from 'node:fs';
import path from 'node:path';

export interface PersistedData {
  users: [string, unknown][];
  userEmailIndex: [string, string][];
  refreshTokens: [string, unknown][];
  refreshTokenHashIndex: [string, string][];
  passwordResetTokens?: [string, unknown][];
  passwordResetTokenHashIndex?: [string, string][];
  techSheets: [string, unknown][];
  catalogServices: [string, unknown][];
  catalogEffects: [string, unknown][];
  nailLengths: [string, unknown][];
  appointments: [string, unknown][];
  appointmentLogs: [string, unknown[]][];
  inventoryItems: [string, unknown][];
  studioConfig: unknown;
}

export function loadFromDisk(filePath: string): PersistedData | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as PersistedData;
  } catch {
    return null;
  }
}

export function saveToDisk(filePath: string, data: PersistedData): void {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data), 'utf8');
    fs.renameSync(tmp, filePath);
  } catch {
    // ignore persistence errors in runtime
  }
}