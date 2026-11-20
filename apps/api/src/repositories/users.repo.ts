import bcrypt from 'bcryptjs';
import { store } from '../store/inMemoryStore.js';
import type { UserRecord, Role } from '../types/index.js';
import { env } from '../config/env.js';

export const usersRepo = {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const id = store.userEmailIndex.get(email.toLowerCase());
    if (!id) return null;
    return store.users.get(id) ?? null;
  },

  async findById(id: string): Promise<UserRecord | null> {
    return store.users.get(id) ?? null;
  },

  async create(input: {
    email: string;
    password: string;
    role: Role;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  }): Promise<UserRecord> {
    const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);
    const user: UserRecord = {
      id: store.newId(),
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    store.users.set(user.id, user);
    store.userEmailIndex.set(user.email, user.id);
    return user;
  },

  async update(id: string, patch: Partial<Pick<UserRecord, 'firstName' | 'lastName' | 'phone'>>): Promise<UserRecord | null> {
    const user = store.users.get(id);
    if (!user) return null;
    if (patch.firstName !== undefined) user.firstName = patch.firstName ?? null;
    if (patch.lastName !== undefined) user.lastName = patch.lastName ?? null;
    if (patch.phone !== undefined) user.phone = patch.phone ?? null;
    store.users.set(id, user);
    return user;
  },

  async updatePassword(id: string, password: string): Promise<UserRecord | null> {
    const user = store.users.get(id);
    if (!user) return null;
    user.passwordHash = await bcrypt.hash(password, env.bcryptRounds);
    store.users.set(id, user);
    return user;
  },

  async verifyPassword(user: UserRecord, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  },
};