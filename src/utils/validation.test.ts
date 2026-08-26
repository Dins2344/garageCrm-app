// MIRROR: keep in sync with frontend/src/utils/validation.test.ts.
// The only intended difference is the runner: Vitest there, Jest here, so
// `describe`/`it`/`expect` come from jest-expo's globals instead of an import.
import {
  customerSchema,
  vehicleSchema,
  staffSchema,
  resetPasswordSchema,
  inventorySchema,
  garageSettingsSchema,
  jobCardSchema,
  estimationSchema,
  describeEstimationIssue,
  branchSchema,
} from './validation';
import { DEFAULT_LOCALE } from './locale';
import type { ResolvedLocale } from '../types/models';

const IN = DEFAULT_LOCALE;
const GB: ResolvedLocale = {
  country: 'GB', currency: 'GBP', locale: 'en-GB', taxLabel: 'VAT', taxIdLabel: 'VAT No.',
  postalLabel: 'Postcode', postalInputMode: 'text', phoneExample: '07911 123456',
  timezone: 'Europe/London',
};

/** Convenience: did this input pass, and if not, what was said about `field`? */
const check = (schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } }, value: unknown) => {
  const r = schema.safeParse(value);
  return {
    ok: r.success,
    messageFor: (field: string) =>
      r.error?.issues.find(i => i.path.join('.') === field)?.message,
  };
};

const validCustomer = {
  name: 'Anita Desai',
  phone: '9876500001',
  email: 'anita@example.com',
  address: { street: '', city: 'Bengaluru', state: '', pincode: '560068' },
};

describe('customer schema', () => {
  it('accepts a complete customer', () => {
    expect(check(customerSchema(IN), validCustomer).ok).toBe(true);
  });

  it('requires a name and a phone, matching the backend model', () => {
    const r = check(customerSchema(IN), { ...validCustomer, name: '  ', phone: '' });
    expect(r.ok).toBe(false);
    expect(r.messageFor('name')).toMatch(/required/i);
    expect(r.messageFor('phone')).toBeTruthy();
  });

  it('treats email as optional but validates one that is present', () => {
    expect(check(customerSchema(IN), { ...validCustomer, email: '' }).ok).toBe(true);
    expect(check(customerSchema(IN), { ...validCustomer, email: undefined }).ok).toBe(true);
    expect(check(customerSchema(IN), { ...validCustomer, email: 'not-an-email' }).ok).toBe(false);
  });

  /**
   * The server's regex ends `(\.\w{2,3})+`, so a four-letter TLD is rejected
   * there. The client must agree or the user gets a server error with no
   * inline explanation.
   */
  it('rejects the TLDs the backend rejects', () => {
    expect(check(customerSchema(IN), { ...validCustomer, email: 'a@b.com' }).ok).toBe(true);
    expect(check(customerSchema(IN), { ...validCustomer, email: 'a@b.in' }).ok).toBe(true);
    expect(check(customerSchema(IN), { ...validCustomer, email: 'a@b.info' }).ok).toBe(false);
  });

  it('accepts the phone shapes the backend accepts', () => {
    for (const p of ['9876500001', '+91 98765 00001', '(020) 7946-0018', '07911 123456']) {
      expect(check(customerSchema(IN), { ...validCustomer, phone: p }).ok).toBe(true);
    }
    for (const p of ['12345', 'not a phone']) {
      expect(check(customerSchema(IN), { ...validCustomer, phone: p }).ok).toBe(false);
    }
  });
});

describe('postal codes follow the garage country', () => {
  it('requires digits where the country table says numeric', () => {
    const numeric = { ...validCustomer, address: { ...validCustomer.address, pincode: '560068' } };
    const alpha = { ...validCustomer, address: { ...validCustomer.address, pincode: 'SW1A 1AA' } };
    expect(check(customerSchema(IN), numeric).ok).toBe(true);
    expect(check(customerSchema(IN), alpha).ok).toBe(false);
  });

  /**
   * The regression this guards: a numeric-only rule made a UK postcode
   * literally unenterable, which is the same class of bug as the old
   * `type="number"` postal input.
   */
  it('accepts an alphanumeric postcode where the country is not numeric', () => {
    const alpha = { ...validCustomer, address: { ...validCustomer.address, pincode: 'SW1A 1AA' } };
    expect(check(customerSchema(GB), alpha).ok).toBe(true);
  });

  it('leaves the postal code optional in both', () => {
    const blank = { ...validCustomer, address: { ...validCustomer.address, pincode: '' } };
    expect(check(customerSchema(IN), blank).ok).toBe(true);
    expect(check(customerSchema(GB), blank).ok).toBe(true);
  });
});

