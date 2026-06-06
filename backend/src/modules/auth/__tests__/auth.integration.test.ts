import request from 'supertest';
import { app } from '../../../app';

describe('Auth Integration Tests', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
  };

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', testUser.email);
    expect(res.body).toHaveProperty('id');
  });

  it('should login and return access token and set refresh cookie', async () => {
    // register first (in-memory db is cleared before each test)
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send(testUser);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    const cookies = res.get('Set-Cookie');
    expect(cookies).toBeDefined();
    expect(cookies![0]).toMatch(/refreshToken=/);
  });

  it('should fail login with wrong credentials', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' });
    
    expect(res.status).toBe(401);
  });

  it('should login with mixed-case email input', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'Seller.Mixed@Example.COM', password: 'Password123!' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller.mixed@example.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should rotate refresh token', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send(testUser);
    
    const cookies = loginRes.get('Set-Cookie');
    expect(cookies).toBeDefined();
    const refreshToken = cookies![0].split(';')[0].split('=')[1];

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`]);
    
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('access');
    const refreshCookies = refreshRes.get('Set-Cookie');
    expect(refreshCookies).toBeDefined();
    expect(refreshCookies![0]).toMatch(/refreshToken=/);
  });

  it('should detect reuse and revoke tokens', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send(testUser);
    
    const cookies = loginRes.get('Set-Cookie');
    expect(cookies).toBeDefined();
    const rt1 = cookies![0].split(';')[0].split('=')[1];

    // use rt1 once
    const refreshRes1 = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${rt1}`]);
    
    expect(refreshRes1.status).toBe(200);

    // reuse rt1 - should fail and revoke
    const refreshRes2 = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${rt1}`]);
    
    expect(refreshRes2.status).toBe(401);
    expect(refreshRes2.body.message).toMatch(/reuse detected/);
  });

  it('should logout correctly', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const loginRes = await request(app).post('/api/auth/login').send(testUser);
    const cookies = loginRes.get('Set-Cookie');
    expect(cookies).toBeDefined();
    const rt = cookies![0].split(';')[0].split('=')[1];

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`refreshToken=${rt}`]);
    
    expect(logoutRes.status).toBe(200);
    const logoutCookies = logoutRes.get('Set-Cookie');
    expect(logoutCookies).toBeDefined();
    expect(logoutCookies![0]).toMatch(/refreshToken=;/);
  });
});
