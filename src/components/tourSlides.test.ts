import { TOUR_SLIDES, slidesForRole } from './tourSlides';

const titles = (role?: Parameters<typeof slidesForRole>[0]) =>
  slidesForRole(role).map(s => s.key);

describe('slidesForRole', () => {
  it('filters nothing pre-auth — the intro is a pitch, not a permissions summary', () => {
    expect(titles(undefined)).toEqual(['jobcards', 'estimates', 'invoices', 'customers']);
    const customers = slidesForRole(undefined).find(s => s.key === 'customers');
    expect(customers?.points).toHaveLength(3);
  });

  it.each(['owner', 'admin', 'service_advisor'] as const)('gives %s the full deck', role => {
    expect(titles(role)).toEqual(['jobcards', 'estimates', 'invoices', 'customers']);
  });

  /**
   * `hasRole` is a flat allow-list, not a hierarchy — a mechanic is not "an
   * admin with fewer rights". Showing them an approval tip they will never find
   * a button for is worse than showing them nothing.
   */
  it('hides estimates and invoicing from a mechanic', () => {
    expect(titles('mechanic')).toEqual(['jobcards', 'customers']);
  });

  it('gives a mechanic the vehicles slide without the customer-records bullet', () => {
    const slide = slidesForRole('mechanic').find(s => s.key === 'customers');
    expect(slide).toBeTruthy();
    expect(slide?.points.map(p => p.text)).toEqual([
      expect.stringContaining('service history'),
      expect.stringContaining('last time'),
    ]);
  });

  it('gives a receptionist customers in full, but not estimates', () => {
    expect(titles('receptionist')).toEqual(['jobcards', 'customers']);
    const slide = slidesForRole('receptionist').find(s => s.key === 'customers');
    expect(slide?.points).toHaveLength(3);
  });

  it('never mutates the source catalogue', () => {
    const before = JSON.stringify(TOUR_SLIDES);
    slidesForRole('mechanic');
    expect(JSON.stringify(TOUR_SLIDES)).toBe(before);
  });
});

/**
 * Inventory is advertised in LoginScreen's `FEATURES` pills but is
 * `comingSoon`/`disabled` in MoreScreen. A tour that promises it is a support
 * ticket, so the absence is deliberate and worth a guard.
 */
it('does not promise Inventory, which is not built yet', () => {
  expect(JSON.stringify(TOUR_SLIDES)).not.toMatch(/inventor/i);
});
