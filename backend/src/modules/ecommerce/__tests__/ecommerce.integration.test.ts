import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../../app';
import Product from '../../inventory/models/Product';
import Branch from '../../branches/models/Branch';
import { User } from '../../auth/models/User';

describe('Ecommerce Catalog Integration Tests', () => {
  beforeEach(async () => {
    await Branch.create({
      name: 'Sucursal Catalogo',
      address: 'Av. Test 100',
      city: 'Córdoba',
      province: 'Córdoba',
      postalCode: '5000',
      isActive: true,
      isMain: true,
    });

    await Product.create([
      {
        name: 'Producto Visible',
        sku: 'VIS-001',
        slug: 'producto-visible',
        price: 1000,
        costPrice: 500,
        stock: 5,
        category: 'General',
        isActive: true,
        paused: false,
      },
      {
        name: 'Producto Pausado',
        sku: 'PAU-001',
        slug: 'producto-pausado',
        price: 2000,
        costPrice: 800,
        stock: 3,
        category: 'General',
        isActive: true,
        paused: true,
      },
      {
        name: 'Producto Inactivo',
        sku: 'INA-001',
        slug: 'producto-inactivo',
        price: 3000,
        costPrice: 1000,
        stock: 1,
        category: 'General',
        isActive: false,
        paused: false,
      },
    ]);
  });

  it('should list only active non-paused products in public catalog', async () => {
    const res = await request(app).get('/api/ecommerce/catalog');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe('Producto Visible');
  });

  it('should return categories from visible catalog products only', async () => {
    const res = await request(app).get('/api/ecommerce/catalog/categories');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(['General']);
  });

  it('should fetch product by slug and by id', async () => {
    const product = await Product.findOne({ sku: 'VIS-001' });

    const bySlug = await request(app).get('/api/ecommerce/catalog/producto-visible');
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.name).toBe('Producto Visible');

    const byId = await request(app).get(`/api/ecommerce/catalog/${product!._id}`);
    expect(byId.status).toBe(200);
    expect(byId.body.sku).toBe('VIS-001');
  });

  it('should not expose paused products in catalog detail', async () => {
    const res = await request(app).get('/api/ecommerce/catalog/producto-pausado');
    expect(res.status).toBe(404);
  });
});

describe('AFIP Taxpayer Lookup Integration Tests', () => {
  it('should always return 200 with wrapped response shape for authenticated staff', async () => {
    const branch = await Branch.create({
      name: 'Sucursal AFIP',
      address: 'Test 1',
      isActive: true,
      isMain: true,
    });

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    await User.create({
      name: 'Admin AFIP',
      email: 'afip_test@test.com',
      password: hashedPassword,
      roles: ['admin'],
      branch: branch._id,
      permissions: { 'sales:edit': true, 'sales:view': true },
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'afip_test@test.com', password: 'Password123!' });

    const res = await request(app)
      .get('/api/afip/taxpayer/20123456789')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok');
    expect(res.body).toHaveProperty('found');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('data');
  });
});
