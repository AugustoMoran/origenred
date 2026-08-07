import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../../app';
import { User } from '../../../modules/auth/models/User';
import { SellerProfile } from '../models/SellerProfile';

describe('seller profile update', () => {
  it('allows seller to update profile fields', async () => {
    const hashed = await bcrypt.hash('Password123!', 10);
    const sellerUser = await User.create({
      name: 'Vendedor Perfil',
      email: 'seller-profile@test.com',
      password: hashed,
      roles: ['vendedor_marketplace'],
    });

    await SellerProfile.create({
      user: sellerUser._id,
      businessName: 'Tienda Vieja',
      slug: 'tienda-perfil-test',
      status: 'approved',
    });

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'seller-profile@test.com', password: 'Password123!' });

    const res = await agent.patch('/api/marketplace/seller/me').send({
      businessName: 'Tienda Actualizada',
      description: 'Vendemos productos de calidad',
      phone: '1122334455',
      city: 'CABA',
      province: 'CABA',
      postalCode: '1406',
    });

    expect(res.status).toBe(200);
    expect(res.body.businessName).toBe('Tienda Actualizada');
    expect(res.body.phone).toBe('1122334455');
    expect(res.body.city).toBe('CABA');
  });
});