describe('vehicle schema', () => {
  const valid = { licensePlate: 'KA 05 MJ 4412', make: 'Maruti', model: 'Swift', customer: 'c1', year: '', fuelType: '', color: '' };

  it('requires plate, make, model and a customer', () => {
    const r = check(vehicleSchema, { ...valid, licensePlate: '', make: '', model: '', customer: '' });
    expect(r.ok).toBe(false);
    for (const f of ['licensePlate', 'make', 'model', 'customer']) expect(r.messageFor(f)).toBeTruthy();
  });

  it('rejects a year in the future but allows next year for a new plate', () => {
    const next = new Date().getFullYear() + 1;
    expect(check(vehicleSchema, { ...valid, year: String(next) }).ok).toBe(true);
    expect(check(vehicleSchema, { ...valid, year: String(next + 1) }).ok).toBe(false);
  });

  it('leaves the year optional', () => {
    expect(check(vehicleSchema, { ...valid, year: '' }).ok).toBe(true);
  });
});

describe('staff schema', () => {
  const valid = { name: 'Imran Shaikh', email: 'imran@example.com', phone: '9876543211', role: 'mechanic', password: 'secret123' };

  it('accepts a complete staff member', () => {
    expect(check(staffSchema, valid).ok).toBe(true);
  });

  it('allows a blank password so the edit form can leave it unchanged', () => {
    expect(check(staffSchema, { ...valid, password: '' }).ok).toBe(true);
  });

  it('enforces the backend minimum when a password is supplied', () => {
    expect(check(staffSchema, { ...valid, password: 'short' }).ok).toBe(false);
  });
});

describe('reset password', () => {
  it('reports the mismatch on the confirm field, where the user is looking', () => {
    const r = check(resetPasswordSchema, { password: 'secret123', confirmPassword: 'secret124' });
    expect(r.ok).toBe(false);
    expect(r.messageFor('confirmPassword')).toMatch(/do not match/i);
  });

  it('passes when both match and clear the minimum', () => {
    expect(check(resetPasswordSchema, { password: 'secret123', confirmPassword: 'secret123' }).ok).toBe(true);
  });
});

describe('inventory schema', () => {
  const valid = { partName: 'Brake pad set', partNumber: 'BP-01', category: 'brakes', quantity: 3, threshold: 5, unitPrice: 2400, sellingPrice: 3200, location: 'A1', supplier: { name: '', phone: '' } };

  it('rejects negative money and quantities', () => {
    expect(check(inventorySchema, { ...valid, quantity: -1 }).ok).toBe(false);
    expect(check(inventorySchema, { ...valid, unitPrice: -5 }).ok).toBe(false);
  });

  it('coerces the strings an input actually produces', () => {
    expect(check(inventorySchema, { ...valid, quantity: '3', unitPrice: '2400' }).ok).toBe(true);
  });

  it('supplier phone: blank ok, valid ok, malformed rejected', () => {
    expect(check(inventorySchema, { ...valid, supplier: { name: 'Acme', phone: '' } }).ok).toBe(true);
    expect(check(inventorySchema, { ...valid, supplier: { name: 'Acme', phone: '9876543210' } }).ok).toBe(true);
    expect(check(inventorySchema, { ...valid, supplier: { name: 'Acme', phone: '123' } }).ok).toBe(false);
  });
});

describe('garage settings', () => {
  const valid = {
    name: 'Speed Auto Works', phone: '9876543210', email: 'hello@example.com',
    gstNumber: '29ABCDE1234F1Z5', country: 'IN',
    settings: { taxRate: 18, laborRatePerHour: 450, serviceReminderDays: 180 },
    address: { street: '', city: 'Bengaluru', state: 'Karnataka', pincode: '560068' },
  };

  it('accepts a complete settings payload', () => {
    expect(check(garageSettingsSchema(IN), valid).ok).toBe(true);
  });

  it('bounds the tax rate to a percentage', () => {
    expect(check(garageSettingsSchema(IN), { ...valid, settings: { ...valid.settings, taxRate: 120 } }).ok).toBe(false);
    expect(check(garageSettingsSchema(IN), { ...valid, settings: { ...valid.settings, taxRate: 0 } }).ok).toBe(true);
  });

  /** A UK garage's VAT number must fit the same relaxed shape. */
  it('accepts a non-Indian tax id', () => {
    expect(check(garageSettingsSchema(GB), { ...valid, gstNumber: 'GB123456789', country: 'GB', address: { ...valid.address, pincode: 'SW1A 1AA' } }).ok).toBe(true);
  });

  it('leaves the tax id blank-able', () => {
    expect(check(garageSettingsSchema(IN), { ...valid, gstNumber: '' }).ok).toBe(true);
  });
});

