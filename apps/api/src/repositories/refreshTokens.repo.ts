import crypto from 'node:crypto';
import { store } from '../store/inMemoryStore.js';
import type { RefreshTokenRecord } from '../types/index.js';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const refreshTokensRepo = {
  async create(userId: string, expiresAt: Date): Promise<{ record: RefreshTokenRecord; token: string }> {
    const token = crypto.randomBytes(48).toString('hex');
    const tokenHash = hashToken(token);
    const record: RefreshTokenRecord = {
      id: store.newId(),
      userId,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      revokedAt: null,
      createdAt: new Date().toISOString(),
    };
    store.refreshTokens.set(record.id, record);
    store.refreshTokenHashIndex.set(tokenHash, record.id);
    return { record, token };
  },

  async findByToken(token: string): Promise<RefreshTokenRecord | null> {
    const id = store.refreshTokenHashIndex.get(hashToken(token));
    if (!id) return null;
    return store.refreshTokens.get(id) ?? null;
  },

  async revoke(id: string): Promise<void> {
    const record = store.refreshTokens.get(id);
    if (record) {
      record.revokedAt = new Date().toISOString();
      store.refreshTokens.set(id, record);
    }
  },

  async revokeByToken(token: string): Promise<void> {
    const record = await this.findByToken(token);
    if (record) await this.revoke(record.id);
  },
};