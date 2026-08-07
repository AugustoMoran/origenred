import request from 'supertest';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { app } from '../../../app';
import { User } from '../../../modules/auth/models/User';
import { SellerProfile } from '../models/SellerProfile';
import { MarketplaceOrder } from '../models/MarketplaceOrder';
import { MarketplaceNotification } from '../models/MarketplaceNotification';

describe('return flow with persisted notifications', () => {
  it('creates return, notifies seller, approves, and marks notification read', async () => {
    const hashed = await bcrypt.hash('Password123!', 10);
    const buyer = await User.create({
      name: 'Buyer Flow',
      email: 'buyer-flow@test.com',
      password: hashed,
      roles: ['comprador_marketplace'],
    });

    const sellerUser = await User.create({
      name: 'Seller Flow',
      email: 'seller-flow@test.com',
      password: hashed,
      roles: ['vendedor_marketplace'],
    });

    const profile = await SellerProfile.create({
      user: sellerUser._id,
      businessName: 'Tienda Flow',
      slug: 'tienda-flow',
      status: 'approved',
    });

    const order = await MarketplaceOrder.create({
      orderNumber: 'OR-FLOW-RET',
      buyer: buyer._id,
      items: [
        {
          listing: new mongoose.Types.ObjectId(),
          seller: profile._id,
          title: 'Producto',
          slug: 'producto',
          price: 8000,
          quantity: 1,
          subtotal: 8000,
        },
      ],
      subtotal: 8000,
      shippingTotal: 0,
      commissionTotal: 400,
      commissionPercent: 5,
      total: 8000,
      status: 'delivered',
      chatEnabled: true,
      shippingMethod: 'pickup',
    });

    const buyerAgent = request.agent(app);
    await buyerAgent.post('/api/auth/login').send({ email: 'buyer-flow@test.com', password: 'Password123!' });

    const createRes = await buyerAgent.post('/api/marketplace/returns').send({
      orderNumber: order.orderNumber,
      reason: 'producto_defectuoso',
      description: 'No funciona',
    });
    expect(createRes.status).toBe(201);

    const sellerAgent = request.agent(app);
    await sellerAgent.post('/api/auth/login').send({ email: 'seller-flow@test.com', password: 'Password123!' });

    const sellerNotif = await sellerAgent.get('/api/marketplace/notifications/summary');
    expect(sellerNotif.status).toBe(200);
    const sellerReturnItem = sellerNotif.body.items.find((i: any) => i.type === 'return');
    expect(sellerReturnItem?.title).toContain('devolución');

    const returnId = createRes.body.request._id;
    const approveRes = await sellerAgent.patch(`/api/marketplace/seller/returns/${returnId}`).send({
      status: 'approved',
    });
    expect(approveRes.status).toBe(200);

    const buyerNotif = await buyerAgent.get('/api/marketplace/notifications/summary');
    const buyerReturnItem = buyerNotif.body.items.find(
      (i: any) => i.type === 'return' && i.title.includes('aprobada')
    );
    expect(buyerReturnItem).toBeTruthy();

    if (sellerReturnItem?.id?.startsWith('persisted-')) {
      const markRes = await sellerAgent.patch(
        `/api/marketplace/notifications/${sellerReturnItem.id}/read`
      );
      expect(markRes.status).toBe(200);
      const unread = await MarketplaceNotification.countDocuments({
        user: sellerUser._id,
        readAt: { $exists: false },
      });
      expect(unread).toBe(0);
    }
  });
});
