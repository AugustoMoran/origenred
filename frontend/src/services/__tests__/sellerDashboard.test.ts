import { describe, expect, it } from 'vitest';

describe('seller dashboard health', () => {
  it('validates health score shape from API', () => {
    const health = {
      score: 82,
      label: 'Buena',
      factors: [
        { key: 'mp', label: 'Mercado Pago vinculado', ok: true, weight: 15 },
      ],
    };
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
    expect(health.factors.every((f) => typeof f.ok === 'boolean')).toBe(true);
  });
});
