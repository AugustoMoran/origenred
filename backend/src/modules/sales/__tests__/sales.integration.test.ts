import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../../app';
import Product from '../../inventory/models/Product';
import { User } from '../../auth/models/User';
import Branch from '../../branches/models/Branch';
import BranchStock from '../../stock/models/BranchStock';

describe('Sales Integration Tests', () => {
  let token: string;
  let productId: string;
  let branchId: string;

  beforeEach(async () => {
    const branch = await Branch.create({
      name: 'Sucursal Test',
      address: 'Calle Test 123',
      isActive: true,
      isMain: true,
    });
    branchId = (branch._id as any).toString();

    // Hash password manually for direct DB insert
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    
    // 1. Create Admin User
    await User.create({
      name: 'Admin Test',
      email: 'admin_test@test.com',
      password: hashedPassword,
      roles: ['admin'],
      branch: branchId,
      permissions: { 'sales:edit': true, 'sales:view': true, 'inventory:edit': true }
    });

    // 2. Login to get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin_test@test.com', password: 'Password123!' });
    
    token = res.body.token;

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

    await BranchStock.create({
      product: productId,
      branch: branchId,
      stock: 10,
      minStock: 2,
    });
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
    expect(res.body.message).toMatch(/Stock insuficiente/i);
  });

  it('should create a sale with client data and support AFIP requirements', async () => {
    const saleData = {
      items: [{ product: productId, name: 'Test Product', quantity: 1, price: 1000, ivaRate: 21 }],
      paymentMethod: 'efectivo',
      invoiceType: 'A',
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
    expect(res.body.invoiceNumber).toBeDefined();
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
    expect(res.header['content-type']).toMatch(/application\/pdf/);
    expect((res.body as Buffer).length).toBeGreaterThan(0);
  });

  it('should apply fixed discount and persist discount data', async () => {
    const saleData = {
      items: [
        {
          product: productId,
          name: 'Test Product',
          quantity: 2,
          price: 1000,
          ivaRate: 21,
        },
      ],
      paymentMethod: 'efectivo',
      invoiceType: 'B',
      discount: {
        type: 'FIXED',
        value: 200,
      },
    };

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(saleData);

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(1800);
    expect(res.body.discountType).toBe('FIXED');
    expect(res.body.discountAmount).toBe(200);
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
