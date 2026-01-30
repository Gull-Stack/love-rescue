export function createAuthValue(overrides = {}) {
  return {
    user: { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', subscriptionStatus: 'trial' },
    relationship: { id: 'rel-1', hasPartner: false, inviteCode: 'TESTCODE', partner: null },
    loading: false,
    error: null,
    login: jest.fn().mockResolvedValue({ user: {}, token: 'test-token' }),
    signup: jest.fn().mockResolvedValue({ user: {}, token: 'test-token' }),
    logout: jest.fn(),
    invitePartner: jest.fn().mockResolvedValue({ inviteLink: 'http://localhost:3000/join/TESTCODE', inviteCode: 'TESTCODE' }),
    joinRelationship: jest.fn().mockResolvedValue({ message: 'Success' }),
    refreshUser: jest.fn(),
    ...overrides,
  };
}

export function createLoggedOutAuth() {
  return createAuthValue({ user: null, relationship: null });
}

export function createLoadingAuth() {
  return createAuthValue({ loading: true });
}

export function createPartnerAuth() {
  return createAuthValue({
    relationship: {
      id: 'rel-1',
      hasPartner: true,
      inviteCode: null,
      partner: { id: 'user-2', firstName: 'Partner', lastName: 'Name' },
    },
  });
}

export function createPremiumAuth() {
  return createAuthValue({
    user: { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', subscriptionStatus: 'premium' },
  });
}

export function createExpiredAuth() {
  return createAuthValue({
    user: { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', subscriptionStatus: 'expired' },
  });
}
