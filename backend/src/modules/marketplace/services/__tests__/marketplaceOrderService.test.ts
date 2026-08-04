import { toPublicOrderSummary } from '../marketplaceOrderService';

describe('toPublicOrderSummary', () => {
  it('returns limited order fields without shipping address', () => {
    const summary = toPublicOrderSummary({
      orderNumber: 'OR-TEST-1',
      total: 15000,
      status: 'paid',
      chatEnabled: true,
      shippingAddress: {
        fullName: 'Juan Pérez',
        phone: '111',
        street: 'Calle 1',
        city: 'CABA',
        province: 'Buenos Aires',
        postalCode: '1000',
      },
      items: [
        {
          listing: '507f1f77bcf86cd799439011' as any,
          seller: '507f1f77bcf86cd799439012' as any,
          title: 'Producto test',
          slug: 'producto-test',
          price: 15000,
          quantity: 1,
          subtotal: 15000,
        },
      ],
    } as any);

    expect(summary.orderNumber).toBe('OR-TEST-1');
    expect(summary.total).toBe(15000);
    expect(summary.chatEnabled).toBe(true);
    expect(summary.items?.length).toBe(1);
    expect(summary).not.toHaveProperty('shippingAddress');
    expect(summary).not.toHaveProperty('guestEmail');
  });
});