describe('estimation schema', () => {
  const valid = {
    parts: [{ partName: 'Brake pad set', quantity: 2, unitPrice: 1200 }],
    labor: [{ description: 'Brake service', hours: 1.5, ratePerHour: 400 }],
    discount: 0,
    taxRate: 18,
  };

  it('accepts a complete estimation', () => {
    expect(check(estimationSchema, valid).ok).toBe(true);
  });

  /** Saving an empty draft is legitimate — the rule only bites on send. */
  it('allows an estimation with no lines at all', () => {
    expect(check(estimationSchema, { ...valid, parts: [], labor: [] }).ok).toBe(true);
  });

  it('rejects a part row with no name', () => {
    const r = check(estimationSchema, { ...valid, parts: [{ partName: '  ', quantity: 1, unitPrice: 10 }] });
    expect(r.ok).toBe(false);
    expect(r.messageFor('parts.0.partName')).toMatch(/required/i);
  });

  it('rejects zero-quantity parts and zero-hour labour', () => {
    expect(check(estimationSchema, { ...valid, parts: [{ partName: 'X', quantity: 0, unitPrice: 10 }] }).ok).toBe(false);
    expect(check(estimationSchema, { ...valid, labor: [{ description: 'X', hours: 0, ratePerHour: 10 }] }).ok).toBe(false);
  });

  /**
   * The one that reaches an invoice: a discount above the subtotal makes the
   * grand total negative, and nothing downstream re-checks it.
   */
  it('rejects a discount larger than the parts and labour total', () => {
    // Subtotal here is 2*1200 + 1.5*400 = 3000.
    expect(check(estimationSchema, { ...valid, discount: 3000 }).ok).toBe(true);
    const r = check(estimationSchema, { ...valid, discount: 3001 });
    expect(r.ok).toBe(false);
    expect(r.messageFor('discount')).toMatch(/more than/i);
  });

  it('bounds the tax rate to a percentage', () => {
    expect(check(estimationSchema, { ...valid, taxRate: 101 }).ok).toBe(false);
    expect(check(estimationSchema, { ...valid, taxRate: -1 }).ok).toBe(false);
  });

  it('names the offending row rather than printing a raw path', () => {
    const r = estimationSchema.safeParse({
      ...valid,
      parts: [
        { partName: 'Fine', quantity: 1, unitPrice: 10 },
        { partName: '', quantity: 1, unitPrice: 10 },
      ],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(describeEstimationIssue(r.error.issues[0])).toBe('Part 2: Part name is required');
    }
  });
});

describe('branch schema', () => {
  it('requires a name and a well-formed phone', () => {
    expect(check(branchSchema, { name: 'Downtown', phone: '9876543210' }).ok).toBe(true);
    expect(check(branchSchema, { name: '', phone: '9876543210' }).ok).toBe(false);
    expect(check(branchSchema, { name: 'Downtown', phone: '123' }).ok).toBe(false);
  });
});

/**
 * The rule for every optional field: blank passes, but anything typed in is
 * held to the full standard. An optional email containing "asdf" is an error,
 * not an accepted value — otherwise malformed data lands in exactly the fields
 * nobody checks.
 */
describe('optional fields are validated when filled', () => {
  const cases: [string, unknown, unknown, unknown][] = [
    // label,            schema-input builder for blank / good / bad
    ['customer email', { ...validCustomer, email: '' }, { ...validCustomer, email: 'a@b.com' }, { ...validCustomer, email: 'asdf' }],
  ];

  for (const [label, blank, good, bad] of cases) {
    it(`${label}: blank ok, valid ok, malformed rejected`, () => {
      expect(check(customerSchema(IN), blank).ok).toBe(true);
      expect(check(customerSchema(IN), good).ok).toBe(true);
      expect(check(customerSchema(IN), bad).ok).toBe(false);
    });
  }

  it('garage tax id: blank ok, valid ok, punctuation rejected', () => {
    const base = {
      name: 'G', phone: '9876543210', email: '', country: 'IN',
      settings: { taxRate: 18, laborRatePerHour: 450, serviceReminderDays: 180 },
      address: { street: '', city: '', state: '', pincode: '' },
    };
    expect(check(garageSettingsSchema(IN), { ...base, gstNumber: '' }).ok).toBe(true);
    expect(check(garageSettingsSchema(IN), { ...base, gstNumber: '29ABCDE1234F1Z5' }).ok).toBe(true);
    expect(check(garageSettingsSchema(IN), { ...base, gstNumber: 'not@valid!' }).ok).toBe(false);
  });

  it('job card odometer: blank ok, number ok, negative rejected', () => {
    const base = { customer: 'c1', vehicle: 'v1', serviceType: 'service' };
    expect(check(jobCardSchema, { ...base, odometerAtIntake: '' }).ok).toBe(true);
    expect(check(jobCardSchema, { ...base, odometerAtIntake: '48210' }).ok).toBe(true);
    expect(check(jobCardSchema, { ...base, odometerAtIntake: '-1' }).ok).toBe(false);
  });
});
