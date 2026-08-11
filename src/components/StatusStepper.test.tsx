import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import StatusStepper from './StatusStepper';

// RNTL v14's render() is async (it returns a Promise) — it must be awaited,
// otherwise the `screen` singleton never gets bound before the following
// assertion runs. See CONTRIBUTING.md Testing Conventions.
describe('StatusStepper', () => {
  it('shows the next-step action for the current status', async () => {
    await render(<StatusStepper currentStatus="new" onStatusChange={() => {}} />);
    expect(screen.getByText(/Move to: Estimation Sent/i)).toBeTruthy();
  });

  it('calls onStatusChange with the next status when pressed', async () => {
    const onStatusChange = jest.fn();
    const user = userEvent.setup();
    await render(<StatusStepper currentStatus="new" onStatusChange={onStatusChange} />);

    await user.press(screen.getByText(/Move to: Estimation Sent/i));

    expect(onStatusChange).toHaveBeenCalledWith('estimation_sent');
  });

  it('blocks the delivered transition and shows an invoice-required banner when hasInvoice is false', async () => {
    await render(<StatusStepper currentStatus="ready_for_pickup" onStatusChange={() => {}} hasInvoice={false} />);
    expect(screen.getByText('Invoice Required')).toBeTruthy();
    expect(screen.queryByText(/Move to: Delivered/i)).toBeNull();
  });

  it('allows the delivered transition when hasInvoice is true', async () => {
    await render(<StatusStepper currentStatus="ready_for_pickup" onStatusChange={() => {}} hasInvoice={true} />);
    expect(screen.getByText(/Move to: Delivered/i)).toBeTruthy();
  });

  it('shows the cancelled banner and hides step actions when cancelled', async () => {
    await render(<StatusStepper currentStatus="cancelled" onStatusChange={() => {}} />);
    expect(screen.getByText('This job card has been cancelled')).toBeTruthy();
    expect(screen.queryByText(/Move to:/i)).toBeNull();
  });

  it('shows the completed banner for a delivered job card', async () => {
    await render(<StatusStepper currentStatus="delivered" onStatusChange={() => {}} />);
    expect(screen.getByText('Job completed & delivered')).toBeTruthy();
    expect(screen.queryByText('Cancel Job')).toBeNull();
  });
});
