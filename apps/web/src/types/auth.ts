export type Role = 'CLIENT' | 'MANICURIST' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}