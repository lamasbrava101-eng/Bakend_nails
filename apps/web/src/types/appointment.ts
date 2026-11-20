export type AppointmentStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface AppointmentRecord {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceId: string;
  serviceName: string;
  length: 'S' | 'M' | 'L' | 'XL';
  effectIds: string[];
  includeRemoval: boolean;
  startAt: string;
  endAt: string;
  durationMin: number;
  priceTotal: number;
  status: AppointmentStatus;
  voucherUrl: string | null;
  voucherUploadedAt: string | null;
  remindedAt: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface AppointmentLogRecord {
  id: string;
  appointmentId: string;
  note: string;
  createdAt: string;
}
