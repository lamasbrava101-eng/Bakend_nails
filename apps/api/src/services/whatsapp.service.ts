import { normalizePhoneE164, waPhoneNumber } from '../utils/phone.js';

export type WhatsAppRecipient = 'client' | 'manicurist' | 'admin';

export interface WhatsAppSendInput {
  to: string;
  body: string;
  recipient: WhatsAppRecipient;
  appointmentId: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  provider: string;
  recipient: WhatsAppRecipient;
  to: string;
  error?: string;
  skipped?: boolean;
}

function logStructured(event: string, payload: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ level: payload.ok === false ? 'warn' : 'info', event, ts: new Date().toISOString(), ...payload }));
}

async function sendViaCloudApi(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_CLOUD_API_VERSION || 'v20.0';
  const to = waPhoneNumber(input.to);
  if (!token || !phoneNumberId) {
    return { ok: false, provider: 'cloud_api', recipient: input.recipient, to, skipped: true, error: 'missing_credentials' };
  }
  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: input.body },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, provider: 'cloud_api', recipient: input.recipient, to, error: `http_${res.status}:${text.slice(0, 200)}` };
  }
  return { ok: true, provider: 'cloud_api', recipient: input.recipient, to };
}

async function sendViaTwilio(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const toNorm = normalizePhoneE164(input.to);
  const to = toNorm ? `whatsapp:${toNorm}` : '';
  if (!sid || !token || !from) {
    return { ok: false, provider: 'twilio', recipient: input.recipient, to, skipped: true, error: 'missing_credentials' };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams();
  form.set('From', from.startsWith('whatsapp:') ? from : `whatsapp:${normalizePhoneE164(from) || from}`);
  form.set('To', to);
  form.set('Body', input.body);
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, provider: 'twilio', recipient: input.recipient, to, error: `http_${res.status}:${text.slice(0, 200)}` };
  }
  return { ok: true, provider: 'twilio', recipient: input.recipient, to };
}

async function sendViaWebhook(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
  const url = process.env.WHATSAPP_WEBHOOK_URL;
  const token = process.env.WHATSAPP_WEBHOOK_TOKEN;
  const to = normalizePhoneE164(input.to);
  if (!url) {
    return { ok: false, provider: 'webhook', recipient: input.recipient, to, skipped: true, error: 'missing_credentials' };
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ to, body: input.body, recipient: input.recipient, appointmentId: input.appointmentId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, provider: 'webhook', recipient: input.recipient, to, error: `http_${res.status}:${text.slice(0, 200)}` };
  }
  return { ok: true, provider: 'webhook', recipient: input.recipient, to };
}

function fallbackLog(input: WhatsAppSendInput, reason = 'provider_not_configured'): WhatsAppSendResult {
  const to = normalizePhoneE164(input.to);
  const result: WhatsAppSendResult = { ok: true, provider: 'log_fallback', recipient: input.recipient, to, skipped: true };
  logStructured('whatsapp.reminder.fallback', {
    ok: true,
    provider: 'log_fallback',
    recipient: input.recipient,
    to,
    appointmentId: input.appointmentId,
    reason,
    body: input.body,
  });
  return result;
}

export async function sendWhatsAppReminder(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
  const to = normalizePhoneE164(input.to);
  if (!to) {
    const result: WhatsAppSendResult = { ok: false, provider: 'none', recipient: input.recipient, to: '', error: 'missing_phone' };
    logStructured('whatsapp.reminder.result', { ...result, appointmentId: input.appointmentId });
    return result;
  }

  const provider = String(process.env.WHATSAPP_PROVIDER || '').trim().toLowerCase();
  let result: WhatsAppSendResult;
  try {
    if (provider === 'cloud_api' || provider === 'meta' || provider === 'whatsapp_cloud') {
      result = await sendViaCloudApi(input);
      if (result.skipped && result.error === 'missing_credentials') result = fallbackLog(input, 'missing_credentials');
    } else if (provider === 'twilio') {
      result = await sendViaTwilio(input);
      if (result.skipped && result.error === 'missing_credentials') result = fallbackLog(input, 'missing_credentials');
    } else if (provider === 'webhook' || provider === 'generic_webhook') {
      result = await sendViaWebhook(input);
      if (result.skipped && result.error === 'missing_credentials') result = fallbackLog(input, 'missing_credentials');
    } else if (!provider) {
      result = fallbackLog(input, 'provider_not_configured');
    } else {
      result = fallbackLog(input, `unsupported_provider:${provider}`);
    }
  } catch (e) {
    result = {
      ok: false,
      provider: provider || 'unknown',
      recipient: input.recipient,
      to,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  if (result.provider !== 'log_fallback') {
    logStructured('whatsapp.reminder.result', { ...result, appointmentId: input.appointmentId });
  }
  return result;
}
