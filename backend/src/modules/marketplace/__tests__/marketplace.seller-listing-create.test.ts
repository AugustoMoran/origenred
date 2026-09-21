import request from 'supertest';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { app } from '../../../app';
import { User } from '../../../modules/auth/models/User';
import { SellerProfile } from '../models/SellerProfile';
import { MarketplaceCategory } from '../models/MarketplaceCategory';

describe('seller listing create', () => {
  it('creates a draft listing for an approved seller', async () => {
    const hashed = await bcrypt.hash('Password123!', 10);
    const sellerUser = await User.create({
      name: 'Vendedor Listing',
      email: 'seller-listing-create@test.com',
      password: hashed,
      roles: ['vendedor_marketplace'],
    });

    await SellerProfile.create({
      user: sellerUser._id,
      businessName: 'Tienda Listing',
      slug: 'tienda-listing-create-test',
      status: 'approved',
    });

    const category = await MarketplaceCategory.create({
      name: 'Test Cat',
      slug: 'test-cat-listing-create',
      isActive: true,
      listingCount: 0,
      displayOrder: 0,
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'seller-listing-create@test.com', password: 'Password123!' });

    const res = await agent.post('/api/marketplace/seller/listings').send({
      title: 'Producto prueba',
      description: 'Descripción de prueba',
      price: 1500,
      stock: 2,
      category: String(category._id),
      status: 'draft',
    });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Producto prueba');
    expect(res.body.status).toBe('draft');
  });

  it('rejects unauthenticated create', async () => {
    const res = await request(app).post('/api/marketplace/seller/listings').send({
      title: 'X',
      description: 'Y',
      price: 1,
      category: new mongoose.Types.ObjectId(),
    });
    expect(res.status).toBe(401);
  });
});
