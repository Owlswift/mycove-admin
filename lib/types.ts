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
  donated: number;
  pledged: number;
}

export interface TreasurySummary {
  duesCollected: number;
  levyCollected: number;
  totalCollected: number;
  totalAllocated: number;
  treasuryBalance: number;
  totalDonated: number;
  totalPledged: number;
  projects: ProjectBreakdown[];
}

export interface Pledge {
  id: string;
  amount: number;
  remindedAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  user: { fullName: string; phone: string; house: string | null };
}

export type SpotlightCategory = 'PERSON' | 'BUSINESS';

export interface Spotlight {
  id: string;
  name: string;
  category: SpotlightCategory;
  description: string;
  imageBase64: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
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

export interface PollOption {
  id: string;
  label: string;
  pct: number;
}

export interface Poll {
  id: string;
  question: string;
  closesIn: string;
  voted: boolean;
  selectedOptionId: string | null;
  voteCountLabel: string;
  options: PollOption[];
}

export interface Announcement {
  id: string;
  title: string;
  category: string;
  body: string;
  publishedAt: string;
  unread: boolean;
}

export type ProjectStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface ProjectReport {
  author: string;
  date: string;
  text: string;
  mediaBase64: string | null;
}

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  progress: number;
  mediaBase64: string | null;
  reports: ProjectReport[];
}
