import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../theme';
import type { Role } from '../types/models';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * The walkthrough's content, as data.
 *
 * Kept out of the carousel component so the only branching logic here —
 * `slidesForRole` — can be tested without mounting anything, and out of any
 * screen file so a component may import it without the layering inversion this
 * repo has already called out once.
 *
 * Copy is drawn from what the app already says about itself: `FEATURES` in
 * LoginScreen, `quickActions` in HomeScreen, the `menuItems` subtitles in
 * MoreScreen, and `STATUS_FLOW` in StatusStepper.
 */

export interface TourPoint {
  icon: IconName;
  text: string;
  /** Omitted = everyone. Same shape as MoreScreen's MenuItem.roles. */
  roles?: Role[];
}

export interface TourSlide {
  key: string;
  icon: IconName;
  tint: string;
  tintBg: string;
  title: string;
  body: string;
  points: TourPoint[];
  roles?: Role[];
}

/**
 * Inventory is deliberately absent. It is advertised in LoginScreen's
 * `FEATURES` list but is `comingSoon`/`disabled` in MoreScreen — a tour that
 * promises it is a support ticket. `tourSlides.test.ts` guards this.
 */
export const TOUR_SLIDES: TourSlide[] = [
  {
    key: 'jobcards',
    icon: 'clipboard-outline',
    tint: colors.primary,
    tintBg: colors.primarySoft,
    title: 'Job cards run the whole job',
    body: 'One card per vehicle, from the moment it arrives to the moment it leaves.',
    points: [
      { icon: 'car-outline', text: 'Open a card at the counter with the vehicle and the complaint' },
      { icon: 'construct-outline', text: 'Move it along as work happens — estimate, approved, in progress, quality check' },
      { icon: 'checkmark-done-outline', text: 'Ready for pickup, then delivered. Nothing gets lost between people' },
    ],
  },
  {
    key: 'estimates',
    icon: 'send-outline',
    tint: colors.warning,
    tintBg: colors.warningSoft,
    title: 'Estimates the customer approves',
    body: 'Price the work before it starts, and get the yes on the record.',
    roles: ['owner', 'admin', 'service_advisor'],
    points: [
      { icon: 'pricetag-outline', text: 'Add parts and labour as separate lines with their own totals' },
      { icon: 'paper-plane-outline', text: 'Send it, and the card moves to Estimation Sent' },
      { icon: 'thumbs-up-outline', text: 'Approval unblocks the work — no surprise bill at handover' },
    ],
  },
  {
    key: 'invoices',
    icon: 'card-outline',
    tint: colors.success,
    tintBg: colors.successSoft,
    title: 'Invoice, then get paid',
    body: 'The approved work becomes the bill. Nothing is re-typed.',
    roles: ['owner', 'admin', 'service_advisor'],
    points: [
      { icon: 'document-text-outline', text: 'Generate the invoice straight from the finished job card' },
      { icon: 'cash-outline', text: 'Mark it paid when the money actually lands' },
      { icon: 'alert-circle-outline', text: 'Anything unpaid stays on the home screen until it is settled' },
    ],
  },
  {
    key: 'customers',
    icon: 'people-outline',
    tint: palette.violet500,
    tintBg: palette.violet50,
    title: 'Every vehicle remembers',
    body: 'Customers, their vehicles, and everything ever done to them.',
    points: [
      { icon: 'car-sport-outline', text: 'Open a vehicle to see its full service history' },
      { icon: 'time-outline', text: 'Check what was done last time before you start' },
      {
        icon: 'person-outline',
        text: 'Customer records link to every vehicle they own',
        // A mechanic can read a vehicle's history but cannot open Customers at
        // all. Without bullet-level gating we would either lie to them or fork
        // this slide's copy by role.
        roles: ['owner', 'admin', 'service_advisor', 'receptionist'],
      },
    ],
  },
];

/**
 * `role` is undefined pre-auth, where nothing is filtered: the intro is a
 * "what this app is" pitch, not a permissions summary. After sign-in the same
 * catalogue narrows to what the person can actually do — `hasRole` is a flat
 * allow-list, so a mechanic is not "an admin with fewer rights" and must never
 * be shown an approval tip they will never find a button for.
 */
export function slidesForRole(role?: Role): TourSlide[] {
  const allowed = (roles?: Role[]) => !roles || !role || roles.includes(role);
  return TOUR_SLIDES
    .filter(slide => allowed(slide.roles))
    .map(slide => ({ ...slide, points: slide.points.filter(point => allowed(point.roles)) }));
}
