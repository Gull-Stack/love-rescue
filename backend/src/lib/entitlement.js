/**
 * Couple-aware entitlement resolver.
 *
 * A user is entitled if ANY of the following holds:
 *   1. Their OWN subscriptionStatus is active ('paid' | 'premium'), OR
 *   2. Their OWN trialEndsAt is still in the future, OR
 *   3. The partner in their active Relationship is itself entitled (by rule 1
 *      or 2 — the partner's OWN status/trial only). One paid seat covers the
 *      couple.
 *
 * The partner lookup is a SINGLE extra query and is only performed when the
 * user is NOT already entitled on their own — so the common (self-entitled)
 * path costs nothing extra. Recursion is bounded to exactly one level: we
 * resolve the partner's OWN status/trial and never look up the partner's
 * partner, so there is no way to loop back.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days remaining until a trial end date (0 if past/absent).
 */
function trialDaysRemaining(trialEndsAt) {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  if (!(ms > 0)) return 0;
  return Math.ceil(ms / DAY_MS);
}

/**
 * Resolve a user's OWN entitlement — no partner lookup, no DB access. Pure
 * function of the user's subscriptionStatus + trialEndsAt.
 *
 * @returns {{ isEntitled: boolean, status: string, tier: (string|null),
 *   isTrial: boolean, trialDaysRemaining: number }}
 */
function resolveOwnEntitlement(user) {
  const status = user?.subscriptionStatus;

  // Apple entitlements expire. A subscription granted from a validated App
  // Store receipt is only good until the receipt's expiry — there is no
  // renewal webhook flipping subscriptionStatus back, so a lapsed
  // appleExpiresAt means NOT entitled regardless of the stored status.
  // App Store Server Notifications are the proper long-term mechanism to
  // track renewals/expirations in real time (future work); until then the
  // stored expiry is authoritative.
  if (
    user?.subscriptionSource === 'APPLE' &&
    user?.appleExpiresAt &&
    new Date(user.appleExpiresAt).getTime() <= Date.now()
  ) {
    return {
      isEntitled: false,
      status: 'expired',
      tier: null,
      isTrial: false,
      trialDaysRemaining: 0
    };
  }

  if (status === 'paid' || status === 'premium') {
    return {
      isEntitled: true,
      status,
      tier: status === 'premium' ? 'premium' : 'paid',
      isTrial: false,
      trialDaysRemaining: 0
    };
  }

  const remaining = trialDaysRemaining(user?.trialEndsAt);
  if (remaining > 0) {
    return {
      isEntitled: true,
      status: 'trial',
      tier: 'trial',
      isTrial: true,
      trialDaysRemaining: remaining
    };
  }

  return {
    isEntitled: false,
    // A lapsed trial must not leak status 'trial' — the UI would render
    // "free trial — 0 days remaining" chips for a user who is not entitled.
    status: !status || status === 'trial' ? 'expired' : status,
    tier: null,
    isTrial: false,
    trialDaysRemaining: 0
  };
}

/**
 * Fetch the partner (the other member of the user's active relationship), with
 * only the fields needed to resolve their OWN entitlement. Returns null when
 * there is no active relationship or it is a solo relationship. A single query.
 */
async function findEntitlingPartner(prisma, userId) {
  // Defensive: some minimal test harnesses inject a prisma with only `user`.
  if (!prisma || !prisma.relationship || typeof prisma.relationship.findFirst !== 'function') {
    return null;
  }

  const rel = await prisma.relationship.findFirst({
    where: {
      status: 'active',
      OR: [{ user1Id: userId }, { user2Id: userId }]
    },
    select: {
      user1Id: true,
      user2Id: true,
      user1: { select: { subscriptionStatus: true, trialEndsAt: true, subscriptionSource: true, appleExpiresAt: true } },
      user2: { select: { subscriptionStatus: true, trialEndsAt: true, subscriptionSource: true, appleExpiresAt: true } }
    }
  });

  if (!rel) return null;
  return rel.user1Id === userId ? rel.user2 : rel.user1;
}

/**
 * Couple-aware entitlement resolution.
 *
 * @param {object} prisma - Prisma client (or a mock exposing `relationship`).
 * @param {object} user   - The user; must carry `id`, `subscriptionStatus`,
 *                          and (ideally) `trialEndsAt`.
 * @returns {Promise<{ isEntitled: boolean, status: string, tier: (string|null),
 *   isTrial: boolean, trialDaysRemaining: number, coveredByPartner: boolean,
 *   source: ('self'|'partner'|'none') }>}
 */
async function resolveEntitlement(prisma, user) {
  const own = resolveOwnEntitlement(user);
  if (own.isEntitled) {
    return { ...own, coveredByPartner: false, source: 'self' };
  }

  // Not entitled on our own — try the couple. One-level lookup only.
  const partner = await findEntitlingPartner(prisma, user.id);
  if (partner) {
    const partnerOwn = resolveOwnEntitlement(partner);
    if (partnerOwn.isEntitled) {
      return {
        isEntitled: true,
        status: partnerOwn.status,
        tier: partnerOwn.tier,
        isTrial: partnerOwn.isTrial,
        trialDaysRemaining: partnerOwn.trialDaysRemaining,
        coveredByPartner: true,
        source: 'partner'
      };
    }
  }

  return { ...own, coveredByPartner: false, source: 'none' };
}

module.exports = {
  resolveEntitlement,
  resolveOwnEntitlement,
  trialDaysRemaining
};
