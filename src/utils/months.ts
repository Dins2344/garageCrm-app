/** Month arithmetic for the pickers. Keys are `YYYY-MM` in local time. */

export const monthKeyOf = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const currentMonthKey = (): string => monthKeyOf(new Date());

/** The `YYYY-MM` `delta` months away from `month`. */
export const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split('-').map(Number);
  return monthKeyOf(new Date(y, m - 1 + delta, 1));
};

/** "September 2026" in the given locale. */
export const monthLabel = (month: string, locale: string): string => {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
};
