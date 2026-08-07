import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../../../auth/models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { createReturnRequest } from '../returnRequestService';
import { buildNotificationItems } from '../marketplaceNotificationService';
import { MarketplaceNotification } from '../../models/MarketplaceNotification';
import { MarketplaceOrder } from '../../models/MarketplaceOrder';

describe('persisted notifications', () => {
  it('stores seller return notification when return is created', async () => {
    const hashed = await bcrypt.hash('Password123!', 10);
    const buyer = await User.create({
      name: 'Buyer Persist',
      email: 'buyer-persist@test.com',
      password: hashed,
      roles: ['comprador_marketplace'],
    });

    const sellerUser = await User.create({
      name: 'Seller Persist',
      email: 'seller-persist@test.com',
      password: hashed,
      roles: ['vendedor_marketplace'],
    });

    const profile = await SellerProfile.create({
      user: sellerUser._id,
      businessName: 'Tienda Persist',
      slug: 'tienda-persist',
      status: 'approved',
    });

    const order = await MarketplaceOrder.create({
      orderNumber: 'OR-PERSIST-RET',
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

    await createReturnRequest({
      buyerId: String(buyer._id),
      orderNumber: order.orderNumber,
      reason: 'producto_defectuoso',
    });

    const persisted = await MarketplaceNotification.findOne({ user: sellerUser._id, type: 'return' });
    expect(persisted?.orderNumber).toBe(order.orderNumber);

    const items = await buildNotificationItems(String(sellerUser._id));
    expect(items.some((i) => i.type === 'return' && i.id.startsWith('persisted-'))).toBe(true);
  });
});
