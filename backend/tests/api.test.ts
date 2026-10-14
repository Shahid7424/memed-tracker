import request from 'supertest';
import { Types } from 'mongoose';
import { createApp } from '../src/app';
import { signToken } from '../src/utils/jwt';
import { useTestDatabase } from './helpers/db';
import { LADDER } from './helpers/fixtures';

useTestDatabase();

const JWT_SECRET = 'test-secret-that-is-long-enough';
const app = createApp({
  NODE_ENV: 'test',
  JWT_SECRET,
  JWT_EXPIRES_IN: '1h',
  CORS_ORIGIN: 'http://localhost:3000',
});

const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

let emailCounter = 0;
async function signup(role: 'brand' | 'creator'): Promise<{ token: string; id: string }> {
  emailCounter += 1;
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: `${role} user`, email: `${role}${emailCounter}@Example.com`, password: 'secret123', role });
  expect(res.status).toBe(201);
  return { token: res.body.data.token, id: res.body.data.user.id };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function createCampaign(token: string, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/campaigns')
    .set(auth(token))
    .send({ name: 'Diwali drop', platform: 'youtube', totalBudget: 10_000, milestones: LADDER, ...overrides });
}

describe('auth', () => {
  it('signs up, logs in with a case-insensitive email and restores the session', async () => {
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Asha', email: 'Asha@Example.com', password: 'secret123', role: 'creator' });
    expect(signupRes.status).toBe(201);
    expect(signupRes.body.data.user).toEqual({
      id: expect.any(String),
      name: 'Asha',
      email: 'asha@example.com',
      role: 'creator',
    });
    expect(JSON.stringify(signupRes.body)).not.toContain('password');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ASHA@example.com', password: 'secret123' });
    expect(loginRes.status).toBe(200);

    const me = await request(app).get('/api/auth/me').set(auth(loginRes.body.data.token));
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('asha@example.com');
  });

  it('rejects a duplicate email', async () => {
    const body = { name: 'Asha', email: 'dup@example.com', password: 'secret123', role: 'brand' };
    await request(app).post('/api/auth/signup').send(body).expect(201);
    const res = await request(app).post('/api/auth/signup').send(body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('validates signup input and lists the invalid fields', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'A', email: 'not-an-email', password: 'short', role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password', 'role']));
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    await signup('brand');
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: `brand${emailCounter}@example.com`, password: 'wrong1234' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'secret123' });
    expect(wrongPassword.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknown.body);
  });

  it('rejects missing, malformed, forged and expired tokens', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer nonsense')).status).toBe(401);

    const forged = signToken(
      { id: new Types.ObjectId().toString(), role: 'brand' },
      { secret: 'some-other-secret-value', expiresIn: '1h' },
    );
    expect((await request(app).get('/api/auth/me').set(auth(forged))).status).toBe(401);

    const expired = signToken(
      { id: new Types.ObjectId().toString(), role: 'brand' },
      { secret: JWT_SECRET, expiresIn: '-1s' },
    );
    const res = await request(app).get('/api/auth/me').set(auth(expired));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects malformed JSON with a clean 400', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Request body is not valid JSON');
  });
});

