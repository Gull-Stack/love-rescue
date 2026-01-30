describe('Daily Log', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
    cy.setupApiMocks();

    const today = new Date().toISOString().split('T')[0];

    // Mock the daily log fetch (no existing log for today)
    cy.intercept('GET', `**/api/logs/daily/${today}`, {
      statusCode: 404,
      body: { log: null },
    }).as('getTodayLog');
  });

  it('renders the daily log page with interaction counters, sliders, and journal', () => {
    cy.visit('/daily');
    cy.wait('@getPrompt');

    cy.contains('Daily Log').should('be.visible');
    cy.contains('Track your daily interactions').should('be.visible');

    // Interaction counter section
    cy.contains('Interaction Counter').should('be.visible');
    cy.contains('Positive Interactions').should('be.visible');
    cy.contains('Negative Interactions').should('be.visible');

    // Both counters start at 0
    cy.get('h4').filter(':contains("0")').should('have.length.at.least', 2);

    // Ratio display
    cy.contains('Your Ratio').should('be.visible');

    // Mood and closeness sliders
    cy.contains('Mood (1-10)').should('be.visible');
    cy.contains('Emotional Closeness (1-10)').should('be.visible');

    // Journal entry
    cy.contains('Journal Entry').should('be.visible');
    cy.get('textarea').should('exist');

    // Save button
    cy.contains('button', 'Save Log').should('be.visible');
  });

  it('increments the positive counter and updates the ratio', () => {
    cy.visit('/daily');
    cy.wait('@getPrompt');

    // The positive Add button is a contained, success-colored button with an Add icon.
    // We target the + button within the Positive Interactions section.
    cy.contains('Positive Interactions')
      .parent()
      .find('button[class*="MuiButton-contained"]')
      .click();

    // After one click, positive count should be 1
    cy.contains('Positive Interactions')
      .parent()
      .find('h4')
      .should('contain', '1');

    // Click 4 more times (total 5)
    for (let i = 0; i < 4; i++) {
      cy.contains('Positive Interactions')
        .parent()
        .find('button[class*="MuiButton-contained"]')
        .click();
    }

    cy.contains('Positive Interactions')
      .parent()
      .find('h4')
      .should('contain', '5');

    // With 5 positives, 0 negatives, ratio should show infinity
    cy.contains('Your Ratio').parent().should('contain', ':1');
  });

  it('saves the daily log successfully', () => {
    cy.intercept('POST', '**/api/logs/daily', {
      statusCode: 200,
      body: {
        log: {
          id: 'log-1',
          positiveCount: 3,
          negativeCount: 1,
          mood: 7,
          closenessScore: 8,
          journalEntry: 'A good day together.',
        },
      },
    }).as('submitLog');

    cy.visit('/daily');
    cy.wait('@getPrompt');

    // Increment positive counter 3 times
    for (let i = 0; i < 3; i++) {
      cy.contains('Positive Interactions')
        .parent()
        .find('button[class*="MuiButton-contained"]')
        .click();
    }

    // Increment negative counter once
    cy.contains('Negative Interactions')
      .parent()
      .find('button[class*="MuiButton-contained"]')
      .click();

    // Type a journal entry
    cy.get('textarea').type('A good day together.');

    // Click save
    cy.contains('button', 'Save Log').click();

    cy.wait('@submitLog');
    cy.contains('Daily log saved successfully!').should('be.visible');

    // Button should now say "Update Log"
    cy.contains('button', 'Update Log').should('be.visible');
  });
});
