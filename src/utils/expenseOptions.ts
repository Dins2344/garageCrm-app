import type { ExpenseCategory, PaymentMethod } from '../types/models';

// Same labels as the web client's utils/constants.ts.
export const EXPENSE_CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'parts', label: 'Parts and consumables' },
  { value: 'salaries', label: 'Salaries and wages' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'tools', label: 'Tools and equipment' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Other' },
];

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = Object.fromEntries(
  EXPENSE_CATEGORY_OPTIONS.map(o => [o.value, o.label])
) as Record<ExpenseCategory, string>;

export const EXPENSE_PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: '', label: 'Not specified' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];
