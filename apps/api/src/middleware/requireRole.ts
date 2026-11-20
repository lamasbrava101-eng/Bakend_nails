import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import type { Role } from '../types/index.js';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('FORBIDDEN', 403, 'Forbidden'));
      return;
    }
    next();
  };
}