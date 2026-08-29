// MIRROR: keep in sync with frontend/src/utils/validation.ts. There is no
// shared package between the two clients, so this file is a hand-maintained
// duplicate — change one, copy it to the other.
//
// The rules themselves mirror a third place: the backend's Mongoose
// validators. See the file-level comment below.
import { z } from 'zod';
import type { ResolvedLocale } from '../types/models';

/**
 * Form validation schemas.
 *
 * **These mirror the backend's Mongoose validators deliberately.** Client rules
 * that are stricter than the server reject data the API would happily accept;
 * rules that are looser hand the user a server error after a round trip
 * instead of an inline message. Both are worse than no validation, because the
 * user cannot tell which rule they broke.
 *
 * Where a rule below looks odd, it is because the server's does — the comment
 * says which file it came from. If you change one, change both.
 */

// ─── Primitives, matched to the backend ────────────────────────────────────

/**
 * `backend/models/User.ts` — note the `\w{2,3}` at the end: the server accepts
 * a two- or three-character TLD only. `.com` and `.in` pass; `.info` and
 * `.local` are rejected. That is why the backend's own tests use
 * `@example.com`. Copied verbatim so the two agree.
 */
const EMAIL_RE = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

/**
 * `backend/models/User.ts` — digits, spaces, brackets and dashes, 6–20 long.
 * The server writes the dash as `\-`; last inside a character class that is the
 * same expression, and leaving it unescaped keeps `no-useless-escape` quiet.
 */
const PHONE_RE = /^\+?[0-9\s()-]{6,20}$/;

/**
 * **Optional means "blank is fine" — it never means "anything goes".**
 *
 * Leaving an optional field empty passes. Typing something into it makes it
 * subject to the full rule: an optional email that contains `asdf` is an
 * error, not an accepted value. Anything else lets malformed data through the
 * exact fields nobody is watching.
 *
 * Every optional field in this file goes through here so the behaviour cannot
 * drift field by field.
 */
const optionalOf = <T extends z.ZodType>(schema: T) =>
  z.union([z.literal(''), schema]).optional();

