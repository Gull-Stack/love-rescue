describe('Reports', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login();
    cy.setupApiMocks();
  });

  it('shows the weekly report with stats, highlights, and improvements', () => {
    cy.intercept('GET', '**/api/reports/weekly*', {
      statusCode: 200,
      body: {
        report: {
          weekStart: new Date(Date.now() - 7 * 86400000).toISOString(),
          weekEnd: new Date().toISOString(),
          highlights: [
            'Logged 5 out of 7 days',
            'Average ratio improved to 4.5:1',
            'Closeness score increased by 1 point',
          ],
          improvements: [
            'Negative interactions peaked on Wednesday',
            'Mood dipped below 5 on two days',
          ],
          recommendations: [
            { priority: 'high', text: 'Focus on active listening during disagreements.' },
            { priority: 'medium', text: 'Schedule a weekly date night.' },
            { priority: 'low', text: 'Try a new shared hobby together.' },
          ],
          dailyBreakdown: [
            { date: new Date(Date.now() - 6 * 86400000).toISOString(), positiveCount: 4, negativeCount: 1 },
            { date: new Date(Date.now() - 5 * 86400000).toISOString(), positiveCount: 3, negativeCount: 2 },
            { date: new Date(Date.now() - 4 * 86400000).toISOString(), positiveCount: 5, negativeCount: 0 },
            { date: new Date(Date.now() - 3 * 86400000).toISOString(), positiveCount: 2, negativeCount: 3 },
            { date: new Date(Date.now() - 2 * 86400000).toISOString(), positiveCount: 6, negativeCount: 1 },
            { date: new Date(Date.now() - 1 * 86400000).toISOString(), positiveCount: 4, negativeCount: 0 },
            { date: new Date().toISOString(), positiveCount: 3, negativeCount: 1 },
          ],
        },
      },
    }).as('getWeeklyReport');

    cy.intercept('GET', '**/api/logs/stats*', {
      statusCode: 200,
      body: {
        stats: {
          daysLogged: 5,
          avgRatio: 4.5,
          avgCloseness: 7.2,
          avgMood: 6.8,
          totalPositives: 27,
          totalNegatives: 8,
          trend: 'improving',
        },
        chartData: [
          { date: new Date(Date.now() - 6 * 86400000).toISOString(), ratio: 4.0 },
          { date: new Date(Date.now() - 5 * 86400000).toISOString(), ratio: 1.5 },
          { date: new Date(Date.now() - 4 * 86400000).toISOString(), ratio: 999 },
          { date: new Date(Date.now() - 3 * 86400000).toISOString(), ratio: 0.7 },
          { date: new Date(Date.now() - 2 * 86400000).toISOString(), ratio: 6.0 },
          { date: new Date(Date.now() - 1 * 86400000).toISOString(), ratio: 999 },
          { date: new Date().toISOString(), ratio: 3.0 },
        ],
      },
    }).as('getStatsReport');

    cy.visit('/reports');
    cy.wait(['@getWeeklyReport', '@getStatsReport']);

    // Page title
    cy.contains('Reports').should('be.visible');

    // Period selector buttons
    cy.contains('7 Days').should('be.visible');
    cy.contains('30 Days').should('be.visible');
    cy.contains('90 Days').should('be.visible');

    // Stats overview cards
    cy.contains('4.5:1').should('be.visible'); // Avg Ratio
    cy.contains('27').should('be.visible'); // Positives
    cy.contains('8').should('be.visible'); // Negatives

    // Trend
    cy.contains('improving').should('be.visible');

    // Chart titles
    cy.contains('Ratio Trend').should('be.visible');
    cy.contains('Daily Interactions').should('be.visible');

    // Highlights
    cy.contains('Highlights').should('be.visible');
    cy.contains('Logged 5 out of 7 days').should('be.visible');
    cy.contains('Average ratio improved to 4.5:1').should('be.visible');

    // Improvements
    cy.contains('Areas to Improve').should('be.visible');
    cy.contains('Negative interactions peaked on Wednesday').should('be.visible');

    // Recommendations
    cy.contains('Recommendations').should('be.visible');
    cy.contains('Focus on active listening during disagreements.').should('be.visible');
  });

  it('shows monthly report when selecting 30-day period', () => {
    cy.intercept('GET', '**/api/reports/weekly*', {
      statusCode: 200,
      body: {
        report: {
          weekStart: new Date(Date.now() - 30 * 86400000).toISOString(),
          weekEnd: new Date().toISOString(),
          highlights: ['Strong month with consistent logging'],
          improvements: ['Try to maintain higher ratio on weekends'],
          recommendations: [{ priority: 'medium', text: 'Add weekend rituals.' }],
          dailyBreakdown: [],
        },
      },
    }).as('getWeeklyReport');

    cy.intercept('GET', '**/api/logs/stats*', {
      statusCode: 200,
      body: {
        stats: {
          daysLogged: 22,
          avgRatio: 5.2,
          avgCloseness: 7.5,
          avgMood: 7.0,
          totalPositives: 110,
          totalNegatives: 21,
          trend: 'improving',
        },
        chartData: [],
      },
    }).as('getStatsReport');

    cy.visit('/reports');
    cy.wait(['@getWeeklyReport', '@getStatsReport']);

    // Click 30 Days
    cy.contains('30 Days').click();

    // Wait for re-fetch with the new period
    cy.wait('@getStatsReport');

    // Stats should be visible
    cy.contains('Reports').should('be.visible');
    cy.contains('Highlights').should('be.visible');
    cy.contains('Areas to Improve').should('be.visible');
  });
});
