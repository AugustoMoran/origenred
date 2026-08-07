import request from 'supertest';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { app } from '../../../app';
import { User } from '../../../modules/auth/models/User';
import { MarketplaceOrder } from '../models/MarketplaceOrder';

describe('return requests', () => {
  it('allows buyer to create return request on paid order', async () => {
    const hashed = await bcrypt.hash('Password123!', 10);
    const buyer = await User.create({
      name: 'Comprador Return',
      email: 'buyer-return@test.com',
      password: hashed,
      roles: ['comprador_marketplace'],
    });

    const sellerId = new mongoose.Types.ObjectId();
    const listingId = new mongoose.Types.ObjectId();

    const order = await MarketplaceOrder.create({
      orderNumber: 'OR-RETURN-TEST',
      buyer: buyer._id,
      items: [
        {
          listing: listingId,
          seller: sellerId,
          title: 'Producto',
          slug: 'producto',
          price: 5000,
          quantity: 1,
          subtotal: 5000,
        },
      ],
      subtotal: 5000,
      shippingTotal: 0,
      commissionTotal: 250,
      commissionPercent: 5,
      total: 5000,
      status: 'paid',
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
    await agent.post('/api/auth/login').send({ email: 'buyer-return@test.com', password: 'Password123!' });

    const res = await agent.post('/api/marketplace/returns').send({
      orderNumber: order.orderNumber,
      reason: 'producto_defectuoso',
      description: 'Llegó roto',
    });

    expect(res.status).toBe(201);
    expect(res.body.request.orderNumber).toBe('OR-RETURN-TEST');
    expect(res.body.request.status).toBe('pending');
  });
});
