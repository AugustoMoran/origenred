import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../../app';
import { User } from '../../../modules/auth/models/User';
import { SellerProfile } from '../models/SellerProfile';
import { ServiceLead } from '../models/ServiceLead';

describe('admin service leads', () => {
  it('lists service leads for admin', async () => {
    const hashed = await bcrypt.hash('Password123!', 10);
    const admin = await User.create({
      name: 'Admin Leads',
      email: 'admin-leads@test.com',
      password: hashed,
      roles: ['admin'],
    });

    const sellerUser = await User.create({
      name: 'Seller Leads',
      email: 'seller-leads-admin@test.com',
      password: hashed,
      roles: ['vendedor_marketplace'],
    });

    const profile = await SellerProfile.create({
      user: sellerUser._id,
      businessName: 'Tienda Leads',
      slug: 'tienda-leads-admin',
      status: 'approved',
    });

    await ServiceLead.create({
      seller: profile._id,
      user: sellerUser._id,
      serviceType: 'seo',
      status: 'new',
      message: 'Quiero mejorar SEO',
    });

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'admin-leads@test.com', password: 'Password123!' });

    const res = await agent.get('/api/marketplace/admin/service-leads?status=new');

    expect(res.status).toBe(200);
    expect(res.body.leads.length).toBeGreaterThanOrEqual(1);
    expect(res.body.labels.seo).toBeTruthy();
  });
});
