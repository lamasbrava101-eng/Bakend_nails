export function normalizePhoneE164(phone: string | null | undefined): string {
  const raw = String(phone ?? '').trim();
  if (!raw) return '';

  // Normalize common separators, keep + and digits
  let cleaned = raw.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);

  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  let digits = cleaned.replace(/\D/g, '');
  if (!digits) return '';

  // Ecuador local formats: 09XXXXXXXX / 0XXXXXXXXX -> +593...
  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
    if (!digits) return '';
    return `+593${digits}`;
  }

  // Already includes Ecuador country code without +
  if (digits.startsWith('593')) {
    return `+${digits}`;
  }

  // Common local mobile without leading 0 (e.g. 9XXXXXXXX)
  if (digits.length === 9 && digits.startsWith('9')) {
    return `+593${digits}`;
  }

  // Fallback: preserve as international-like number
  return `+${digits}`;
}

export function waPhoneNumber(phone: string | null | undefined): string {
  return normalizePhoneE164(phone).replace(/^\+/, '');
}
