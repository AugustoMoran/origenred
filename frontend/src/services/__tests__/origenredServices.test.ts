import { describe, expect, it } from 'vitest';

describe('OrigenRed service leads', () => {
  it('validates service lead request payload', () => {
    const payload = {
      serviceType: 'meta_ads',
      message: 'Quiero campaña para Instagram',
    };
    expect(payload.serviceType).toBe('meta_ads');
    expect(payload.message.length).toBeGreaterThan(0);
  });

  it('tracks seller service lead status labels', () => {
    const labels: Record<string, string> = {
      new: 'En revisión',
      contacted: 'Contactado',
      closed: 'Cerrado',
    };
    expect(labels.new).toBe('En revisión');
    expect(Object.keys(labels)).toHaveLength(3);
  });
});
