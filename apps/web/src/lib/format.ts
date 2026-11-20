export function formatDuration(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0 && rem === 0) {
    return h === 1 ? '1 hora' : `${h} horas`;
  }
  if (h > 0 && rem > 0) {
    return `${h} h ${rem} min`;
  }
  return `${rem} min`;
}
