import request from 'supertest';
import { app } from '../../../app';

describe('Marketplace public API', () => {
  it('GET /api/marketplace/home returns marketplace home payload', async () => {
    const res = await request(app).get('/api/marketplace/home');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('featured');
    expect(res.body).toHaveProperty('newest');
    expect(res.body).toHaveProperty('categories');
    expect(Array.isArray(res.body.featured)).toBe(true);
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  it('GET /api/marketplace/categories returns category list', async () => {
    const res = await request(app).get('/api/marketplace/categories');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/marketplace/integrations returns feature flags', async () => {
    const res = await request(app).get('/api/marketplace/integrations');

    expect(res.status).toBe(200);
    expect(res.body.mercadoPago).toHaveProperty('enabled');
    expect(res.body.meilisearch).toHaveProperty('enabled');
  });
});
