import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '../types/index.js';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  email?: string;
}

export function signAccessToken(payload: { sub: string; role: Role; email: string }): string {
  return jwt.sign({ sub: payload.sub, role: payload.role, email: payload.email }, env.jwtSecret, {
    expiresIn: env.jwtAccessExpires as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
  return decoded;
}