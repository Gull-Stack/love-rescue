describe('Settings', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.setupApiMocks();
  });

  it('shows the invite partner section with generate link button', () => {
    cy.login(); // hasPartner: false

    cy.intercept('GET', '**/api/calendar/status', {
      body: { connected: false, calendarAvailable: true },
    }).as('getCalendarStatus');

    cy.intercept('GET', '**/api/therapist/consent', {
      body: { consent: false },
    }).as('getConsent');

    cy.visit('/settings');
    cy.wait('@getMe');

    // Page title
    cy.contains('Settings').should('be.visible');

    // Account info
    cy.contains('Account').should('be.visible');
    cy.contains('test@example.com').should('be.visible');
    cy.contains('Test User').should('be.visible');

    // Partner section — no partner yet
    cy.contains('Partner').should('be.visible');
    cy.contains('Invite your partner to unlock full features').should('be.visible');
    cy.contains('button', 'Generate Invite Link').should('be.visible');

    // Email input for optional partner email
    cy.get('input[type="email"]').should('exist');
  });

  it('shows subscription info and plan options', () => {
    cy.login(); // subscriptionStatus: 'trial'

    cy.intercept('GET', '**/api/calendar/status', {
      body: { connected: false, calendarAvailable: true },
    }).as('getCalendarStatus');

    cy.intercept('GET', '**/api/therapist/consent', {
      body: { consent: false },
    }).as('getConsent');

    cy.visit('/settings');
    cy.wait('@getMe');

    // Subscription section
    cy.contains('Subscription').should('be.visible');
    cy.contains('TRIAL').should('be.visible');
    cy.contains('14 days remaining in trial').should('be.visible');

    // Plan options
    cy.contains('Standard').should('be.visible');
    cy.contains('$9.99').should('be.visible');
    cy.contains('Premium').should('be.visible');
    cy.contains('$19.99').should('be.visible');
    cy.contains('Recommended').should('be.visible');

    // Subscribe buttons
    cy.get('button').filter(':contains("Subscribe")').should('have.length.at.least', 2);

    // Google Calendar section
    cy.contains('Google Calendar').should('be.visible');
    cy.contains('Connect Calendar').should('be.visible');

    // Therapist section
    cy.contains('Therapist Integration').should('be.visible');
    cy.contains('Enable therapist access').should('be.visible');

    // Legal section
    cy.contains('Legal').should('be.visible');
    cy.contains('Privacy Policy').should('be.visible');
    cy.contains('Terms of Service').should('be.visible');
  });
});
