import { describe, expect, it } from 'vitest';

const RETURN_REASONS = ['producto_defectuoso', 'no_recibido', 'no_coincide', 'otro'];

describe('return request reasons', () => {
  it('includes standard marketplace return reasons', () => {
    expect(RETURN_REASONS).toContain('producto_defectuoso');
    expect(RETURN_REASONS).toContain('no_recibido');
    expect(RETURN_REASONS.length).toBe(4);
  });
});