describe('campaigns', () => {
  it('lets a brand create a campaign and sorts the milestone ladder', async () => {
    const brand = await signup('brand');
    const res = await createCampaign(brand.token, { milestones: [LADDER[2], LADDER[0], LADDER[1]] });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Diwali drop',
      platform: 'youtube',
      totalBudget: 10_000,
      spentAmount: 0,
      remainingBudget: 10_000,
      utilizationPercent: 0,
      status: 'live',
      milestones: LADDER,
      brand: { id: brand.id },
    });
  });

  it('ignores client-supplied spent amount, status and owner', async () => {
    const brand = await signup('brand');
    const res = await createCampaign(brand.token, {
      spentAmount: 9_000,
      status: 'exhausted',
      brand: new Types.ObjectId().toString(),
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ spentAmount: 0, status: 'live', brand: { id: brand.id } });
  });

  it('rejects invalid campaigns', async () => {
    const brand = await signup('brand');
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ totalBudget: 100 }, 'at least the first milestone payout'],
      [{ totalBudget: 1000.5 }, 'whole number'],
      [{ platform: 'tiktok' }, 'Platform must be'],
      [{ milestones: [] }, 'at least one milestone'],
      [
        {
          milestones: [
            { views: 100, payout: 500 },
            { views: 100, payout: 900 },
          ],
        },
        'same threshold',
      ],
      [
        {
          milestones: [
            { views: 100, payout: 900 },
            { views: 200, payout: 500 },
          ],
        },
        'must pay more',
      ],
    ];
    for (const [overrides, message] of cases) {
      const res = await createCampaign(brand.token, overrides);
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain(message);
    }
  });

  it('does not let creators create campaigns', async () => {
    const creator = await signup('creator');
    const res = await createCampaign(creator.token);
    expect(res.status).toBe(403);
  });

  it('lists live campaigns with pagination and platform filter', async () => {
    const brand = await signup('brand');
    await createCampaign(brand.token, { name: 'YT one' });
    await createCampaign(brand.token, { name: 'IG one', platform: 'instagram' });

    const res = await request(app).get('/api/campaigns?platform=instagram&limit=5').set(auth(brand.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ page: 1, limit: 5, total: 1, totalPages: 1 });
    expect(res.body.data.items[0]).toMatchObject({ name: 'IG one', brand: { name: 'brand user' } });

    const bad = await request(app).get('/api/campaigns?limit=500').set(auth(brand.token));
    expect(bad.status).toBe(400);
  });

  it('returns 400 for an invalid id and 404 for an unknown one', async () => {
    const brand = await signup('brand');
    expect((await request(app).get('/api/campaigns/not-an-id').set(auth(brand.token))).status).toBe(400);
    expect((await request(app).get(`/api/campaigns/${new Types.ObjectId()}`).set(auth(brand.token))).status).toBe(404);
  });

  it('shows a brand only its own campaigns and submissions', async () => {
    const owner = await signup('brand');
    const other = await signup('brand');
    const campaign = (await createCampaign(owner.token)).body.data;

    const mine = await request(app).get('/api/campaigns/mine').set(auth(other.token));
    expect(mine.body.data.campaigns).toHaveLength(0);

    const res = await request(app).get(`/api/campaigns/${campaign.id}/submissions`).set(auth(other.token));
    expect(res.status).toBe(403);
  });
});

