import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { getSellerDashboardInsights } from '../sellerDashboardService';
import { User } from '../../../auth/models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { Listing } from '../../models/Listing';

describe('getSellerDashboardInsights', () => {
  it('computes health score from seller profile and listings', async () => {

    const hashed = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      name: 'Dash Seller',
      email: 'seller-dash@test.com',
      password: hashed,
      roles: ['vendedor_marketplace'],
    });

    const profile = await SellerProfile.create({
      user: user._id,
      businessName: 'Tienda Dash',
      slug: 'tienda-dash-health',
      status: 'approved',
      description: 'Vendemos de todo',
      phone: '1112345678',
      city: 'CABA',
      mercadoPagoConnected: true,
      reputationScore: 80,
    });

    const categoryId = new mongoose.Types.ObjectId();
    await Listing.create({
      seller: profile._id,
      title: 'Producto completo',
      slug: 'producto-completo-dash',
      description: 'Descripción larga con detalles del producto para cumplir el mínimo de caracteres requerido por salud de cuenta.',
      price: 5000,
      stock: 5,
      category: categoryId,
      condition: 'new',
      images: [{ url: 'https://example.com/img.jpg' }],
      weight: 0.5,
      status: 'active',
    });

    const insights = await getSellerDashboardInsights(String(user._id));

    expect(insights.health.score).toBeGreaterThanOrEqual(70);
    expect(insights.health.label).toBeTruthy();
    expect(insights.learningArticles.length).toBeGreaterThan(0);
    expect(insights.recommendations.length).toBeGreaterThan(0);
  });
});
