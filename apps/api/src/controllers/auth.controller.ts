import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { env } from '../config/env.js';


const REFRESH_COOKIE = 'refresh_token';

function cookieOptions() {
  const opts: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    maxAge: number;
    domain?: string;
  } = {
    httpOnly: true,
    secure: env.cookieSecure || env.cookieSameSite === 'none',
    sameSite: env.cookieSameSite,
    path: '/api/v1/auth/refresh',
    maxAge: env.refreshExpiresDays * 24 * 60 * 60 * 1000,
  };
  if (env.cookieDomain) opts.domain = env.cookieDomain;
  return opts;
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, cookieOptions());
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ data: result });
    } catch (e) {
      next(e);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      setRefreshCookie(res, result.refreshToken);
      res.status(200).json({
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        },
      });
    } catch (e) {
      next(e);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
      const result = await authService.refresh(token);
      setRefreshCookie(res, result.refreshToken);
      res.status(200).json({
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        },
      });
    } catch (e) {
      next(e);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
      await authService.logout(token);
      const opts = cookieOptions();
      res.clearCookie(REFRESH_COOKIE, {
        path: opts.path,
        secure: opts.secure,
        sameSite: opts.sameSite,
        ...(opts.domain ? { domain: opts.domain } : {}),
      });
      res.status(200).json({ data: null });
    } catch (e) {
      next(e);
    }
  },
};

