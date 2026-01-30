describe('Matchup', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.setupApiMocks();
  });

  it('shows "Partner Required" when user has no partner', () => {
    cy.login(); // default login has hasPartner: false

    cy.intercept('GET', '**/api/matchup/status', {
      statusCode: 200,
      body: {
        canGenerateMatchup: false,
        user1: { name: 'Test', completed: [] },
        user2: null,
      },
    }).as('getMatchupStatus');

    cy.intercept('GET', '**/api/matchup/current', {
      statusCode: 200,
      body: { matchup: null },
    }).as('getMatchupCurrent');

    cy.visit('/matchup');
    cy.wait('@getMatchupStatus');

    cy.contains('Partner Required').should('be.visible');
    cy.contains('Invite your partner to see your matchup score').should('be.visible');
    cy.contains('button', 'Invite Partner').should('be.visible');
  });

  it('shows "Generate Matchup Score" button when both partners have completed all assessments', () => {
    cy.loginWithPartner();

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
      body: { matchup: null },
    }).as('getMatchupCurrent');

    cy.intercept('GET', '**/api/strategies/current', {
      body: { strategy: null },
    });

    cy.visit('/matchup');
    cy.wait('@getMatchupStatus');

    cy.contains('Ready to Generate!').should('be.visible');
    cy.contains('Both partners have completed all assessments').should('be.visible');
    cy.contains('button', 'Generate Matchup Score').should('be.visible');
  });

  it('displays the matchup score with alignments and misses', () => {
    cy.loginWithPartner();

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
          score: 82,
          alignments: [
            { area: 'Emotional Support', note: 'Both partners provide consistent emotional support.' },
            { area: 'Shared Goals', note: 'Strong alignment on long-term life goals.' },
          ],
          misses: [
            { area: 'Conflict Resolution', note: 'Different approaches to handling disagreements.' },
            { area: 'Social Preferences', note: 'Varying needs for social interaction.' },
          ],
        },
      },
    }).as('getMatchupCurrent');

    cy.intercept('GET', '**/api/strategies/current', {
      body: { strategy: null },
    });

    cy.visit('/matchup');
    cy.wait(['@getMatchupStatus', '@getMatchupCurrent']);

    // Score
    cy.contains('82%').should('be.visible');
    cy.contains('Compatibility Score').should('be.visible');

    // Alignments
    cy.contains('Alignments').should('be.visible');
    cy.contains('Emotional Support').should('be.visible');
    cy.contains('Both partners provide consistent emotional support.').should('be.visible');
    cy.contains('Shared Goals').should('be.visible');

    // Misses
    cy.contains('Areas to Work On').should('be.visible');
    cy.contains('Conflict Resolution').should('be.visible');
    cy.contains('Social Preferences').should('be.visible');

    // Action buttons
    cy.contains('button', 'Regenerate').should('be.visible');
    cy.contains('button', 'View Strategies').should('be.visible');
  });
});
