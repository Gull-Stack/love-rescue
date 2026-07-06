// Builders for the value returned by a mocked useAuth() — kept in sync with
// the CURRENT contexts/AuthContext.js provider value.

export function createAuthValue(overrides = {}) {
  return {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date().toISOString(),
    },
    relationship: { id: 'rel-1', hasPartner: false, inviteCode: 'TESTCODE', partner: null },
    loading: false,
    error: null,
    login: jest.fn().mockResolvedValue({ user: {}, token: 'test-token' }),
    signup: jest.fn().mockResolvedValue({ user: {}, token: 'test-token' }),
    googleLogin: jest.fn().mockResolvedValue({ user: {}, token: 'test-token' }),
    appleLogin: jest.fn().mockResolvedValue({ user: {}, token: 'test-token' }),
    logout: jest.fn(),
    changePassword: jest.fn().mockResolvedValue({}),
    invitePartner: jest.fn().mockResolvedValue({
      inviteLink: 'http://localhost:3000/join/TESTCODE',
      inviteCode: 'TESTCODE',
    }),
    joinRelationship: jest.fn().mockResolvedValue({ message: 'Success' }),
    refreshUser: jest.fn(),
    // Biometric surface
    biometricEnabled: false,
    checkBiometricAvailability: jest.fn().mockResolvedValue(false),
    checkBiometricStatus: jest.fn().mockResolvedValue(false),
    registerBiometric: jest.fn().mockResolvedValue(true),
    biometricLogin: jest.fn().mockResolvedValue({ user: {}, token: 'test-token' }),
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
