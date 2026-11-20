import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { usersRepo } from '../repositories/users.repo.js';
import { refreshTokensRepo } from '../repositories/refreshTokens.repo.js';
import { passwordResetTokensRepo } from '../repositories/passwordResetTokens.repo.js';
import { techSheetsRepo } from '../repositories/techSheets.repo.js';
import { signAccessToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import type { UserRecord } from '../types/index.js';

function toPublicUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
  };
}

export const authService = {
  async register(input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    const existing = await usersRepo.findByEmail(input.email);
    if (existing) {
      throw new AppError('VALIDATION_ERROR', 409, 'Email already in use');
    }
    const user = await usersRepo.create({
      email: input.email,
      password: input.password,
      role: 'CLIENT',
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
    });
    await techSheetsRepo.upsert(user.id, {});
    return { user: toPublicUser(user) };
  },

  async login(email: string, password: string) {
    const user = await usersRepo.findByEmail(email);
    if (!user || user.deletedAt) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid credentials');
    }
    const ok = await usersRepo.verifyPassword(user, password);
    if (!ok) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid credentials');
    }
    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const expiresAt = new Date(Date.now() + env.refreshExpiresDays * 24 * 60 * 60 * 1000);
    const { token: refreshToken } = await refreshTokensRepo.create(user.id, expiresAt);
    return { accessToken, refreshToken, user: toPublicUser(user) };
  },

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new AppError('UNAUTHORIZED', 401, 'Missing refresh token');
    }
    const record = await refreshTokensRepo.findByToken(refreshToken);
    if (!record || record.revokedAt || new Date(record.expiresAt).getTime() < Date.now()) {
      throw new AppError('UNAUTHORIZED', 401, 'Invalid or expired refresh token');
    }
    const user = await usersRepo.findById(record.userId);
    if (!user || user.deletedAt) {
      throw new AppError('UNAUTHORIZED', 401, 'Invalid refresh token');
    }
    await refreshTokensRepo.revoke(record.id);
    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const expiresAt = new Date(Date.now() + env.refreshExpiresDays * 24 * 60 * 60 * 1000);
    const { token: newRefresh } = await refreshTokensRepo.create(user.id, expiresAt);
    return { accessToken, refreshToken: newRefresh, user: toPublicUser(user) };
  },

  async logout(refreshToken: string | undefined) {
    if (refreshToken) {
      await refreshTokensRepo.revokeByToken(refreshToken);
    }
  },

  async forgotPassword(email: string) {
    const user = await usersRepo.findByEmail(email);
    // Always return generic success to avoid user enumeration
    if (!user || user.deletedAt) {
      return { message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.' };
    }
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    const { token } = await passwordResetTokensRepo.create(user.id, expiresAt);
    await sendPasswordResetEmail(user.email, token);
    const exposeToken = env.nodeEnv !== 'production' || process.env.EXPOSE_RESET_TOKEN === 'true';
    return {
      message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
      ...(exposeToken ? { resetToken: token } : {}),
    };
  },

  async resetPassword(token: string, newPassword: string) {
    const record = await passwordResetTokensRepo.findByToken(token);
    if (!record || record.usedAt || new Date(record.expiresAt).getTime() < Date.now()) {
      throw new AppError('VALIDATION_ERROR', 400, 'El código de recuperación es inválido o ha expirado');
    }
    const user = await usersRepo.findById(record.userId);
    if (!user || user.deletedAt) {
      throw new AppError('VALIDATION_ERROR', 400, 'El código de recuperación es inválido o ha expirado');
    }
    await usersRepo.updatePassword(user.id, newPassword);
    await passwordResetTokensRepo.markUsed(record.id);
    return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  },
};