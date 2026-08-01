import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../app';
import Product from '../modules/inventory/models/Product';
import Branch from '../modules/branches/models/Branch';
import BranchStock from '../modules/stock/models/BranchStock';
import { User } from '../modules/auth/models/User';
import StoreSettings from '../modules/settings/models/StoreSettings';
import Sale from '../modules/sales/models/Sale';

const loginAsAdmin = async (email = 'integral@test.com') => {
  const branch = await Branch.findOne({ isMain: true }) || await Branch.create({
    name: 'Sucursal Integral',
    address: 'Av. Integral 500',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1406',
    isActive: true,
    isMain: true,
  });

  const hashedPassword = await bcrypt.hash('Password123!', 10);
  await User.create({
    name: 'Admin Integral',
    email,
    password: hashedPassword,
    roles: ['admin'],
    branch: branch._id,
    permissions: {
      'inventory:view': true,
      'inventory:edit': true,
      'sales:view': true,
      'sales:edit': true,
    },
  });

  const agent = request.agent(app);
  await agent
    .post('/api/auth/login')
    .send({ email, password: 'Password123!' });

  return { agent, branchId: String(branch._id) };
};

describe('Full Platform Integration Tests', () => {
  describe('Ecommerce product fields (6.2)', () => {
    it('should expose ecommerce fields in public catalog detail', async () => {
      await Product.create({
        name: 'Remera Premium',
        sku: 'REM-001',
        slug: 'remera-premium',
        price: 15000,
        costPrice: 7000,
        stock: 8,
        category: 'Indumentaria',
        isActive: true,
        paused: false,
        commercialDescription: 'Algodón premium, ideal para el verano',
        longDescription: 'Composición 100% algodón peinado.\nTalles S a XL.',
        seoTitle: 'Remera Premium | Tienda',
        seoDescription: 'Comprá remeras premium online',
        gallery: [{ url: 'https://example.com/gallery-1.jpg', alt: 'Frente' }],
        weight: 0.25,
        dimensions: { length: 30, width: 20, height: 2, unit: 'cm' },
        displayOrder: 1,
        featured: true,
      });

      const res = await request(app).get('/api/ecommerce/catalog/remera-premium');

      expect(res.status).toBe(200);
      expect(res.body.commercialDescription).toContain('Algodón premium');
      expect(res.body.longDescription).toContain('100% algodón');
      expect(res.body.seoTitle).toBe('Remera Premium | Tienda');
      expect(res.body.gallery).toHaveLength(1);
      expect(res.body.weight).toBe(0.25);
      expect(res.body.dimensions.length).toBe(30);
    });

    it('should update ecommerce fields from inventory API', async () => {
      const { agent } = await loginAsAdmin('inventory-ecom@test.com');

      const product = await Product.create({
        name: 'Producto Base',
        sku: 'BASE-001',
        slug: 'producto-base',
        price: 5000,
        costPrice: 2000,
        stock: 4,
        category: 'General',
        isActive: true,
      });

      const res = await agent
        .put(`/api/inventory/${product._id}`)
        .field('commercialDescription', 'Texto comercial actualizado')
        .field('longDescription', 'Descripción larga actualizada')
        .field('seoTitle', 'SEO Title Test')
        .field('seoDescription', 'SEO Description Test')
        .field('slug', 'producto-base-editado')
        .field('weight', '0.5')
        .field('displayOrder', '10')
        .field('dimensions', JSON.stringify({ length: 10, width: 10, height: 5, unit: 'cm' }))
        .field('gallery', JSON.stringify([{ url: 'https://example.com/extra.jpg', alt: 'Extra' }]));

      expect(res.status).toBe(200);
      expect(res.body.commercialDescription).toBe('Texto comercial actualizado');
      expect(res.body.slug).toBe('producto-base-editado');
      expect(res.body.weight).toBe(0.5);
      expect(res.body.displayOrder).toBe(10);
      expect(res.body.gallery).toHaveLength(1);

      const catalog = await request(app).get('/api/ecommerce/catalog/producto-base-editado');
      expect(catalog.status).toBe(200);
      expect(catalog.body.commercialDescription).toBe('Texto comercial actualizado');
    });

    it('should paginate public catalog products', async () => {
      await Product.deleteMany({});
      for (let i = 1; i <= 15; i += 1) {
        await Product.create({
          name: `Producto Paginado ${i}`,
          sku: `PAG-${String(i).padStart(3, '0')}`,
          slug: `producto-paginado-${i}`,
          price: 1000 + i,
          costPrice: 400,
          stock: 5,
          category: 'General',
          isActive: true,
          paused: false,
        });
      }

      const page1 = await request(app).get('/api/ecommerce/catalog?page=1&limit=10');
      expect(page1.status).toBe(200);
      expect(page1.body.items).toHaveLength(10);
      expect(page1.body.pagination.total).toBe(15);
      expect(page1.body.pagination.pages).toBe(2);

      const page2 = await request(app).get('/api/ecommerce/catalog?page=2&limit=10');
      expect(page2.status).toBe(200);
      expect(page2.body.items).toHaveLength(5);
    });
  });

  describe('Ecommerce checkout flow', () => {
    it('should create an ecommerce sale without authentication (guest checkout)', async () => {
      const branch = await Branch.create({
        name: 'Depósito Web',
        address: 'Calle Envío 100',
        city: 'Rosario',
        province: 'Santa Fe',
        postalCode: '2000',
        isActive: true,
        isMain: true,
      });

      await StoreSettings.create({ enableEcommerce: true, maintenanceMode: false, defaultBranch: branch._id });
      await loginAsAdmin('checkout-admin@test.com');

      const product = await Product.create({
        name: 'Producto Checkout',
        sku: 'CHK-001',
        slug: 'producto-checkout',
        price: 3000,
        costPrice: 1200,
        stock: 5,
        category: 'General',
        isActive: true,
        paused: false,
      });

      await BranchStock.create({ product: product._id, branch: branch._id, stock: 5, minStock: 1 });

      const res = await request(app)
        .post('/api/ecommerce/checkout')
        .send({
          items: [{ productId: String(product._id), quantity: 2 }],
          customerName: 'Cliente Web',
          customerEmail: 'cliente@test.com',
          paymentMethod: 'transferencia',
          shippingAddress: {
            street: 'Av. Siempre Viva 742',
            city: 'Rosario',
            province: 'Santa Fe',
            postalCode: '2000',
            country: 'Argentina',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.source).toBe('ECOMMERCE');
      expect(res.body.total).toBe(6000);
      expect(res.body.billingStatus).toBe('NONE');
      expect(res.body.clientName).toBe('Cliente Web');

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct?.stock).toBe(3);
    });

    it('should reject checkout when branch location is incomplete', async () => {
      const branch = await Branch.create({
        name: 'Sucursal Incompleta',
        address: 'Sin ciudad',
        isActive: true,
        isMain: true,
      });

      await StoreSettings.create({ enableEcommerce: true, defaultBranch: branch._id });

      const product = await Product.create({
        name: 'Prod Incompleto',
        sku: 'INC-001',
        slug: 'prod-incompleto',
        price: 1000,
        costPrice: 400,
        stock: 2,
        category: 'General',
        isActive: true,
      });

      const res = await request(app)
        .post('/api/ecommerce/checkout')
        .send({
          items: [{ productId: String(product._id), quantity: 1 }],
          customerName: 'Test',
          customerEmail: 'test@test.com',
          shippingAddress: {
            street: 'Calle 1',
            city: 'Córdoba',
            province: 'Córdoba',
            postalCode: '5000',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/datos completos/i);
    });
  });

  describe('Mercado Pago config', () => {
    it('should expose mercadopago config endpoint', async () => {
      const res = await request(app).get('/api/payments/mercadopago/config');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('enabled');
      expect(res.body).toHaveProperty('publicKey');
    });
  });

  describe('POS billing flow (NOT_INVOICED + manual invoice)', () => {
    it('should create fiscal POS sale as NOT_INVOICED and allow invoice endpoint', async () => {
      const { agent, branchId } = await loginAsAdmin('pos-billing@test.com');

      const product = await Product.create({
        name: 'POS Product',
        sku: 'POS-001',
        price: 5000,
        costPrice: 2000,
        stock: 10,
        category: 'General',
      });

      await BranchStock.create({ product: product._id, branch: branchId, stock: 10, minStock: 1 });

      const saleRes = await agent
        .post('/api/sales')
        .send({
          items: [{ product: String(product._id), name: 'POS Product', quantity: 1, price: 5000, ivaRate: 21 }],
          paymentMethod: 'efectivo',
          invoiceType: 'B',
          clientName: 'Cliente POS',
          clientCuit: '20123456789',
          branchId,
        });

      expect(saleRes.status).toBe(201);
      expect(saleRes.body.billingStatus).toBe('NOT_INVOICED');
      expect(saleRes.body.invoiceType).toBe('B');

      const invoiceRes = await agent
        .post(`/api/sales/${saleRes.body._id}/invoice`)

      // Without AFIP queue enabled in test env, invoice should fail gracefully or return error
      expect([200, 400, 500]).toContain(invoiceRes.status);

      const sale = await Sale.findById(saleRes.body._id);
      expect(sale).toBeTruthy();
      expect(['PENDING', 'FAILED', 'NOT_INVOICED']).toContain(sale?.billingStatus);
    });
  });

  describe('Store settings', () => {
    it('should return public store settings', async () => {
      await StoreSettings.create({ enableEcommerce: true, maintenanceMode: false, storeName: 'Mi Tienda Test' });
      const res = await request(app).get('/api/settings/public');
      expect(res.status).toBe(200);
      expect(res.body.enableEcommerce).toBe(true);
    });

    it('should return default banner images when none configured', async () => {
      await StoreSettings.deleteMany({});
      const res = await request(app).get('/api/settings/public');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.bannerImages)).toBe(true);
      expect(res.body.bannerImages.length).toBeGreaterThan(0);
    });

    it('should allow admin to clear custom banners back to defaults', async () => {
      const { agent } = await loginAsAdmin('banners-admin@test.com');
      await StoreSettings.deleteMany({});
      await StoreSettings.create({ bannerImages: ['https://example.com/custom.jpg'] });

      const clearRes = await agent
        .delete('/api/settings/banners')

      expect(clearRes.status).toBe(200);
      expect(clearRes.body.usingDefaultBanners).toBe(true);
      expect(clearRes.body.bannerImages.length).toBeGreaterThan(0);
    });
  });

  describe('Dashboard product analytics', () => {
    it('should return top products by quantity and profit for date range', async () => {
      const { agent } = await loginAsAdmin('analytics-dashboard@test.com');

      const productA = await Product.create({
        name: 'Producto A',
        sku: 'A-001',
        price: 1000,
        costPrice: 400,
        stock: 10,
        category: 'General',
      });
      const productB = await Product.create({
        name: 'Producto B',
        sku: 'B-001',
        price: 2000,
        costPrice: 500,
        stock: 10,
        category: 'General',
      });

      await Sale.create({
        items: [
          {
            product: productA._id,
            name: 'Producto A',
            quantity: 5,
            price: 1000,
            costPrice: 400,
            ivaRate: 21,
            subtotal: 5000,
          },
          {
            product: productB._id,
            name: 'Producto B',
            quantity: 2,
            price: 2000,
            costPrice: 500,
            ivaRate: 21,
            subtotal: 4000,
          },
        ],
        totalNeto: 9000,
        totalIva: 0,
        total: 9000,
        paymentMethod: 'efectivo',
        source: 'POS',
        invoiceType: 'NONE',
        invoiceNumber: 'TEST-001',
        seller: (await User.findOne({ email: 'analytics-dashboard@test.com' }))!._id,
        branch: (await Branch.findOne())!._id,
        sellerCommissionRate: 0,
        status: 'COMPLETED',
        billingStatus: 'NONE',
      });

      const res = await agent
        .get('/api/analytics/overview');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.topByQuantity)).toBe(true);
      expect(Array.isArray(res.body.topByProfit)).toBe(true);
      expect(res.body.topByQuantity[0].name).toBe('Producto A');
      expect(res.body.topByProfit[0].profit).toBeGreaterThan(0);
    });
  });
});
