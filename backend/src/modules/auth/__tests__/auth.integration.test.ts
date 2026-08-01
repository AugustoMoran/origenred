import request from 'supertest';
import { app } from '../../../app';

describe('Auth Integration Tests', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
  };

  const getCookieValue = (cookies: string[] | undefined, name: string) => {
    const match = (cookies || []).find((cookie) => cookie.startsWith(`${name}=`));
    if (!match) return null;
    return match.split(';')[0].split('=').slice(1).join('=');
  };

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', testUser.email);
    expect(res.body).toHaveProperty('id');
  });

  it('should login and set httpOnly auth cookies', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send(testUser);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email', testUser.email);
    expect(res.body).not.toHaveProperty('token');

    const cookies = res.get('Set-Cookie');
    expect(cookies).toBeDefined();
    expect(getCookieValue(cookies, 'accessToken')).toBeTruthy();
    expect(getCookieValue(cookies, 'refreshToken')).toBeTruthy();
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
    expect(res.body).toHaveProperty('user');
  });

  it('should rotate refresh token and renew access cookie', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send(testUser);
    
    const cookies = loginRes.get('Set-Cookie');
    expect(cookies).toBeDefined();
    const refreshToken = getCookieValue(cookies, 'refreshToken');
    const accessToken = getCookieValue(cookies, 'accessToken');

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`, `accessToken=${accessToken}`]);
    
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('user');
    expect(refreshRes.body).not.toHaveProperty('access');

    const refreshCookies = refreshRes.get('Set-Cookie');
    expect(refreshCookies).toBeDefined();
    expect(getCookieValue(refreshCookies, 'refreshToken')).toBeTruthy();
    expect(getCookieValue(refreshCookies, 'accessToken')).toBeTruthy();
  });

  it('should detect reuse and revoke tokens', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send(testUser);
    
    const cookies = loginRes.get('Set-Cookie');
    expect(cookies).toBeDefined();
    const rt1 = getCookieValue(cookies, 'refreshToken');
    const at1 = getCookieValue(cookies, 'accessToken');

    const refreshRes1 = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${rt1}`, `accessToken=${at1}`]);
    
    expect(refreshRes1.status).toBe(200);

    const refreshRes2 = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${rt1}`, `accessToken=${at1}`]);
    
    expect(refreshRes2.status).toBe(401);
    expect(refreshRes2.body.message).toMatch(/reuse detected/);
  });

  it('should logout correctly and clear cookies', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const loginRes = await request(app).post('/api/auth/login').send(testUser);
    const cookies = loginRes.get('Set-Cookie');
    expect(cookies).toBeDefined();
    const rt = getCookieValue(cookies, 'refreshToken');
    const at = getCookieValue(cookies, 'accessToken');

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`refreshToken=${rt}`, `accessToken=${at}`]);
    
    expect(logoutRes.status).toBe(200);
    const logoutCookies = logoutRes.get('Set-Cookie');
    expect(logoutCookies).toBeDefined();
    expect(logoutCookies!.some((cookie) => cookie.startsWith('refreshToken=;'))).toBe(true);
    expect(logoutCookies!.some((cookie) => cookie.startsWith('accessToken=;'))).toBe(true);
  });

  it('should return current user from /me using access cookie', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const loginRes = await request(app).post('/api/auth/login').send(testUser);
    const cookies = loginRes.get('Set-Cookie');
    const at = getCookieValue(cookies, 'accessToken');

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`accessToken=${at}`]);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toHaveProperty('email', testUser.email);
  });
});
