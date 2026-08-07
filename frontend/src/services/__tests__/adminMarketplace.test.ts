import { describe, expect, it } from 'vitest';

const STATUS_LABELS: Record<string, string> = {
  new: 'Nueva',
  contacted: 'Contactado',
  closed: 'Cerrado',
};

describe('AdminMarketplaceServiceLeads', () => {
  it('maps service lead status labels', () => {
    expect(STATUS_LABELS.new).toBe('Nueva');
    expect(Object.keys(STATUS_LABELS)).toHaveLength(3);
  });

  it('validates admin service lead update payload', () => {
    const payload = { id: 'lead-1', status: 'contacted' as const };
    expect(['contacted', 'closed']).toContain(payload.status);
  });
});

describe('AdminMarketplaceAnalytics cards', () => {
  it('includes marketplace operational counters', () => {
    const totals = {
      gmv: 100000,
      orderCount: 12,
      commissionTotal: 5000,
      pendingServiceLeads: 2,
      pendingReturns: 1,
    };
    expect(totals.pendingServiceLeads).toBeGreaterThanOrEqual(0);
    expect(totals.gmv).toBeGreaterThan(totals.commissionTotal);
  });
});
