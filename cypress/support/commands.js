// ***********************************************
// Custom Cypress Commands for Marriage Rescue App
// ***********************************************

// Login command - sets token in localStorage and mocks the /auth/me endpoint
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password123') => {
  cy.intercept('POST', '**/api/auth/login', {
    statusCode: 200,
    body: {
      user: {
        id: 'user-1',
        email,
        firstName: 'Test',
        lastName: 'User',
        subscriptionStatus: 'trial',
      },
      token: 'fake-jwt-token',
    },
  }).as('login');

  cy.intercept('GET', '**/api/auth/me', {
    statusCode: 200,
    body: {
      user: {
        id: 'user-1',
        email,
        firstName: 'Test',
        lastName: 'User',
        subscriptionStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      },
      relationship: {
        id: 'rel-1',
        hasPartner: false,
        inviteCode: 'TESTCODE',
        partner: null,
      },
    },
  }).as('getMe');

  window.localStorage.setItem('token', 'fake-jwt-token');
});

// Login with partner - same as login but relationship.hasPartner is true
Cypress.Commands.add('loginWithPartner', (email = 'test@example.com', password = 'password123') => {
  cy.intercept('POST', '**/api/auth/login', {
    statusCode: 200,
    body: {
      user: {
        id: 'user-1',
        email,
        firstName: 'Test',
        lastName: 'User',
        subscriptionStatus: 'trial',
      },
      token: 'fake-jwt-token',
    },
  }).as('login');

  cy.intercept('GET', '**/api/auth/me', {
    statusCode: 200,
    body: {
      user: {
        id: 'user-1',
        email,
        firstName: 'Test',
        lastName: 'User',
        subscriptionStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      },
      relationship: {
        id: 'rel-1',
        hasPartner: true,
        inviteCode: 'TESTCODE',
        partner: {
          id: 'user-2',
          firstName: 'Partner',
          lastName: 'User',
          email: 'partner@example.com',
        },
      },
    },
  }).as('getMe');

  window.localStorage.setItem('token', 'fake-jwt-token');
});

// Setup common API mocks used across dashboard and other pages
Cypress.Commands.add('setupApiMocks', () => {
  cy.intercept('GET', '**/api/logs/prompt', {
    body: {
      prompt: { id: 1, title: 'Daily', prompt: 'What happened today?', type: 'appreciation' },
      hasLoggedToday: false,
      todayLog: null,
    },
  }).as('getPrompt');

  cy.intercept('GET', '**/api/logs/stats*', {
    body: {
      stats: {
        daysLogged: 3,
        avgRatio: 4.5,
        avgCloseness: 7,
        avgMood: 7,
        totalPositives: 15,
        totalNegatives: 3,
        trend: 'improving',
      },
    },
  }).as('getStats');

  cy.intercept('GET', '**/api/assessments/results', {
    body: {
      completed: [],
      pending: ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'],
      allCompleted: false,
    },
  }).as('getAssessmentResults');

  cy.intercept('GET', '**/api/meetings/upcoming', {
    body: { meetings: [] },
  }).as('getUpcomingMeetings');

  cy.intercept('GET', '**/api/payments/subscription', {
    body: {
      status: 'trial',
      isPremium: false,
      trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      subscription: null,
      trialDaysRemaining: 14,
    },
  }).as('getSubscription');

  cy.intercept('GET', '**/api/insights/daily', {
    body: { insight: null, position: { week: 1, day: 1 } },
  }).as('getInsight');

  cy.intercept('GET', '**/api/videos/daily', {
    body: { video: null, position: { week: 1, day: 1 }, completed: false },
  }).as('getVideo');
});
