// MIRROR: keep in sync with frontend/src/utils/changeRequests.ts.

const TYPE_LABELS: Record<string, string> = {
  odometer_correction: 'Odometer correction',
  job_card_cancellation: 'Job card cancellation',
  invoice_cancellation: 'Invoice cancellation',
};

/** A type added server-side after this build shipped still gets a readable label. */
export const requestTypeLabel = (type: string): string => TYPE_LABELS[type] ?? 'Change request';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const requestStatusLabel = (status: string): string => STATUS_LABELS[status] ?? status;

/** The label beside `decidedBy`: a withdrawal is "decided" by the requester. */
export const decidedByLabel = (status: string): string => `${requestStatusLabel(status)} by`;
