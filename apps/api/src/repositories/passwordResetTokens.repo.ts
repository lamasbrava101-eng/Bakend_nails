import crypto from 'node:crypto';
import { store } from '../store/inMemoryStore.js';
import type { PasswordResetTokenRecord } from '../types/index.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const passwordResetTokensRepo = {
  async create(userId: string, expiresAt: Date): Promise<{ record: PasswordResetTokenRecord; token: string }> {
    // invalidate previous unused tokens for this user
    for (const rec of store.passwordResetTokens.values()) {
      if (rec.userId === userId && !rec.usedAt) {
        rec.usedAt = new Date().toISOString();
        store.passwordResetTokens.set(rec.id, rec);
      }
    }
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const record: PasswordResetTokenRecord = {
      id: store.newId(),
      userId,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
      createdAt: new Date().toISOString(),
    };
    store.passwordResetTokens.set(record.id, record);
    store.passwordResetTokenHashIndex.set(tokenHash, record.id);
    return { record, token };
  },

  async findByToken(token: string): Promise<PasswordResetTokenRecord | null> {
    const id = store.passwordResetTokenHashIndex.get(hashToken(token));
    if (!id) return null;
    return store.passwordResetTokens.get(id) ?? null;
  },

  async markUsed(id: string): Promise<void> {
    const record = store.passwordResetTokens.get(id);
    if (record) {
      record.usedAt = new Date().toISOString();
      store.passwordResetTokens.set(id, record);
    }
  },
};
