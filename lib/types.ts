export type Role = 'RESIDENT' | 'GUARD' | 'ADMIN';

export interface AdminUser {
  id: string;
  phone: string;
  fullName: string;
  role: Role;
  house: string | null;
  email: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  vehiclePlates: string[];
  mustResetPassword: boolean;
  createdAt: string;
}
