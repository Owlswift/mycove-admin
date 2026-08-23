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
  active: boolean;
  createdAt: string;
}

export interface AccessLogEntry {
  id: string;
  visitor: string;
  entryAt: string;
  exitAt: string | null;
  resident: {
    id: string;
    fullName: string;
    house: string | null;
    phone: string;
  };
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
  mediaBase64: string | null;
  status: InvoiceStatus;
  raisedById: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  project: { title: string };
  raisedBy: { fullName: string };
  reviewedBy: { fullName: string } | null;
}

export interface FinanceTotals {
  expected: number;
  collected: number;
  outstanding: number;
}

export interface ResidentDues {
  id: string;
  fullName: string;
  house: string | null;
  phone: string;
  duesBalance: number;
  monthsPaid: number;
}

export interface DuesRoster {
  monthlyAmount: number;
  totals: FinanceTotals;
  residents: ResidentDues[];
}

export interface LevyResidentStatus {
  id: string;
  fullName: string;
  house: string | null;
  paid: boolean;
  mediaBase64: string | null;
}

export interface LevyWithStats {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  year: number;
  totalResidents: number;
  paidCount: number;
  unpaidCount: number;
  collected: number;
  outstanding: number;
  residents: LevyResidentStatus[];
}

export interface LevyRoster {
  totalResidents: number;
  totals: FinanceTotals;
  levies: LevyWithStats[];
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

export interface RuleItem {
  id: string;
  text: string;
  order: number;
}

export interface RulesSection {
  id: string;
  title: string;
  order: number;
  items: RuleItem[];
}

export type ComplaintStatus = 'SUBMITTED' | 'IN_REVIEW' | 'RESOLVED';

export interface Complaint {
  id: string;
  userId: string;
  category: string;
  description: string;
  ref: string;
  status: ComplaintStatus;
  createdAt: string;
  user: { fullName: string; phone: string; house: string | null };
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
  description: string;
  goal: number;
  reports: ProjectReport[];
}

export type MeetingAiStatus = 'NOT_PROCESSED' | 'PROCESSED' | 'FAILED';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  agenda: string[];
  report: string | null;
  aiStatus: MeetingAiStatus;
  aiTopics: string[];
  aiDecisions: string[];
  aiActionItems: string[];
  aiError: string | null;
  approvedAt: string | null;
}

export type HouseholdInviteStatus = 'PENDING_ADMIN_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ACCEPTED';

export interface HouseholdInvite {
  id: string;
  invitedPhone: string;
  invitedFullName: string;
  status: HouseholdInviteStatus;
  createdAt: string;
  respondedAt: string | null;
  invitedBy: { fullName: string; house: string | null; phone: string };
}

export interface HouseholdMember {
  id: string;
  fullName: string;
  phone: string;
  joinedAt: string;
  invitedBy: { fullName: string; house: string | null };
}
