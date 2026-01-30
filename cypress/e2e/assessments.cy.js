describe('Assessments', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
    cy.setupApiMocks();
  });

  it('shows all 4 assessment cards with correct titles', () => {
    cy.intercept('GET', '**/api/assessments/results', {
      body: {
        completed: [],
        pending: ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'],
        allCompleted: false,
      },
    }).as('getAssessmentResults');

    cy.visit('/assessments');
    cy.wait('@getAssessmentResults');

    // All 4 assessment types visible
    cy.contains('Attachment Style').should('be.visible');
    cy.contains('16 Personalities').should('be.visible');
    cy.contains('Wellness Behavior').should('be.visible');
    cy.contains('Patterns & Closeness').should('be.visible');

    // Each card shows a Start button
    cy.get('button').filter(':contains("Start")').should('have.length', 4);

    // Progress bar shows 0/4
    cy.contains('0/4 completed').should('be.visible');
  });

  it('navigates to the quiz when clicking Start on an assessment card', () => {
    cy.intercept('GET', '**/api/assessments/results', {
      body: { completed: [], pending: ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'], allCompleted: false },
    }).as('getAssessmentResults');

    cy.intercept('GET', '**/api/assessments/questions/attachment', {
      body: {
        questions: [
          { id: 'q1', text: 'I feel comfortable depending on my partner.' },
        ],
      },
    }).as('getQuestions');

    cy.visit('/assessments');
    cy.wait('@getAssessmentResults');

    // Click the first Start button (Attachment Style card)
    cy.contains('Attachment Style').parents('[class*="MuiCard"]').find('button').contains('Start').click();

    cy.url().should('include', '/assessments/attachment');
    cy.wait('@getQuestions');
    cy.contains('Attachment Style Assessment').should('be.visible');
  });

  it('quiz displays questions with navigation buttons and progress bar', () => {
    cy.intercept('GET', '**/api/assessments/questions/personality', {
      body: {
        questions: [
          { id: 'p1', text: 'I prefer planning over spontaneity.' },
          { id: 'p2', text: 'I enjoy meeting new people.' },
          { id: 'p3', text: 'I make decisions based on logic.' },
        ],
      },
    }).as('getQuestions');

    cy.visit('/assessments/personality');
    cy.wait('@getQuestions');

    // Header and progress
    cy.contains('16 Personalities Assessment').should('be.visible');
    cy.contains('Question 1 of 3').should('be.visible');

    // Radio options (Likert scale)
    cy.contains('Strongly Disagree').should('be.visible');
    cy.contains('Disagree').should('be.visible');
    cy.contains('Neutral').should('be.visible');
    cy.contains('Agree').should('be.visible');
    cy.contains('Strongly Agree').should('be.visible');

    // Back button disabled on first question
    cy.contains('button', 'Back').should('be.disabled');

    // Next button disabled until an answer is chosen
    cy.contains('button', 'Next').should('be.disabled');

    // Select an answer
    cy.contains('Agree').click();
    cy.contains('button', 'Next').should('not.be.disabled');

    // Navigate forward
    cy.contains('button', 'Next').click();
    cy.contains('Question 2 of 3').should('be.visible');

    // Back button now enabled
    cy.contains('button', 'Back').should('not.be.disabled');
  });

  it('completes a quiz and shows the result screen', () => {
    cy.intercept('GET', '**/api/assessments/questions/wellness_behavior', {
      body: {
        questions: [
          { id: 'w1', text: 'I handle frustration calmly.' },
          { id: 'w2', text: 'I exercise regularly.' },
        ],
      },
    }).as('getQuestions');

    cy.intercept('POST', '**/api/assessments/submit', {
      statusCode: 200,
      body: {
        assessment: {
          id: 'assess-wb',
          type: 'wellness_behavior',
          score: { score: 72, level: 'Good' },
        },
      },
    }).as('submitAssessment');

    cy.visit('/assessments/wellness_behavior');
    cy.wait('@getQuestions');

    // Answer question 1
    cy.contains('I handle frustration calmly.').should('be.visible');
    cy.contains('Agree').click();
    cy.contains('button', 'Next').click();

    // Answer question 2 (last) — Submit button should appear
    cy.contains('I exercise regularly.').should('be.visible');
    cy.contains('Strongly Agree').click();
    cy.contains('button', 'Submit').click();

    cy.wait('@submitAssessment');

    // Result screen
    cy.contains('Assessment Complete!').should('be.visible');
    cy.contains('72/100 - Good').should('be.visible');
    cy.contains('Back to Assessments').should('be.visible');
    cy.contains('View Matchup').should('be.visible');
  });
});
