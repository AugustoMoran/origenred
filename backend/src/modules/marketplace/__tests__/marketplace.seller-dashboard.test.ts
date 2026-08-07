import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../../app';
import { User } from '../../../modules/auth/models/User';
import { SellerProfile } from '../models/SellerProfile';

describe('seller dashboard API', () => {
  it('returns health score and learning articles', async () => {
    const hashed = await bcrypt.hash('Password123!', 10);
    const sellerUser = await User.create({
      name: 'Dash API',
      email: 'seller-dash-api@test.com',
      password: hashed,
      roles: ['vendedor_marketplace'],
    });

    await SellerProfile.create({
      user: sellerUser._id,
      businessName: 'Tienda Dash API',
      slug: 'tienda-dash-api',
      status: 'approved',
      mercadoPagoConnected: true,
      description: 'Tienda de prueba',
      phone: '111',
      city: 'CABA',
    });

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'seller-dash-api@test.com', password: 'Password123!' });

    const res = await agent.get('/api/marketplace/seller/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.health.score).toBeGreaterThanOrEqual(0);
    expect(res.body.learningArticles.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });
});
