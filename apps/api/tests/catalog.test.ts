import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetStore, store } from '../src/store/inMemoryStore.js';

const app = createApp();

async function registerAndLogin(email: string, password = 'password123') {
  await request(app).post('/api/v1/auth/register').send({ email, password });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return login.body.data.accessToken as string;
}

async function makeAdmin(email: string) {
  await registerAndLogin(email);
  // promote in store
  const id = store.userEmailIndex.get(email.toLowerCase())!;
  const user = store.users.get(id)!;
  user.role = 'ADMIN';
  store.users.set(id, user);
  // re-login to get admin token
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return login.body.data.accessToken as string;
}

describe('Module 2 catalog', () => {
  beforeEach(() => {
    resetStore();
  });

  it('lists services (at least 8)', async () => {
    const res = await request(app).get('/api/v1/catalog/services');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(8);
  });

  it('filters services by category', async () => {
    const res = await request(app).get('/api/v1/catalog/services?category=ACRYLIC');
    expect(res.status).toBe(200);
    for (const s of res.body.data) {
      expect(s.category).toBe('ACRYLIC');
    }
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('lists effects (at least 6) and filters by type', async () => {
    const all = await request(app).get('/api/v1/catalog/effects');
    expect(all.status).toBe(200);
    expect(all.body.data.length).toBeGreaterThanOrEqual(6);
    const removals = await request(app).get('/api/v1/catalog/effects?type=REMOVAL');
    expect(removals.status).toBe(200);
    expect(removals.body.data.length).toBeGreaterThanOrEqual(1);
    for (const e of removals.body.data) expect(e.type).toBe('REMOVAL');
  });

  it('lists lengths (4)', async () => {
    const res = await request(app).get('/api/v1/catalog/lengths');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(4);
  });

  it('quotes correctly', async () => {
    const services = (await request(app).get('/api/v1/catalog/services')).body.data;
    const effects = (await request(app).get('/api/v1/catalog/effects')).body.data;
    const svc = services[0];
    const effectIds = [effects[0].id];
    const removalEffect = effects.find((e: { id: string; type: string; price: number }) => e.type === 'REMOVAL');
    const res = await request(app).post('/api/v1/catalog/quote').send({
      serviceId: svc.id,
      length: 'M',
      effectIds,
      includeRemoval: true,
    });
    expect(res.status).toBe(200);
    const q = res.body.data;
    const lengths = (await request(app).get('/api/v1/catalog/lengths')).body.data;
    const len = lengths.find((l: { code: string; priceModifier: number }) => l.code === 'M');
    const eff = effects.find((e: { id: string; price: number }) => e.id === effectIds[0]);
    const expectedBase = svc.basePrice;
    const expectedLength = len.priceModifier;
    const expectedEffects = eff.price;
    const expectedRemoval = removalEffect.price;
    expect(q.breakdown.base).toBe(expectedBase);
    expect(q.breakdown.length).toBe(expectedLength);
    expect(q.breakdown.effects).toBe(expectedEffects);
    expect(q.breakdown.removal).toBe(expectedRemoval);
    expect(q.priceTotal).toBe(expectedBase + expectedLength + expectedEffects + expectedRemoval);
    expect(q.durationMin).toBeGreaterThan(0);
  });

  it('quote validation error on unknown service', async () => {
    const res = await request(app).post('/api/v1/catalog/quote').send({
      serviceId: 'does-not-exist',
      length: 'S',
      effectIds: [],
      includeRemoval: false,
    });
    expect(res.status).toBe(404);
  });

  it('admin writes require auth and admin role', async () => {
    const clientToken = await registerAndLogin('client@test.com');
    const unauth = await request(app).post('/api/v1/catalog/services').send({
      name: 'X', category: 'NAIL_ART', basePrice: 1, baseDurationMin: 10,
    });
    expect(unauth.status).toBe(401);

    const forbidden = await request(app)
      .post('/api/v1/catalog/services')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ name: 'X', category: 'NAIL_ART', basePrice: 1, baseDurationMin: 10 });
    expect(forbidden.status).toBe(403);
  });

  it('admin can create and delete a service', async () => {
    const adminToken = await makeAdmin('admin@test.com');
    const create = await request(app)
      .post('/api/v1/catalog/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Temp Service', category: 'NAIL_ART', basePrice: 5, baseDurationMin: 20 });
    expect(create.status).toBe(201);
    const id = create.body.data.id;
    const del = await request(app)
      .delete(`/api/v1/catalog/services/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
    const get = await request(app).get('/api/v1/catalog/services');
    expect(get.body.data.find((s: { id: string }) => s.id === id)).toBeUndefined();
  });

  it('rejects unknown fields (strict)', async () => {
    const adminToken = await makeAdmin('admin2@test.com');
    const res = await request(app)
      .post('/api/v1/catalog/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X', category: 'NAIL_ART', basePrice: 1, baseDurationMin: 10, foo: 'bar' });
    expect(res.status).toBe(422);
  });
});