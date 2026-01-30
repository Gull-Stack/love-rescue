describe('Full User Journey', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('signup flows into dashboard with welcome message', () => {
    // Mock signup
    cy.intercept('POST', '**/api/auth/signup', {
      statusCode: 201,
      body: {
        user: { id: 'user-1', email: 'journey@example.com', firstName: 'Journey', lastName: 'User', subscriptionStatus: 'trial' },
        token: 'fake-jwt-token',
      },
    }).as('signup');

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: { id: 'user-1', email: 'journey@example.com', firstName: 'Journey', lastName: 'User', subscriptionStatus: 'trial', trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(), createdAt: new Date().toISOString() },
        relationship: { id: 'rel-1', hasPartner: false, inviteCode: 'JOURNEY1', partner: null },
      },
    }).as('getMe');

    // Assessments page mock (signup redirects here)
    cy.intercept('GET', '**/api/assessments/results', {
      body: { completed: [], pending: ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'], allCompleted: false },
    }).as('getAssessmentResults');

    // Also set up dashboard mocks for when we navigate there
    cy.setupApiMocks();

    cy.visit('/signup');

    cy.get('input[name="firstName"]').type('Journey');
    cy.get('input[name="lastName"]').type('User');
    cy.get('input[name="email"]').type('journey@example.com');
    cy.get('input[name="password"]').type('securepass1');
    cy.get('input[name="confirmPassword"]').type('securepass1');
    cy.contains('button', 'Create Account').click();

    cy.wait('@signup');
    cy.url().should('include', '/assessments');
    cy.contains('Assessments').should('be.visible');

    // Navigate to dashboard
    cy.visit('/dashboard');
    cy.wait('@getMe');
    cy.contains('Welcome, Journey').should('be.visible');
  });

  it('dashboard navigates to assessments page', () => {
    cy.login();
    cy.setupApiMocks();

    cy.visit('/dashboard');
    cy.wait('@getMe');

    // Click the "Continue Assessments" button on the dashboard
    cy.contains('Continue Assessments').click();
    cy.url().should('include', '/assessments');
    cy.contains('Assessments').should('be.visible');
  });

  it('completes an assessment quiz flow end-to-end', () => {
    cy.login();
    cy.setupApiMocks();

    // Mock questions for the attachment assessment (3 questions for brevity)
    cy.intercept('GET', '**/api/assessments/questions/attachment', {
      statusCode: 200,
      body: {
        questions: [
          { id: 'q1', text: 'I feel comfortable depending on my partner.' },
          { id: 'q2', text: 'I worry that my partner will leave me.' },
          { id: 'q3', text: 'I find it easy to get close to others.' },
        ],
      },
    }).as('getQuestions');

    // Mock assessment results page
    cy.intercept('GET', '**/api/assessments/results', {
      body: { completed: [], pending: ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'], allCompleted: false },
    }).as('getAssessmentResults');

    // Mock submit
    cy.intercept('POST', '**/api/assessments/submit', {
      statusCode: 200,
      body: {
        assessment: {
          id: 'assess-1',
          type: 'attachment',
          score: { style: 'Secure', confidence: 85 },
        },
      },
    }).as('submitAssessment');

    // Visit the quiz directly
    cy.visit('/assessments/attachment');
    cy.wait('@getQuestions');

    // Question 1 of 3
    cy.contains('Question 1 of 3').should('be.visible');
    cy.contains('I feel comfortable depending on my partner.').should('be.visible');
    cy.contains('Agree').click();
    cy.contains('button', 'Next').click();

    // Question 2 of 3
    cy.contains('Question 2 of 3').should('be.visible');
    cy.contains('I worry that my partner will leave me.').should('be.visible');
    cy.contains('Disagree').click();
    cy.contains('button', 'Next').click();

    // Question 3 of 3 (last question shows Submit button)
    cy.contains('Question 3 of 3').should('be.visible');
    cy.contains('I find it easy to get close to others.').should('be.visible');
    cy.contains('Strongly Agree').click();
    cy.contains('button', 'Submit').click();

    cy.wait('@submitAssessment');

    // Result screen
    cy.contains('Assessment Complete!').should('be.visible');
    cy.contains('Secure Attachment').should('be.visible');
    cy.contains('Back to Assessments').should('be.visible');
    cy.contains('View Matchup').should('be.visible');
  });

  it('views matchup score with partner', () => {
    cy.loginWithPartner();
    cy.setupApiMocks();

    // Mock matchup APIs
    cy.intercept('GET', '**/api/matchup/status', {
      statusCode: 200,
      body: {
        canGenerateMatchup: true,
        user1: { name: 'Test', completed: ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'] },
        user2: { name: 'Partner', completed: ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'] },
      },
    }).as('getMatchupStatus');

    cy.intercept('GET', '**/api/matchup/current', {
      statusCode: 200,
      body: {
        matchup: {
          id: 'matchup-1',
          score: 78,
          alignments: [
            { area: 'Communication', note: 'Both partners value open dialogue.' },
            { area: 'Values', note: 'Shared priorities around family.' },
          ],
          misses: [
            { area: 'Conflict Style', note: 'Different approaches to resolving disagreements.' },
          ],
        },
      },
    }).as('getMatchupCurrent');

    cy.intercept('GET', '**/api/strategies/current', {
      body: { strategy: null },
    }).as('getStrategy');

    cy.visit('/matchup');
    cy.wait('@getMatchupStatus');

    // Score is shown
    cy.contains('78%').should('be.visible');
    cy.contains('Compatibility Score').should('be.visible');

    // Alignments section
    cy.contains('Alignments').should('be.visible');
    cy.contains('Communication').should('be.visible');
    cy.contains('Both partners value open dialogue.').should('be.visible');

    // Areas to work on
    cy.contains('Areas to Work On').should('be.visible');
    cy.contains('Conflict Style').should('be.visible');

    // Action buttons
    cy.contains('button', 'Regenerate').should('be.visible');
    cy.contains('button', 'View Strategies').should('be.visible');
  });
});