const requiredText = (label: string, max = 100) =>
  z.string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} cannot exceed ${max} characters`);

const optionalText = (max = 200) =>
  optionalOf(z.string().trim().max(max, `Cannot exceed ${max} characters`));

const email = z.string().trim().regex(EMAIL_RE, 'Enter a valid email address');

/** Blank is fine; a value that is present must be a real address. */
const optionalEmail = optionalOf(email);

const phone = z.string().trim().regex(PHONE_RE, 'Enter a valid phone number');

/**
 * `backend/models/User.ts` sets `minlength: 6`. Do not raise it here without
 * raising it there — every existing user's password already satisfies 6, and a
 * stricter client rule would lock people out of their own change-password form.
 */
const password = z.string().min(6, 'Password must be at least 6 characters');

/** A money or rate field. Rejects negatives and the empty string. */
const nonNegativeNumber = (label: string) =>
  z.coerce.number({ message: `${label} must be a number` })
    .min(0, `${label} cannot be negative`);

// ─── Locale-aware pieces ───────────────────────────────────────────────────

/**
 * Postal codes differ enough between countries that a single regex is either
 * useless or wrong. The country table already tells us whether the code is
 * digits-only, so validate the shape we actually know and leave the rest to a
 * length bound — a UK `SW1A 1AA` and an Indian `560068` both have to pass.
 */
export const postalCodeSchema = (locale: ResolvedLocale) =>
  optionalOf(
    locale.postalInputMode === 'numeric'
      ? z.string().trim().regex(/^[0-9]{4,10}$/, `Enter a valid ${locale.postalLabel}`)
      : z.string().trim().min(3, `Enter a valid ${locale.postalLabel}`).max(12, `Enter a valid ${locale.postalLabel}`)
  );

/**
 * `backend/models/Garage.ts` loosened this to `/^$|^[A-Za-z0-9\-/ ]{1,25}$/`
 * so a VAT number, an EIN or an ABN can all be stored in the same field. The
 * label comes from the country, the shape does not.
 */
export const taxIdSchema = (locale: ResolvedLocale) =>
  optionalOf(
    z.string().trim().regex(/^[A-Za-z0-9\-/ ]{1,25}$/, `Enter a valid ${locale.taxIdLabel}`)
  );

// ─── Entity schemas ────────────────────────────────────────────────────────

/** `backend/models/Customer.ts`: only name and phone are required. */
export const customerSchema = (locale: ResolvedLocale) =>
  z.object({
    name: requiredText('Customer name'),
    phone,
    email: optionalEmail,
    notes: optionalText(1000),
    address: z.object({
      street: optionalText(),
      city: optionalText(100),
      state: optionalText(100),
      pincode: postalCodeSchema(locale),
    }),
  });

/** `backend/models/Vehicle.ts`: plate, make and model are required. */
export const vehicleSchema = z.object({
  licensePlate: requiredText('License plate', 20),
  make: requiredText('Make', 50),
  model: requiredText('Model', 50),
  year: z
    .union([z.literal(''), z.coerce.number().int().min(1900, 'Year looks too early')
      .max(new Date().getFullYear() + 1, 'Year cannot be in the future')])
    .optional(),
  fuelType: z.string().optional(),
  color: optionalText(40),
  customer: z.string().min(1, 'Select a customer'),
});

/** Staff creation. `backend/models/User.ts` requires all four. */
export const staffSchema = z.object({
  name: requiredText('Name'),
  email,
  phone,
  role: z.string().min(1, 'Select a role'),
  // Optional on edit — the form only sends it when the user typed one.
  password: z.union([z.literal(''), password]).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: requiredText('Your name'),
  garageName: requiredText('Garage name'),
  email,
  phone,
  password,
  country: z.string().min(1, 'Select a country'),
  timezone: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  // Attach the mismatch to the second field so the message lands under it.
  .refine(v => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine(v => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/** Job card intake. Vehicle and customer are the only hard requirements. */
export const jobCardSchema = z.object({
  customer: z.string().min(1, 'Select a customer'),
  vehicle: z.string().min(1, 'Select a vehicle'),
  serviceType: z.string().min(1, 'Select a service type'),
  odometerAtIntake: optionalOf(z.coerce.number().int().min(0, 'Odometer cannot be negative')),
  assignedMechanic: z.string().optional(),
  serviceAdvisor: z.string().optional(),
  estimatedDelivery: optionalText(40),
  notes: optionalText(1000),
});

/**
 * The estimation line-item editor on `pages/JobCardDetail.tsx`.
 *
 * That editor is not a conventional form — rows are added and removed
 * dynamically and the totals recompute on every keystroke — so this schema is
 * run with `safeParse` at save time rather than through a resolver. The rules
 * are here anyway so they sit with every other one.
 *
 * The numbers arrive already coerced (the editor does `parseFloat(...) || 0`),
 * which is why these are plain `z.number()` and not `z.coerce.number()`.
 *
 * There is deliberately **no** "at least one line" rule: saving an empty draft
 * is legitimate, and the requirement only bites when the estimation is *sent*.
 * That check stays at the send-status transition.
 */
export const estimationSchema = z
  .object({
    parts: z.array(
      z.object({
        partName: requiredText('Part name'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        unitPrice: nonNegativeNumber('Unit price'),
      })
    ),
    labor: z.array(
      z.object({
        description: requiredText('Labour description'),
        hours: z.number().positive('Hours must be greater than 0'),
        ratePerHour: nonNegativeNumber('Rate per hour'),
      })
    ),
    discount: nonNegativeNumber('Discount'),
    taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%'),
  })
  // A discount above the subtotal produces a negative grand total, which then
  // flows into an invoice. Catch it at the point it is typed.
  .refine(
    v => {
      const subtotal =
        v.parts.reduce((s, p) => s + p.quantity * p.unitPrice, 0) +
        v.labor.reduce((s, l) => s + l.hours * l.ratePerHour, 0);
      return v.discount <= subtotal;
    },
    { message: 'Discount cannot be more than the parts and labour total', path: ['discount'] }
  );

/**
 * Turn the first issue into something that names the offending row.
 * `parts.0.partName` on its own tells the user nothing about which of five
 * part rows to look at.
 */
export const describeEstimationIssue = (issue: { path: PropertyKey[]; message: string }): string => {
  const [section, index] = issue.path;
  if ((section === 'parts' || section === 'labor') && typeof index === 'number') {
    const label = section === 'parts' ? 'Part' : 'Labour';
    return `${label} ${index + 1}: ${issue.message}`;
  }
  return issue.message;
};

/** Platform admin sign-in. Same shape as a user login, different endpoint. */
export const adminLoginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Adding a branch from the sidebar switcher. A branch is a `Garage` record,
 * so `backend/models/Garage.ts` requires both of these — the same two fields
 * the full settings form requires.
 */
export const branchSchema = z.object({
  name: requiredText('Branch name'),
  phone,
});

/** Staff profile edit — the signed-in user changing their own details. */
export const profileSchema = z.object({
  name: requiredText('Name'),
  phone,
});

/** Field names follow `pages/Inventory.tsx`'s form, not the Mongoose model. */
export const inventorySchema = z.object({
  partName: requiredText('Part name'),
  partNumber: optionalText(50),
  category: z.string().min(1, 'Select a category'),
  quantity: nonNegativeNumber('Quantity'),
  threshold: nonNegativeNumber('Low-stock threshold'),
  unitPrice: nonNegativeNumber('Unit price'),
  sellingPrice: nonNegativeNumber('Selling price'),
  location: optionalText(100),
  supplier: z.object({
    name: optionalText(100),
    // Blank is fine; a number that is there has to be a real one.
    phone: optionalOf(phone),
  }),
});

/** Garage settings. Tax and labour rates are money-adjacent, so bounded. */
export const garageSettingsSchema = (locale: ResolvedLocale) =>
  z.object({
    name: requiredText('Garage name'),
    phone,
    email: optionalEmail,
    gstNumber: taxIdSchema(locale),
    country: z.string().min(1, 'Select a country'),
    settings: z.object({
      taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%'),
      laborRatePerHour: nonNegativeNumber('Labour rate'),
      /**
       * Optional because the Settings form does not edit these two, and the
       * API merges `settings` by dotted path — omitted keys are preserved,
       * not wiped. Requiring them here would force the form to invent values
       * for fields it never shows the user.
       */
      serviceReminderDays: optionalOf(
        z.coerce.number().int().min(1, 'Must be at least 1 day').max(730, 'Cannot exceed 730 days')
      ),
      /** '' clears the override so the country table's zone applies. */
      timezone: z.string().optional(),
    }),
    address: z.object({
      street: optionalText(),
      city: optionalText(100),
      state: optionalText(100),
      pincode: postalCodeSchema(locale),
    }),
  });

export type CustomerFormValues = z.infer<ReturnType<typeof customerSchema>>;
/**
 * Schemas that use `z.coerce` have a different *input* type from their
 * *output* type — the form holds the string an <input> produces, the handler
 * receives the coerced number. react-hook-form models that with three
 * generics: `useForm<Input, Context, Output>`. Export both so call sites do
 * not have to re-derive them.
 */
export type VehicleFormValues = z.input<typeof vehicleSchema>;
export type VehicleFormOutput = z.output<typeof vehicleSchema>;
export type StaffFormValues = z.infer<typeof staffSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type InventoryFormValues = z.input<typeof inventorySchema>;
export type InventoryFormOutput = z.output<typeof inventorySchema>;
export type GarageSettingsFormValues = z.input<ReturnType<typeof garageSettingsSchema>>;
export type GarageSettingsFormOutput = z.output<ReturnType<typeof garageSettingsSchema>>;
export type JobCardFormValues = z.input<typeof jobCardSchema>;
export type JobCardFormOutput = z.output<typeof jobCardSchema>;
export type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type BranchFormValues = z.infer<typeof branchSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
