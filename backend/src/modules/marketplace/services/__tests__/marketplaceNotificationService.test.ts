import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../../../auth/models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { ReturnRequest } from '../../models/ReturnRequest';
import { MarketplaceOrder } from '../../models/MarketplaceOrder';
import { buildNotificationItems } from '../marketplaceNotificationService';

describe('buildNotificationItems', () => {
  it('includes return request notifications for buyer and seller', async () => {
    const hashed = await bcrypt.hash('Password123!', 10);
    const buyer = await User.create({
      name: 'Buyer Notif',
      email: 'buyer-notif@test.com',
      password: hashed,
      roles: ['comprador_marketplace'],
    });

    const sellerUser = await User.create({
      name: 'Seller Notif',
      email: 'seller-notif@test.com',
      password: hashed,
      roles: ['vendedor_marketplace'],
    });

    const profile = await SellerProfile.create({
      user: sellerUser._id,
      businessName: 'Tienda Notif',
      slug: 'tienda-notif',
      status: 'approved',
    });

    const order = await MarketplaceOrder.create({
      orderNumber: 'OR-NOTIF-RET',
      buyer: buyer._id,
      items: [
        {
          listing: new mongoose.Types.ObjectId(),
          seller: profile._id,
          title: 'Prod',
          slug: 'prod',
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
      status: 'paid',
      chatEnabled: false,
      shippingMethod: 'pickup',
    });

    await ReturnRequest.create({
      order: order._id,
      orderNumber: order.orderNumber,
      buyer: buyer._id,
      seller: profile._id,
      reason: 'producto_defectuoso',
      status: 'pending',
    });

    const buyerItems = await buildNotificationItems(String(buyer._id));
    const sellerItems = await buildNotificationItems(String(sellerUser._id));

    expect(buyerItems.some((i) => i.type === 'return')).toBe(false);

    expect(sellerItems.some((i) => i.type === 'return' && i.title.includes('devolución'))).toBe(true);
  });
});
