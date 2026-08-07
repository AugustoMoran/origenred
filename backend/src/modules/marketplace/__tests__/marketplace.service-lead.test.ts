import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../../app';
import { User } from '../../../modules/auth/models/User';
import { SellerProfile } from '../models/SellerProfile';

describe('service leads', () => {
  it('allows seller to request OrigenRed service advisory', async () => {
    const hashed = await bcrypt.hash('Password123!', 10);
    const sellerUser = await User.create({
      name: 'Vendedor Servicios',
      email: 'seller-services@test.com',
      password: hashed,
      roles: ['vendedor_marketplace'],
    });

    await SellerProfile.create({
      user: sellerUser._id,
      businessName: 'Tienda Test',
      slug: 'tienda-test-services',
      status: 'approved',
    });

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'seller-services@test.com', password: 'Password123!' });

    const catalogRes = await agent.get('/api/marketplace/seller/services');
    expect(catalogRes.status).toBe(200);
    expect(catalogRes.body.services.length).toBeGreaterThan(0);

    const res = await agent.post('/api/marketplace/seller/service-leads').send({
      serviceType: 'meta_ads',
      message: 'Quiero campaña para Instagram',
    });

    expect(res.status).toBe(201);
    expect(res.body.lead.serviceType).toBe('meta_ads');
    expect(res.body.lead.status).toBe('new');
  });
});
