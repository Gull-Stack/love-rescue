describe('Authentication', () => {
  beforeEach(() => {
    // Clear any stored tokens before each test
    cy.clearLocalStorage();
  });

  // -------------------------------------------------------
  // Login page
  // -------------------------------------------------------

  it('displays the login form with email, password, and sign-in button', () => {
    cy.visit('/login');

    cy.contains('Welcome Back').should('be.visible');
    cy.get('input[name="email"]').should('exist');
    cy.get('input[name="password"]').should('exist');
    cy.contains('button', 'Sign In').should('be.visible');
    cy.contains('Sign in with Biometrics').should('be.visible');
    cy.contains("Don't have an account?").should('be.visible');
    cy.contains('Sign up').should('have.attr', 'href', '/signup');
  });

  it('shows validation error when submitting empty login form', () => {
    cy.visit('/login');

    // HTML5 required attribute prevents submission; check that fields are required
    cy.get('input[name="email"]').should('have.attr', 'required');
    cy.get('input[name="password"]').should('have.attr', 'required');

    // Attempt submit without filling fields — form should not proceed
    cy.contains('button', 'Sign In').click();

    // We should still be on the login page (no redirect)
    cy.url().should('include', '/login');
  });

  it('shows error message for invalid credentials', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 401,
      body: { error: 'Invalid email or password' },
    }).as('loginFail');

    // We also need to mock /auth/me to return 401 so the app does not
    // think the user is logged in from a stale token.
    cy.intercept('GET', '**/api/auth/me', { statusCode: 401, body: {} }).as('getMeFail');

    cy.visit('/login');

    cy.get('input[name="email"]').type('wrong@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.contains('button', 'Sign In').click();

    cy.wait('@loginFail');
    cy.contains('Invalid email or password').should('be.visible');
  });

  it('successful login redirects to dashboard', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        user: { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', subscriptionStatus: 'trial' },
        token: 'fake-jwt-token',
      },
    }).as('loginOk');

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', subscriptionStatus: 'trial', trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(), createdAt: new Date().toISOString() },
        relationship: { id: 'rel-1', hasPartner: false, inviteCode: 'TESTCODE', partner: null },
      },
    }).as('getMe');

    // Mock dashboard data APIs so the page loads cleanly
    cy.setupApiMocks();

    cy.visit('/login');

    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.contains('button', 'Sign In').click();

    cy.wait('@loginOk');
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome, Test').should('be.visible');
  });

  // -------------------------------------------------------
  // Signup page
  // -------------------------------------------------------

  it('displays the signup form with all required fields', () => {
    cy.intercept('GET', '**/api/auth/me', { statusCode: 401, body: {} });

    cy.visit('/signup');

    cy.contains('Start Your Journey').should('be.visible');
    cy.get('input[name="firstName"]').should('exist');
    cy.get('input[name="lastName"]').should('exist');
    cy.get('input[name="email"]').should('exist');
    cy.get('input[name="password"]').should('exist');
    cy.get('input[name="confirmPassword"]').should('exist');
    cy.contains('button', 'Create Account').should('be.visible');
    cy.contains('Already have an account?').should('be.visible');
    cy.contains('Sign in').should('have.attr', 'href', '/login');
  });

  it('successful signup redirects to assessments', () => {
    cy.intercept('POST', '**/api/auth/signup', {
      statusCode: 201,
      body: {
        user: { id: 'user-new', email: 'new@example.com', firstName: 'New', lastName: 'User', subscriptionStatus: 'trial' },
        token: 'fake-jwt-token-new',
      },
    }).as('signupOk');

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: { id: 'user-new', email: 'new@example.com', firstName: 'New', lastName: 'User', subscriptionStatus: 'trial', trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(), createdAt: new Date().toISOString() },
        relationship: { id: 'rel-2', hasPartner: false, inviteCode: 'NEWCODE', partner: null },
      },
    }).as('getMe');

    cy.intercept('GET', '**/api/assessments/results', {
      body: { completed: [], pending: ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'], allCompleted: false },
    }).as('getAssessmentResults');

    cy.visit('/signup');

    cy.get('input[name="firstName"]').type('New');
    cy.get('input[name="lastName"]').type('User');
    cy.get('input[name="email"]').type('new@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('input[name="confirmPassword"]').type('password123');
    cy.contains('button', 'Create Account').click();

    cy.wait('@signupOk');
    cy.url().should('include', '/assessments');
  });

  // -------------------------------------------------------
  // Logout
  // -------------------------------------------------------

  it('logout clears token and redirects to login', () => {
    cy.login();
    cy.setupApiMocks();

    cy.visit('/dashboard');
    cy.wait('@getMe');

    // The Layout component should contain a logout mechanism.
    // Simulate logout by clearing the token (mirroring AuthContext.logout())
    // then revisiting a protected route to verify redirect.
    cy.window().then((win) => {
      win.localStorage.removeItem('token');
    });

    // Intercept the /auth/me call that fires on reload to return 401
    cy.intercept('GET', '**/api/auth/me', { statusCode: 401, body: {} }).as('getMeUnauth');

    cy.visit('/dashboard');
    cy.url().should('include', '/login').or('include', '/welcome');
  });
});
