
import { requestTypeLabel, requestStatusLabel, decidedByLabel } from './changeRequests';

// MIRROR: keep in sync with frontend/src/utils/changeRequests.test.ts.
describe('change request labels', () => {
  it('names each known type', () => {
    expect(requestTypeLabel('odometer_correction')).toBe('Odometer correction');
    expect(requestTypeLabel('job_card_cancellation')).toBe('Job card cancellation');
    expect(requestTypeLabel('invoice_cancellation')).toBe('Invoice cancellation');
  });

  it('still reads when the server sends a type this build does not know', () => {
    expect(requestTypeLabel('price_override')).toBe('Change request');
  });

  it('names statuses and who decided', () => {
    expect(requestStatusLabel('pending')).toBe('Pending');
    expect(requestStatusLabel('withdrawn')).toBe('Withdrawn');
    expect(decidedByLabel('approved')).toBe('Approved by');
    expect(decidedByLabel('rejected')).toBe('Rejected by');
    expect(decidedByLabel('withdrawn')).toBe('Withdrawn by');
  });
});
