import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Autenticación opcional: si hay un Bearer token válido, establece req.user.
 * Si no hay token o es inválido, continúa sin usuario (para endpoints públicos
 * que pueden mostrar datos adicionales a staff autorizado).
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email ?? '', role: payload.role };
  } catch {
    // token inválido/expirado: tratar como no autenticado en endpoints públicos
  }
  next();
}
