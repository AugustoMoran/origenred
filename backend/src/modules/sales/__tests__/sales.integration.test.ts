import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../../app';
import Product from '../../inventory/models/Product';
import { User } from '../../auth/models/User';

describe('Sales Integration Tests', () => {
  let token: string;
  let productId: string;

  beforeEach(async () => {
    // Hash password manually for direct DB insert
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    
    // 1. Create Admin User
    const admin = await User.create({
      email: 'admin_test@test.com',
      password: hashedPassword,
      roles: ['admin'],
      permissions: { 'sales:edit': true, 'sales:view': true, 'inventory:edit': true }
    });

    // 2. Login to get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin_test@test.com', password: 'Password123!' });
    
    token = res.body.access;

    // 3. Create a product via DB
    const product = await Product.create({
      name: 'Test Product',
      sku: 'TEST-SKU',
      price: 1000,
      costPrice: 500,
      stock: 10,
      minStock: 2,
      category: 'General'
    });
    productId = (product._id as any).toString();
  });

  it('should create a sale and reduce stock', async () => {
    const saleData = {
      items: [
        {
          product: productId,
          name: 'Test Product',
          quantity: 2,
          price: 1000,
          ivaRate: 21
        }
      ],
      paymentMethod: 'efectivo',
      invoiceType: 'B'
    };

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(saleData);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('invoiceNumber');
    expect(res.body.total).toBe(2000); // 1000 * 2
    expect(res.body.items).toHaveLength(1);

    // Verify Stock Reduction
    const updatedProduct = await Product.findById(productId);
    expect(updatedProduct?.stock).toBe(8); // 10 - 2
  });

  it('should fail if stock is insufficient', async () => {
    const saleData = {
      items: [
        {
          product: productId,
          name: 'Test Product',
          quantity: 20, // More than current 8
          price: 1000,
          ivaRate: 21
        }
      ]
    };

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(saleData);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Stock insuficiente/);
  });

  it('should create a sale with client data and support AFIP requirements', async () => {
    const saleData = {
      items: [{ product: productId, name: 'Test Product', quantity: 1, price: 1000, ivaRate: 21 }],
      paymentMethod: 'efectivo',
      clientName: 'Empresa Test SA',
      clientCuit: '30777777775',
      clientAddress: 'Calle Falsa 123'
    };

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(saleData);

    expect(res.status).toBe(201);
    expect(res.body.clientName).toBe(saleData.clientName);
    expect(res.body.clientCuit).toBe(saleData.clientCuit);
    expect(res.body.invoiceNumber).toMatch(/^00001-\d{8}$/);
    expect(res.body.invoiceType).toBe('A');
  });

  it('should generate a PDF invoice for a sale', async () => {
    // 1. Create a sale
    const saleData = {
      items: [{ product: productId, name: 'Test Product', quantity: 1, price: 1000, ivaRate: 21 }],
      paymentMethod: 'transferencia'
    };
    const saleRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(saleData);
    
    const saleId = saleRes.body._id;

    // 2. Request PDF
    const res = await request(app)
      .get(`/api/sales/${saleId}/download`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toBe('application/pdf');
    expect(Buffer.isBuffer(res.body)).toBe(true);
  });

  it('should list sales', async () => {
    // Primero crear una venta
    const saleData = {
      items: [{ product: productId, name: 'Test Product', quantity: 1, price: 1000, ivaRate: 21 }],
      paymentMethod: 'efectivo'
    };
    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(saleData);

    const res = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
