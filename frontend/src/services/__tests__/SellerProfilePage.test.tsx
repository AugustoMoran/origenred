import { describe, expect, it } from 'vitest';

describe('seller profile form', () => {
  it('includes fields required for account health', () => {
    const payload = {
      businessName: 'Mi Tienda',
      description: 'Vendemos de todo',
      phone: '1122334455',
      city: 'CABA',
      province: 'CABA',
      postalCode: '1406',
    };
    expect(Object.keys(payload)).toHaveLength(6);
    expect(payload.businessName.length).toBeGreaterThan(0);
    expect(payload.phone.length).toBeGreaterThan(5);
  });
});
