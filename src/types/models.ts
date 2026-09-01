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
  createdAt?: string;
  updatedAt?: string;
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
  /**
   * The garage still holds the demo rows seeded at registration. Server-derived
   * on GET /garage only, so it is absent on auth payloads and on any older API
   * — an absent flag must read as "no banner", never as a crash.
   */
  hasSampleData?: boolean;
  settings?: GarageSettings;
  /** Server-resolved; present on garage and auth payloads. */
  locale?: ResolvedLocale;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  _id: string;
  /**
   * Seeded demo row, created with the garage so a new account is not an empty
   * app. Optional because every published build predates the field, and backend
   * changes stay additive.
   */
  isSample?: boolean;
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
  /** Seeded demo row - see Customer.isSample. */
  isSample?: boolean;
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
  /** Seeded demo row - see Customer.isSample. */
  isSample?: boolean;
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
  /** Seeded demo row - see Customer.isSample. */
  isSample?: boolean;
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
