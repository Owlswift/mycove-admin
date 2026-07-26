export type Role = 'RESIDENT' | 'GUARD' | 'ADMIN' | 'FINANCE_SECRETARY' | 'PROJECT_ADMIN';

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

export interface AccessLogEntry {
  id: string;
  visitor: string;
  entryAt: string;
  exitAt: string | null;
}

export interface ProjectBreakdown {
  id: string;
  title: string;
  allocated: number;
  spent: number;
  remaining: number;
}

export interface TreasurySummary {
  duesCollected: number;
  levyCollected: number;
  totalCollected: number;
  totalAllocated: number;
  treasuryBalance: number;
  projects: ProjectBreakdown[];
}

export type InvoiceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Invoice {
  id: string;
  projectId: string;
  amount: number;
  description: string;
  vendor: string | null;
  status: InvoiceStatus;
  raisedById: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  project: { title: string };
  raisedBy: { fullName: string };
  reviewedBy: { fullName: string } | null;
}
