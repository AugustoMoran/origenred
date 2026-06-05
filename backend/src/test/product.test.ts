import mongoose from 'mongoose';
import Product from '../modules/inventory/models/Product';

describe('Product Model Test', () => {
  beforeAll(async () => {
    const url = process.env.MONGO_URI || 'mongodb://localhost:27017/test-db';
    await mongoose.connect(url);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create and save a product successfully', async () => {
    const productData = {
      name: 'Test Product',
      sku: 'TEST-SKU-001',
      price: 100,
      costPrice: 50,
      iva: 21,
      margin: 100,
      stock: 10
    };
    const validProduct = new Product(productData);
    const savedProduct = await validProduct.save();

    expect(savedProduct._id).toBeDefined();
    expect(savedProduct.name).toBe(productData.name);
    expect(savedProduct.sku).toBe(productData.sku);
  });

  it('should fail if required fields are missing', async () => {
    const productWithoutName = new Product({ sku: 'NO-NAME' });
    let err;
    try {
      await productWithoutName.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
  });
});