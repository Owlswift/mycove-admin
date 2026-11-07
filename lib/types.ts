export type Role = 'RESIDENT' | 'GUARD' | 'ADMIN' | 'FINANCE_SECRETARY' | 'PROJECT_ADMIN' | 'CHAIRMAN';

export interface AdminUser {
  id: string;
  phone: string;
  fullName: string;
  role: Role;
  /** Regular or commercial — commercial residents pay their own dues rate. */
  residentType?: ResidentType;
  /** Owns their unit (landlord) or rents it (tenant). null until an admin records it. */
  occupancyType?: OccupancyType | null;
  /** 'YYYY-MM' the resident moved in or began operating — dues are billed from here. null until recorded. */
  moveInMonth?: string | null;
  /** Day and month only — entered by the resident in the app, or by the admin. */
  birthMonth?: number | null;
  birthDay?: number | null;
  /** false for household members — their dues are recorded against the resident who invited them. */
  duesLiable?: boolean;
  /** Extra roles a resident also holds (e.g. Chairman) — same account, chosen at sign-in. */
  staffRoles?: Role[];
  house: string | null;
  email: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  vehiclePlates: string[];
  /** RFID tag/card ID the estate's vehicle gate hardware reads — null until an admin assigns one. */
  rfidTag?: string | null;
  mustResetPassword: boolean;
  active: boolean;
  createdAt: string;
  estateName?: string;
  estateAddress?: string;
}

export type DuesEntryType = 'CHARGE' | 'PAYMENT';

export interface DuesLedgerEntry {
  id: string;
  date: string;
  desc: string;
  type: DuesEntryType;
  amount: number;
  mediaBase64: string | null;
  createdAt: string;
}

export interface LevyPaymentEntry {
  id: string;
  mediaBase64: string | null;
  paidAt: string;
  levy: { label: string; amount: number; dueDate: string; year: number };
}

export interface DonationEntry {
  id: string;
  amount: number;
  createdAt: string;
  project: { title: string };
}

export interface PledgeEntry {
  id: string;
  amount: number;
  remindedAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  project: { title: string };
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

export type SpotlightCategory = 'PERSON' | 'BUSINESS' | 'BIRTHDAY';

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

export type ResidentType = 'REGULAR' | 'COMMERCIAL';

export const RESIDENT_TYPE_LABELS: Record<ResidentType, string> = {
  REGULAR: 'Regular',
  COMMERCIAL: 'Commercial',
};

/** Owns their unit (landlord) or rents it (tenant) — distinct from ResidentType, which is about the dues rate. */
export type OccupancyType = 'TENANT' | 'LANDLORD';

export const OCCUPANCY_TYPE_LABELS: Record<OccupancyType, string> = {
  TENANT: 'Tenant',
  LANDLORD: 'Landlord',
};

export interface ResidentDues {
  id: string;
  fullName: string;
  house: string | null;
  phone: string;
  residentType: ResidentType;
  /** Everything they still owe, across every month billed so far. */
  duesBalance: number;
  /** Months fully covered by what they've paid. */
  monthsPaid: number;
  monthsOwed: number;
  /** Months billed since their billing began. */
  monthsElapsed: number;
  /** 'YYYY-MM' — when their billing began; null until the estate has a rate. */
  billingStart: string | null;
  /** 'YYYY-MM' recorded on their profile; null means billing is counted from when they joined the app. */
  moveInMonth: string | null;
}

export interface DuesRoster {
  /** What each resident type pays this month — null until a rate is set. */
  currentRates: { REGULAR: number | null; COMMERCIAL: number | null };
  totals: FinanceTotals;
  residents: ResidentDues[];
}

export interface DuesRateRecord {
  id: string;
  residentType: ResidentType;
  monthlyAmount: number;
  /** 'YYYY-MM' — the first month this rate is charged for. */
  effectiveMonth: string;
  /** When the rate was entered. */
  createdAt: string;
  createdBy: { id: string; fullName: string } | null;
}

export interface DuesRates {
  currentMonth: string;
  current: Record<ResidentType, { monthlyAmount: number; effectiveMonth: string; usesRegularRate: boolean } | null>;
  rates: DuesRateRecord[];
}

export type ImportRowStatus = 'OK' | 'DUPLICATE' | 'ERROR';

export interface DuesImportRow {
  line: number;
  status: ImportRowStatus;
  message: string | null;
  phone: string;
  residentId: string | null;
  residentName: string | null;
  house: string | null;
  residentType: ResidentType | null;
  amount: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  months: number | null;
  expected: number | null;
  difference: number | null;
  billingStart: string | null;
  moveInSet: boolean;
  /** Positive owes, negative is ahead; null when the estate has no rates. */
  balanceAfter: number | null;
}

export interface DuesImportPreview {
  results: DuesImportRow[];
  summary: { total: number; ok: number; duplicates: number; errors: number; noRates: boolean };
}

export interface ResidentImportRow {
  line: number;
  status: ImportRowStatus;
  message: string | null;
  phone: string;
  fullName: string;
  house: string | null;
  residentType: ResidentType | null;
  occupancyType: OccupancyType | null;
  moveInMonth: string | null;
}

export interface ResidentImportPreview {
  results: ResidentImportRow[];
  summary: { ok: number; duplicates: number; errors: number };
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
