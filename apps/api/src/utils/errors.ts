export type ErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'APPOINTMENT_OVERLAP'
  | 'APPOINTMENT_EXPIRED'
  | 'INVALID_STATUS_TRANSITION'
  | 'INSUFFICIENT_STOCK'
  | 'VOUCHER_NOT_FOUND';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details: unknown;

  constructor(code: ErrorCode, status: number, message: string, details: unknown = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}