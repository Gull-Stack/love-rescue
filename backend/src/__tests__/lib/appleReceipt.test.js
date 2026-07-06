jest.mock('../../utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn()
}));

const { validateAppleReceipt, PRODUCTION_URL, SANDBOX_URL } = require('../../lib/appleReceipt');
const { applyAppleReceipt } = require('../../lib/appleEntitlement');

function appleResponse({ status = 0, expiresInMs = 30 * 24 * 60 * 60 * 1000, productId = 'com.loverescue.premium' } = {}) {
  const expiresMs = Date.now() + expiresInMs;
  return {
    status,
    environment: 'Production',
    latest_receipt: 'BASE64_LATEST',
    latest_receipt_info: status === 0 ? [{
      product_id: productId,
      expires_date_ms: String(expiresMs)
    }] : undefined
  };
}

function mockFetchOnce(jsonBody, ok = true, httpStatus = 200) {
  return jest.fn().mockResolvedValueOnce({
    ok,
    status: httpStatus,
    json: async () => jsonBody
  });
}

describe('validateAppleReceipt', () => {
  afterEach(() => { delete global.fetch; });

  test('valid active production receipt → valid entitlement', async () => {
    global.fetch = mockFetchOnce(appleResponse({ status: 0 }));
    const r = await validateAppleReceipt('RECEIPT');
    expect(global.fetch).toHaveBeenCalledWith(PRODUCTION_URL, expect.any(Object));
    expect(r.valid).toBe(true);
    expect(r.environment).toBe('production');
    expect(r.expiresAt instanceof Date).toBe(true);
    expect(r.productId).toBe('com.loverescue.premium');
  });

  test('status 21007 retries against sandbox and succeeds', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: 21007 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => appleResponse({ status: 0 }) });

    const r = await validateAppleReceipt('RECEIPT');
    expect(global.fetch).toHaveBeenNthCalledWith(1, PRODUCTION_URL, expect.any(Object));
    expect(global.fetch).toHaveBeenNthCalledWith(2, SANDBOX_URL, expect.any(Object));
    expect(r.valid).toBe(true);
    expect(r.environment).toBe('sandbox');
  });

  test('invalid receipt (status 21003) → not valid, no entitlement', async () => {
    global.fetch = mockFetchOnce({ status: 21003 });
    const r = await validateAppleReceipt('RECEIPT');
    expect(r.valid).toBe(false);
    expect(r.status).toBe(21003);
    expect(r.error).toMatch(/rejected/i);
  });

  test('expired subscription → not valid', async () => {
    global.fetch = mockFetchOnce(appleResponse({ status: 0, expiresInMs: -1000 }));
    const r = await validateAppleReceipt('RECEIPT');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/expired|active/i);
  });

  test('missing receipt → not valid, no network call', async () => {
    global.fetch = jest.fn();
    const r = await validateAppleReceipt('');
    expect(r.valid).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('network failure → not valid, safe error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom'));
    const r = await validateAppleReceipt('RECEIPT');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/Apple/i);
  });
});

describe('applyAppleReceipt', () => {
  let prisma;
  beforeEach(() => {
    prisma = { user: { update: jest.fn().mockResolvedValue({}) } };
  });
  afterEach(() => { delete global.fetch; });

  test('valid receipt → grants premium via APPLE and stores expiry', async () => {
    global.fetch = mockFetchOnce(appleResponse({ status: 0 }));
    const r = await applyAppleReceipt(prisma, 'user-1', 'RECEIPT');
    expect(r.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        subscriptionStatus: 'premium',
        subscriptionSource: 'APPLE'
      })
    }));
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.appleExpiresAt instanceof Date).toBe(true);
    expect(data.appleReceiptData).toBeTruthy();
  });

  test('invalid receipt → 402, NO entitlement write', async () => {
    global.fetch = mockFetchOnce({ status: 21003 });
    const r = await applyAppleReceipt(prisma, 'user-1', 'RECEIPT');
    expect(r.success).toBe(false);
    expect(r.status).toBe(402);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('missing receipt → 400, no write', async () => {
    const r = await applyAppleReceipt(prisma, 'user-1', undefined);
    expect(r.success).toBe(false);
    expect(r.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
