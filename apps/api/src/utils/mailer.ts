import nodemailer from 'nodemailer';

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@nailstudio.local';
  if (!transport) {
    // No mail configured; log token server-side for troubleshooting (do not expose in prod response)
    console.info('[mailer] SMTP not configured. Password reset token generated for', to);
    return false;
  }
  try {
    await transport.sendMail({
      from,
      to,
      subject: 'Recuperación de contraseña - Nb_nails',
      text: `Usa este código/token para restablecer tu contraseña: ${resetToken}\n\nSi no solicitaste este cambio, ignora este mensaje.`,
      html: `<p>Usa este código para restablecer tu contraseña en Nb_nails:</p><p style="font-size:18px;font-weight:700;letter-spacing:1px">${resetToken}</p><p>Si no solicitaste este cambio, ignora este mensaje.</p>`,
    });
    return true;
  } catch (e) {
    console.error('[mailer] Failed to send password reset email', e);
    return false;
  }
}