describe('submissions and payouts end to end', () => {
  it('runs the full brand -> creator -> views -> earnings flow', async () => {
    const brand = await signup('brand');
    const creator = await signup('creator');
    const campaign = (await createCampaign(brand.token, { totalBudget: 6_000 })).body.data;

    const submitted = await request(app)
      .post('/api/submissions')
      .set(auth(creator.token))
      .send({ campaignId: campaign.id, postUrl: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(submitted.status).toBe(201);
    expect(submitted.body.data).toMatchObject({ postUrl: VIDEO, views: 0, paidAmount: 0, payoutStatus: 'pending' });

    const views = await request(app)
      .patch(`/api/submissions/${submitted.body.data.id}/views`)
      .set(auth(brand.token))
      .send({ views: 60_000 });
    expect(views.status).toBe(200);
    expect(views.body.data.payout).toMatchObject({ action: 'paid', amountPaid: 2_000 });

    const earnings = await request(app).get('/api/submissions/mine').set(auth(creator.token));
    expect(earnings.body.data.summary).toEqual({ totalEarned: 2_000, submissionCount: 1, blockedAmount: 0 });
    expect(earnings.body.data.submissions[0].campaign).toMatchObject({ id: campaign.id, name: 'Diwali drop' });

    const dashboard = await request(app).get('/api/campaigns/mine').set(auth(brand.token));
    expect(dashboard.body.data.summary).toMatchObject({
      totalBudget: 6_000,
      totalSpent: 2_000,
      totalRemaining: 4_000,
      totalSubmissions: 1,
    });
    expect(dashboard.body.data.campaigns[0]).toMatchObject({ submissionCount: 1, utilizationPercent: 33 });

    const list = await request(app).get(`/api/campaigns/${campaign.id}/submissions`).set(auth(brand.token));
    expect(list.body.data[0]).toMatchObject({ views: 60_000, paidAmount: 2_000, creator: { name: 'creator user' } });
  });

  it('rejects duplicate posts, including the same video in a different URL format', async () => {
    const brand = await signup('brand');
    const a = await signup('creator');
    const b = await signup('creator');
    const campaign = (await createCampaign(brand.token)).body.data;

    await request(app)
      .post('/api/submissions')
      .set(auth(a.token))
      .send({ campaignId: campaign.id, postUrl: VIDEO })
      .expect(201);
    const dup = await request(app)
      .post('/api/submissions')
      .set(auth(b.token))
      .send({ campaignId: campaign.id, postUrl: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_SUBMISSION');
  });

  it('rejects links for the wrong platform and brands submitting posts', async () => {
    const brand = await signup('brand');
    const creator = await signup('creator');
    const campaign = (await createCampaign(brand.token)).body.data;

    const wrongPlatform = await request(app)
      .post('/api/submissions')
      .set(auth(creator.token))
      .send({ campaignId: campaign.id, postUrl: 'https://www.instagram.com/p/C1a2B3c4D5e/' });
    expect(wrongPlatform.status).toBe(400);
    expect(wrongPlatform.body.error.code).toBe('INVALID_POST_URL');

    const asBrand = await request(app)
      .post('/api/submissions')
      .set(auth(brand.token))
      .send({ campaignId: campaign.id, postUrl: VIDEO });
    expect(asBrand.status).toBe(403);
  });

  it('does not accept posts for an exhausted campaign', async () => {
    const brand = await signup('brand');
    const creator = await signup('creator');
    const campaign = (await createCampaign(brand.token, { totalBudget: 500 })).body.data;
    const first = await request(app)
      .post('/api/submissions')
      .set(auth(creator.token))
      .send({ campaignId: campaign.id, postUrl: VIDEO });
    await request(app)
      .patch(`/api/submissions/${first.body.data.id}/views`)
      .set(auth(creator.token))
      .send({ views: 10_000 })
      .expect(200);

    const res = await request(app)
      .post('/api/submissions')
      .set(auth(creator.token))
      .send({ campaignId: campaign.id, postUrl: 'https://youtu.be/aaaaaaaaaaa' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CAMPAIGN_NOT_LIVE');

    const browse = await request(app).get('/api/campaigns').set(auth(creator.token));
    expect(browse.body.data.total).toBe(0);
  });

  it('validates the views endpoint', async () => {
    const creator = await signup('creator');
    const id = new Types.ObjectId().toString();
    expect((await request(app).patch(`/api/submissions/${id}/views`).send({ views: 10 })).status).toBe(401);
    expect(
      (await request(app).patch('/api/submissions/bad-id/views').set(auth(creator.token)).send({ views: 10 })).status,
    ).toBe(400);
    expect(
      (await request(app).patch(`/api/submissions/${id}/views`).set(auth(creator.token)).send({ views: -1 })).status,
    ).toBe(400);
    expect(
      (await request(app).patch(`/api/submissions/${id}/views`).set(auth(creator.token)).send({ views: '100' })).status,
    ).toBe(400);
    expect(
      (await request(app).patch(`/api/submissions/${id}/views`).set(auth(creator.token)).send({ views: 1.5 })).status,
    ).toBe(400);
    expect(
      (await request(app).patch(`/api/submissions/${id}/views`).set(auth(creator.token)).send({ views: 10 })).status,
    ).toBe(404);
  });

  it('does not let a brand list submissions as a creator', async () => {
    const brand = await signup('brand');
    expect((await request(app).get('/api/submissions/mine').set(auth(brand.token))).status).toBe(403);
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
