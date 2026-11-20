import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetStore } from '../src/store/inMemoryStore.js';

const app = createApp();

function extractCookie(res: request.Response): string {
  const cookies = res.headers['set-cookie'] as string[] | undefined;
  if (!cookies || cookies.length === 0) return '';
  return cookies[0].split(';')[0];
}

describe('Module 1 auth + profiles', () => {
  beforeEach(() => {
    resetStore();
  });

  it('register assigns CLIENT role by default', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'a@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('CLIENT');
  });

  it('register rejects role field (not allowed publicly)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'b@test.com',
      password: 'password123',
      role: 'ADMIN',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('login returns accessToken and refresh cookie', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'c@test.com', password: 'password123' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'c@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    const cookies = res.headers['set-cookie'] as string[];
    expect(cookies).toBeDefined();
    expect(cookies.join(';')).toContain('refresh_token');
    expect(cookies.join(';')).toContain('HttpOnly');
    expect(cookies.join(';')).toContain('Path=/api/v1/auth/refresh');
  });

  it('login with wrong password returns INVALID_CREDENTIALS', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'd@test.com', password: 'password123' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'd@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('/me requires token', async () => {
    const res = await request(app).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('/me returns profile with valid token', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'e@test.com', password: 'password123' });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'e@test.com', password: 'password123' });
    const token = login.body.data.accessToken;
    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('e@test.com');
  });

  it('refresh rotates token and revokes old', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'f@test.com', password: 'password123' });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'f@test.com', password: 'password123' });
    const oldCookie = extractCookie(login);
    const refresh1 = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);
    expect(refresh1.status).toBe(200);
    expect(refresh1.body.data.accessToken).toBeTruthy();
    const newCookie = extractCookie(refresh1);

    const reuseOld = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);
    expect(reuseOld.status).toBe(401);

    const refresh2 = await request(app).post('/api/v1/auth/refresh').set('Cookie', newCookie);
    expect(refresh2.status).toBe(200);
  });

  it('logout revokes refresh token', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'g@test.com', password: 'password123' });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'g@test.com', password: 'password123' });
    const cookie = extractCookie(login);
    const logout = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(200);
    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refresh.status).toBe(401);
  });

  it('tech-sheet returns 404 for another user', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'h1@test.com', password: 'password123' });
    await request(app).post('/api/v1/auth/register').send({ email: 'h2@test.com', password: 'password123' });
    const login1 = await request(app).post('/api/v1/auth/login').send({ email: 'h1@test.com', password: 'password123' });
    const login2 = await request(app).post('/api/v1/auth/login').send({ email: 'h2@test.com', password: 'password123' });
    const token1 = login1.body.data.accessToken;
    const user2Id = login2.body.data.user.id;

    const own = await request(app).get(`/api/v1/clients/${login1.body.data.user.id}/tech-sheet`).set('Authorization', `Bearer ${token1}`);
    expect(own.status).toBe(200);

    const other = await request(app).get(`/api/v1/clients/${user2Id}/tech-sheet`).set('Authorization', `Bearer ${token1}`);
    expect(other.status).toBe(404);
  });

  it('tech-sheet update and read', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'i@test.com', password: 'password123' });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'i@test.com', password: 'password123' });
    const token = login.body.data.accessToken;
    const userId = login.body.data.user.id;
    const put = await request(app)
      .put(`/api/v1/clients/${userId}/tech-sheet`)
      .set('Authorization', `Bearer ${token}`)
      .send({ allergies: 'latex', nailType: 'gel', preferredTones: ['red', 'pink'], photoUrl: 'https://example.com/x.png' });
    expect(put.status).toBe(200);
    const get = await request(app).get(`/api/v1/clients/${userId}/tech-sheet`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.data.allergies).toBe('latex');
    expect(get.body.data.preferredTones).toBe('red, pink');
  });
});