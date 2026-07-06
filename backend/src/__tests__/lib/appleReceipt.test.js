jest.mock('../../utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn()
}));

const { validateAppleReceipt, PRODUCTION_URL, SANDBOX_URL } = require('../../lib/appleReceipt');
const { applyAppleReceipt } = require('../../lib/appleEntitlement');

function appleResponse({
  status = 0,
  expiresInMs = 30 * 24 * 60 * 60 * 1000,
  productId = 'com.loverescue.premium.monthly',
  originalTransactionId = 'orig-txn-1'
} = {}) {
  const expiresMs = Date.now() + expiresInMs;
  return {
    status,
    environment: 'Production',
    latest_receipt: 'BASE64_LATEST',
    latest_receipt_info: status === 0 ? [{
      product_id: productId,
      original_transaction_id: originalTransactionId,
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
    expect(r.productId).toBe('com.loverescue.premium.monthly');
    expect(r.originalTransactionId).toBe('orig-txn-1');
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

  test('rejects a valid receipt for a FOREIGN product (not in the allowlist)', async () => {
    global.fetch = mockFetchOnce(appleResponse({ status: 0, productId: 'com.other.app.subscription' }));
    const r = await validateAppleReceipt('RECEIPT');
    expect(r.valid).toBe(false);
    expect(r.expiresAt).toBeNull();
    expect(r.productId).toBeNull();
  });

  test('APPLE_PRODUCT_IDS env overrides the default allowlist', async () => {
    process.env.APPLE_PRODUCT_IDS = 'com.custom.product, com.custom.other';
    try {
      global.fetch = mockFetchOnce(appleResponse({ status: 0, productId: 'com.custom.product' }));
      const r = await validateAppleReceipt('RECEIPT');
      expect(r.valid).toBe(true);
      expect(r.productId).toBe('com.custom.product');

      // ...and the default products stop counting once overridden.
      global.fetch = mockFetchOnce(appleResponse({ status: 0, productId: 'com.loverescue.premium.monthly' }));
      const r2 = await validateAppleReceipt('RECEIPT');
      expect(r2.valid).toBe(false);
    } finally {
      delete process.env.APPLE_PRODUCT_IDS;
    }
  });

  test('picks the entitling entry among allowed products only', async () => {
    const farFuture = Date.now() + 60 * 24 * 60 * 60 * 1000;
    const nearFuture = Date.now() + 10 * 24 * 60 * 60 * 1000;
    global.fetch = mockFetchOnce({
      status: 0,
      latest_receipt: 'BASE64_LATEST',
      latest_receipt_info: [
        // Foreign product with the furthest expiry must NOT win
        { product_id: 'com.other.app', original_transaction_id: 'foreign-1', expires_date_ms: String(farFuture) },
        { product_id: 'com.loverescue.annual', original_transaction_id: 'orig-txn-9', expires_date_ms: String(nearFuture) }
      ]
    });
    const r = await validateAppleReceipt('RECEIPT');
    expect(r.valid).toBe(true);
    expect(r.productId).toBe('com.loverescue.annual');
    expect(r.originalTransactionId).toBe('orig-txn-9');
    expect(r.expiresAt.getTime()).toBe(nearFuture);
  });
});

describe('applyAppleReceipt', () => {
  let prisma;
  beforeEach(() => {
    prisma = {
      user: {
        update: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue(null) // default: receipt unclaimed
      }
    };
  });
  afterEach(() => { delete global.fetch; });

  test('valid receipt → grants premium via APPLE and stores expiry + original transaction id', async () => {
    global.fetch = mockFetchOnce(appleResponse({ status: 0 }));
    const r = await applyAppleReceipt(prisma, 'user-1', 'RECEIPT');
    expect(r.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        subscriptionStatus: 'premium',
        subscriptionSource: 'APPLE',
        appleOriginalTransactionId: 'orig-txn-1'
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

  test('receipt for a foreign product → 402, no write', async () => {
    global.fetch = mockFetchOnce(appleResponse({ status: 0, productId: 'com.someone.else' }));
    const r = await applyAppleReceipt(prisma, 'user-1', 'RECEIPT');
    expect(r.success).toBe(false);
    expect(r.status).toBe(402);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('REPLAY across accounts → 409 APPLE_RECEIPT_IN_USE, no entitlement write', async () => {
    global.fetch = mockFetchOnce(appleResponse({ status: 0 }));
    prisma.user.findFirst.mockResolvedValue({ id: 'other-user' }); // someone else holds it
    const r = await applyAppleReceipt(prisma, 'user-1', 'RECEIPT');
    expect(r.success).toBe(false);
    expect(r.status).toBe(409);
    expect(r.code).toBe('APPLE_RECEIPT_IN_USE');
    expect(prisma.user.update).not.toHaveBeenCalled();
    // The holder lookup explicitly excludes the requesting user
    expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        appleOriginalTransactionId: 'orig-txn-1',
        id: { not: 'user-1' }
      })
    }));
  });

  test('same user re-verifying / restoring their own receipt succeeds', async () => {
    global.fetch = mockFetchOnce(appleResponse({ status: 0 }));
    // findFirst excludes the requesting user, so their own claim yields null.
    prisma.user.findFirst.mockResolvedValue(null);
    const r = await applyAppleReceipt(prisma, 'user-1', 'RECEIPT');
    expect(r.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  test('concurrent claim (P2002 on update) → 409 APPLE_RECEIPT_IN_USE', async () => {
    global.fetch = mockFetchOnce(appleResponse({ status: 0 }));
    const uniqueErr = new Error('unique constraint');
    uniqueErr.code = 'P2002';
    prisma.user.update.mockRejectedValue(uniqueErr);
    const r = await applyAppleReceipt(prisma, 'user-1', 'RECEIPT');
    expect(r.success).toBe(false);
    expect(r.status).toBe(409);
    expect(r.code).toBe('APPLE_RECEIPT_IN_USE');
  });
});
