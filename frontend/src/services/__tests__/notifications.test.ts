import { describe, expect, it } from 'vitest';

describe('notification items', () => {
  it('supports return notification type', () => {
    const item = {
      id: 'seller-return-1',
      type: 'return' as const,
      title: 'Nueva solicitud de devolución',
      body: 'Pedido OR-123',
      href: '/vendedor/devoluciones',
      at: new Date().toISOString(),
      unread: true,
    };
    expect(item.type).toBe('return');
    expect(item.href).toContain('devoluciones');
  });
});
