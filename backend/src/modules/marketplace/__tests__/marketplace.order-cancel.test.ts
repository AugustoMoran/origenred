import request from 'supertest';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { app } from '../../../app';
import { User } from '../../../modules/auth/models/User';
import { MarketplaceOrder } from '../models/MarketplaceOrder';

describe('cancelMarketplaceOrder', () => {
  it('allows buyer to cancel pending_payment order', async () => {
    const hashed = await bcrypt.hash('Password123!', 10);
    const buyer = await User.create({
      name: 'Comprador Test',
      email: 'buyer-cancel@test.com',
      password: hashed,
      roles: ['comprador_marketplace'],
    });

    const listingId = new mongoose.Types.ObjectId();
    const sellerId = new mongoose.Types.ObjectId();

    const order = await MarketplaceOrder.create({
      orderNumber: 'OR-CANCEL-TEST',
      buyer: buyer._id,
      items: [
        {
          listing: listingId,
          seller: sellerId,
          title: 'Producto test',
          slug: 'producto-test',
          price: 1000,
          quantity: 1,
          subtotal: 1000,
        },
      ],
      subtotal: 1000,
      shippingTotal: 0,
      commissionTotal: 50,
      commissionPercent: 5,
      total: 1000,
      status: 'pending_payment',
      chatEnabled: false,
      shippingAddress: {
        fullName: 'Test',
        phone: '111',
        street: 'Calle',
        city: 'CABA',
        province: 'CABA',
        postalCode: '1406',
      },
      shippingMethod: 'delivery',
    });

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'buyer-cancel@test.com', password: 'Password123!' });

    const res = await agent.post(`/api/marketplace/orders/${order.orderNumber}/cancel`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');

    const updated = await MarketplaceOrder.findById(order._id);
    expect(updated?.status).toBe('cancelled');
  });
});
