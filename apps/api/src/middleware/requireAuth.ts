import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new AppError('UNAUTHORIZED', 401, 'Missing or invalid authorization header'));
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email ?? '', role: payload.role };
    next();
  } catch {
    next(new AppError('UNAUTHORIZED', 401, 'Invalid or expired access token'));
  }
}