import Tesseract from 'tesseract.js';
import type { StudioConfigRecord, BankAccountRecord } from '../types/index.js';

function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function digitsOnly(s: string): string {
  return (s || '').replace(/\D+/g, '');
}

function formatAmountVariants(amount: number): string[] {
  const fixed2 = amount.toFixed(2); // 5.00
  const fixed2Comma = fixed2.replace('.', ','); // 5,00
  const plain = String(amount);
  const plainComma = plain.replace('.', ',');
  const noDecimals = Number.isInteger(amount) ? String(Math.trunc(amount)) : null;
  const variants = new Set<string>([
    fixed2,
    fixed2Comma,
    plain,
    plainComma,
    `$${fixed2}`,
    `$ ${fixed2}`,
    `$${fixed2Comma}`,
    `$ ${fixed2Comma}`,
    `usd ${fixed2}`,
    `usd ${fixed2Comma}`,
  ]);
  if (noDecimals) {
    variants.add(noDecimals);
    variants.add(`$${noDecimals}`);
    variants.add(`$ ${noDecimals}`);
    variants.add(`${noDecimals}.00`);
    variants.add(`${noDecimals},00`);
    variants.add(`$${noDecimals}.00`);
    variants.add(`$${noDecimals},00`);
  }
  return [...variants].map((v) => normalizeText(v));
}

function textHasAmount(textNorm: string, amount: number): boolean {
  const variants = formatAmountVariants(amount);
  // also check digit pattern loosely
  const compact = textNorm.replace(/\s+/g, ' ');
  if (variants.some((v) => compact.includes(v))) return true;
  // fallback: look for the number with decimals/comma
  const n = amount.toFixed(2);
  const re = new RegExp(`\\$?\\s*${n.replace('.', '[\\.,]')}`);
  return re.test(compact);
}

function nameMatches(textNorm: string, holder: string): boolean {
  const holderNorm = normalizeText(holder || '');
  const tokens = holderNorm.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  if (tokens.length === 0) return false;
  // require at least 2 tokens (or 1 if only one meaningful token) to appear
  const found = tokens.filter((t) => textNorm.includes(t));
  if (tokens.length === 1) return found.length === 1;
  return found.length >= Math.min(2, tokens.length);
}

function accountMatches(text: string, textNorm: string, acc: BankAccountRecord, studio: StudioConfigRecord): boolean {
  const holder = acc.accountHolder || studio.recipientIdNumber ? acc.accountHolder : '';
  const candidates: string[] = [];
  if (acc.accountHolder) candidates.push(acc.accountHolder);
  // consider studio-level holder info as fallback identifiers
  const accNumber = digitsOnly(acc.accountNumber || '');
  const accId = digitsOnly(acc.idNumber || '');
  const studioId = digitsOnly(studio.recipientIdNumber || studio.idNumber || '');

  if (accNumber && accNumber.length >= 4) {
    const textDigits = digitsOnly(text);
    if (textDigits.includes(accNumber)) return true;
  }
  if (accId && accId.length >= 5) {
    const textDigits = digitsOnly(text);
    if (textDigits.includes(accId)) return true;
  }
  if (studioId && studioId.length >= 5) {
    const textDigits = digitsOnly(text);
    // studio cedula match counts as identifying recipient if paired with amount; treat as possible match
    if (textDigits.includes(studioId)) return true;
  }
  if (nameMatches(textNorm, acc.accountHolder || '')) return true;
  return false;
}

export async function validateVoucherImage(
  voucherData: string,
  studio: StudioConfigRecord,
): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const depositAmount = Number(studio.depositAmount) > 0 ? Number(studio.depositAmount) : 5;
  const invalidMessage = `Comprobante inválido: debe mostrar una transferencia por $${depositAmount.toFixed(2)} a nombre del titular configurado`;

  try {
    if (!voucherData || typeof voucherData !== 'string') {
      return { ok: false, message: invalidMessage };
    }
    const result = await Tesseract.recognize(voucherData, 'spa+eng');
    const text = result?.data?.text || '';
    const textNorm = normalizeText(text);

    if (!textNorm.trim()) {
      return { ok: false, message: invalidMessage };
    }

    if (!textHasAmount(textNorm, depositAmount)) {
      return { ok: false, message: invalidMessage };
    }

    const accounts = (studio.accounts && studio.accounts.length > 0)
      ? studio.accounts.filter((a) => a.active !== false)
      : [{
          bankName: studio.bankName,
          accountType: studio.accountType,
          accountNumber: studio.accountNumber,
          accountHolder: studio.accountHolder,
          idNumber: studio.idNumber || studio.recipientIdNumber,
          email: studio.recipientEmail,
          active: true,
        } as BankAccountRecord];

    const matched = accounts.some((acc) => accountMatches(text, textNorm, acc, studio));
    if (!matched) {
      return { ok: false, message: invalidMessage };
    }

    return { ok: true, text };
  } catch (e) {
    console.error('[voucherOcr] OCR failed', e);
    return { ok: false, message: invalidMessage };
  }
}
