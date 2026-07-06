const { resolveEntitlement, resolveOwnEntitlement, trialDaysRemaining } = require('../../lib/entitlement');
const { createMockPrisma } = require('../helpers/mockPrisma');

const future = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const past = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

describe('trialDaysRemaining', () => {
  test('0 when absent or in the past', () => {
    expect(trialDaysRemaining(null)).toBe(0);
    expect(trialDaysRemaining(past(1))).toBe(0);
  });
  test('rounds up whole days remaining', () => {
    expect(trialDaysRemaining(future(5))).toBeGreaterThanOrEqual(5);
    expect(trialDaysRemaining(future(5))).toBeLessThanOrEqual(6);
  });
});

describe('resolveOwnEntitlement', () => {
  test('premium → entitled premium tier', () => {
    expect(resolveOwnEntitlement({ subscriptionStatus: 'premium' })).toEqual(
      expect.objectContaining({ isEntitled: true, tier: 'premium', status: 'premium', isTrial: false })
    );
  });
  test('paid → entitled paid tier', () => {
    expect(resolveOwnEntitlement({ subscriptionStatus: 'paid' })).toEqual(
      expect.objectContaining({ isEntitled: true, tier: 'paid', isTrial: false })
    );
  });
  test('trial not expired → entitled trial tier', () => {
    const r = resolveOwnEntitlement({ subscriptionStatus: 'trial', trialEndsAt: future(3) });
    expect(r.isEntitled).toBe(true);
    expect(r.tier).toBe('trial');
    expect(r.isTrial).toBe(true);
    expect(r.trialDaysRemaining).toBeGreaterThan(0);
  });
  test('trial expired → not entitled', () => {
    expect(resolveOwnEntitlement({ subscriptionStatus: 'trial', trialEndsAt: past(1) })).toEqual(
      expect.objectContaining({ isEntitled: false, tier: null })
    );
  });
  test('expired with no trial → not entitled', () => {
    expect(resolveOwnEntitlement({ subscriptionStatus: 'expired' }).isEntitled).toBe(false);
  });
});

describe('resolveEntitlement (couple-aware)', () => {
  let prisma;
  beforeEach(() => {
    prisma = createMockPrisma();
  });

  test('self active — no partner query', async () => {
    const r = await resolveEntitlement(prisma, { id: 'u1', subscriptionStatus: 'premium' });
    expect(r).toEqual(expect.objectContaining({ isEntitled: true, source: 'self', coveredByPartner: false, tier: 'premium' }));
    expect(prisma.relationship.findFirst).not.toHaveBeenCalled();
  });

  test('self trial not expired — no partner query', async () => {
    const r = await resolveEntitlement(prisma, { id: 'u1', subscriptionStatus: 'trial', trialEndsAt: future(4) });
    expect(r).toEqual(expect.objectContaining({ isEntitled: true, source: 'self', isTrial: true }));
    expect(prisma.relationship.findFirst).not.toHaveBeenCalled();
  });

  test('self expired + partner covered — entitled via partner', async () => {
    prisma.relationship.findFirst.mockResolvedValue({
      user1Id: 'u1',
      user2Id: 'p1',
      user1: { subscriptionStatus: 'expired', trialEndsAt: past(1) },
      user2: { subscriptionStatus: 'premium', trialEndsAt: null }
    });
    const r = await resolveEntitlement(prisma, { id: 'u1', subscriptionStatus: 'expired', trialEndsAt: past(1) });
    expect(r.isEntitled).toBe(true);
    expect(r.source).toBe('partner');
    expect(r.coveredByPartner).toBe(true);
    expect(r.tier).toBe('premium');
    expect(prisma.relationship.findFirst).toHaveBeenCalledTimes(1);
  });

  test('partner covered via their live trial', async () => {
    prisma.relationship.findFirst.mockResolvedValue({
      user1Id: 'me',
      user2Id: 'p1',
      user1: { subscriptionStatus: 'expired' },
      user2: { subscriptionStatus: 'trial', trialEndsAt: future(2) }
    });
    const r = await resolveEntitlement(prisma, { id: 'me', subscriptionStatus: 'expired' });
    expect(r.isEntitled).toBe(true);
    expect(r.source).toBe('partner');
    expect(r.tier).toBe('trial');
  });

  test('all expired (self + partner) — not entitled', async () => {
    prisma.relationship.findFirst.mockResolvedValue({
      user1Id: 'u1',
      user2Id: 'p1',
      user1: { subscriptionStatus: 'expired', trialEndsAt: past(1) },
      user2: { subscriptionStatus: 'expired', trialEndsAt: past(2) }
    });
    const r = await resolveEntitlement(prisma, { id: 'u1', subscriptionStatus: 'expired', trialEndsAt: past(1) });
    expect(r.isEntitled).toBe(false);
    expect(r.source).toBe('none');
    expect(r.coveredByPartner).toBe(false);
  });

  test('no relationship — not entitled, single query attempted', async () => {
    prisma.relationship.findFirst.mockResolvedValue(null);
    const r = await resolveEntitlement(prisma, { id: 'u1', subscriptionStatus: 'expired' });
    expect(r.isEntitled).toBe(false);
    expect(prisma.relationship.findFirst).toHaveBeenCalledTimes(1);
  });

  test('does not recurse back into the partner\'s partner (one level only)', async () => {
    // The partner is expired; even if the partner had their own covering
    // relationship, we must NOT chase it. Only one findFirst is ever issued.
    prisma.relationship.findFirst.mockResolvedValue({
      user1Id: 'u1',
      user2Id: 'p1',
      user1: { subscriptionStatus: 'expired' },
      user2: { subscriptionStatus: 'expired' }
    });
    const r = await resolveEntitlement(prisma, { id: 'u1', subscriptionStatus: 'expired' });
    expect(r.isEntitled).toBe(false);
    expect(prisma.relationship.findFirst).toHaveBeenCalledTimes(1);
  });
});
