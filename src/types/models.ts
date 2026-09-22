// Shared domain types — same backend as the web frontend's src/types/models.ts,
// ported (not imported cross-repo) and trimmed to what the mobile screens use.

export type Role = 'owner' | 'admin' | 'service_advisor' | 'mechanic' | 'receptionist';

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  garage: string;
  avatar?: string;
  isActive: boolean;
  /**
   * The user's home-garage locale, resolved server-side on every auth
   * response. This is the ONLY path a non-owner has to it — GarageContext
   * fetches branches for owners only.
   */
  locale?: ResolvedLocale;
  /**
   * When the owner confirmed a code sent to that address; null until then.
   * Owner-only feature for now — staff never see these set. The subscription
   * gate will require both.
   */
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** The channels an owner can verify from Settings — mirrors backend/types/domain.ts. */
export type VerificationChannel = 'email' | 'phone';

/** GET /api/auth/verification */
export interface VerificationStatus {
  email: { value: string; verifiedAt: string | null };
  phone: { value: string; verifiedAt: string | null };
}

/** POST /api/auth/verification/:channel/send */
export interface VerificationSendResult {
  status: 'sent' | 'already-verified';
  channel: VerificationChannel;
  /** Masked, e.g. `d***n@example.com` or `****3210` — safe to show. */
  target: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface GarageSettings {
  /** '' means "inherit from the garage's country" — see ResolvedLocale. */
  currency: string;
  taxRate: number;
  laborRatePerHour: number;
  serviceReminderDays: number;
  locale?: string;
  taxLabel?: string;
  timezone?: string;
}

/**
 * Everything needed to render a garage's money, dates and labels.
 *
 * Resolved on the SERVER (backend/utils/locale.ts) and attached to garage and
 * auth payloads, so no client ever hardcodes a currency symbol or a tax name.
 * It follows the garage, never the device: a UK garage's staff on a phone set
 * to Hindi must still see GBP and "VAT".
 */
export interface ResolvedLocale {
  country: string;
  currency: string;
  locale: string;
  taxLabel: string;
  taxIdLabel: string;
  postalLabel: string;
  postalInputMode: 'numeric' | 'text';
  phoneExample: string;
  timezone: string;
}

/** GET /api/meta/plans — the Free / Plus / Pro catalog, priced for one country. */
export type PlanId = 'free' | 'plus' | 'pro';

export interface PlanCatalogEntry {
  id: PlanId;
  name: string;
  tagline: string;
  features: string[];
  /** `null` means unlimited. */
  limits: {
    maxGaragesPerOwner: number | null;
    maxJobCardsPerGaragePerDay: number | null;
    maxInvoicesPerGaragePerDay: number | null;
    maxStaffPerGarage: number | null;
  };
  /** Major units of `PlanCatalog.currency`; 0 for Free. */
  price: { monthly: number; annual: number };
}

export interface PlanCatalog {
  country: string;
  currency: string;
  plans: PlanCatalogEntry[];
  /**
   * Server-owned. While `enabled` is false the clients show `message` on the
   * plan buttons instead of a checkout, so turning purchasing on needs no
   * app release.
   */
  purchasing: { enabled: boolean; message: string };
}

/** One row of GET /api/meta/countries — powers the signup/settings pickers. */
export interface CountryOption {
  code: string;
  name: string;
  currency: string;
  taxLabel: string;
  taxIdLabel: string;
  postalLabel: string;
  postalInputMode: 'numeric' | 'text';
  phoneExample: string;
  /** True when the country spans several zones and the owner must pick one. */
  requiresTimezoneChoice: boolean;
}

export interface Garage {
  _id: string;
  name: string;
  address?: Address;
  phone: string;
  email?: string;
  gstNumber?: string;
  logo?: string;
  /** ISO alpha-2. Absent on garages created before country support shipped. */
  country?: string;
  owner?: string | { _id: string; name: string; email: string; phone: string; role: Role };
  settings?: GarageSettings;
  /** Server-resolved; present on garage and auth payloads. */
  locale?: ResolvedLocale;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: Address;
  vehicles?: Vehicle[] | string[];
  garage?: string;
  totalVisits?: number;
  totalSpent?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type FuelType = 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid' | 'other';

export interface Vehicle {
  _id: string;
  licensePlate: string;
  make: string;
  model: string;
  year?: number | null | string;
  color?: string;
  fuelType?: FuelType;
  vin?: string;
  chassisNumber?: string;
  engineNumber?: string;
  currentOdometerReading?: number;
  customer?: Customer | string;
  garage?: string;
  serviceHistory?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type JobStatus =
  | 'new' | 'estimation_sent' | 'approved' | 'in_progress'
  | 'quality_check' | 'ready_for_pickup' | 'delivered' | 'cancelled';

export type ServiceType = 'service' | 'repair' | 'accident';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Complaint {
  description: string;
  priority: ComplaintPriority;
}

export interface EstimationPart {
  inventoryItem?: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export interface EstimationLabor {
  description: string;
  hours: number;
  ratePerHour: number;
  total?: number;
}

export interface Estimation {
  parts: EstimationPart[];
  labor: EstimationLabor[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  grandTotal: number;
  approvedByCustomer: boolean;
  approvedAt?: string | null;
  sentAt?: string | null;
}

export interface StatusHistoryEntry {
  status: string;
  changedBy?: { _id: string; name: string } | string;
  changedAt: string;
  notes?: string;
}

export interface AssignedStaff {
  _id: string;
  name: string;
  phone?: string;
}

export interface JobCard {
  _id: string;
  serviceType: ServiceType;
  jobCardNumber: string;
  vehicle?: Vehicle | string;
  customer?: Customer | string;
  garage?: string;
  complaints: Complaint[];
  assignedMechanic?: AssignedStaff | string | null;
  assignedAdvisor?: AssignedStaff | string | null;
  status: JobStatus;
  statusHistory: StatusHistoryEntry[];
  estimation: Estimation;
  odometerAtIntake?: number;
  expectedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  internalNotes?: string;
  invoice?: Invoice | string | null;
  createdBy?: { _id: string; name: string } | string;
  estimationToken?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other' | '';

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  jobCard?: { _id: string; jobCardNumber: string; status?: string; odometerAtIntake?: number } | string;
  customer?: Customer | string;
  vehicle?: Vehicle | string;
  garage?: Garage | string;
  parts: EstimationPart[];
  labor: EstimationLabor[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  amountPaid: number;
  paidAt?: string | null;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type InventoryCategory =
  | 'engine_oil' | 'filters' | 'brakes' | 'electrical' | 'suspension' | 'body_parts'
  | 'tyres' | 'battery' | 'coolant' | 'transmission' | 'accessories' | 'other';

export interface Supplier {
  name?: string;
  phone?: string;
  email?: string;
}

export interface InventoryItem {
  _id: string;
  partName: string;
  partNumber?: string;
  category: InventoryCategory;
  quantity: number;
  threshold: number;
  unitPrice: number;
  sellingPrice?: number;
  supplier?: Supplier;
  location?: string;
  garage?: string;
  isActive?: boolean;
  isLowStock?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ReminderStatus = 'pending' | 'sent' | 'completed' | 'dismissed';
export type ReminderType = 'periodic_service' | 'oil_change' | 'tire_rotation' | 'inspection' | 'custom';

export interface ServiceReminder {
  _id: string;
  vehicle?: Vehicle | string;
  customer?: Customer | string;
  garage?: string;
  jobCard?: string;
  type: ReminderType;
  nextServiceDate: string;
  nextServiceKm?: number;
  notes?: string;
  status: ReminderStatus;
  reminderSentAt?: string | null;
  isOverdue?: boolean;
}

// ─── Expenses ─────────────────────────────────────────────────────────────
// Mirrors backend/types/domain.ts EXPENSE_CATEGORIES.
export type ExpenseCategory = 'parts' | 'salaries' | 'rent' | 'utilities' | 'tools' | 'marketing' | 'transport' | 'other';

export interface Expense {
  _id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  /** ISO timestamp of when the money left, not when it was recorded. */
  expenseDate: string;
  paymentMethod: PaymentMethod;
  notes: string;
  garage: string;
  createdBy?: { _id: string; name: string; role?: Role } | null;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /api/dashboard/monthly — one month of business figures, owner/admin. */
export interface MonthFigures {
  /** YYYY-MM */
  month: string;
  /** Paid invoices, by the date they were paid. */
  revenue: number;
  /** Invoices raised in the month. */
  services: number;
  /** Sum of expenses by expense date. */
  expenses: number;
  /** revenue - expenses; negative when the month lost money. */
  netProfit: number;
}

export interface MonthlyMetrics extends MonthFigures {
  previous: MonthFigures;
  expensesByCategory: { category: ExpenseCategory; total: number; count: number }[];
}
