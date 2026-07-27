/**
 * QA remediation P0-D: the quick log payload is mood-only.
 * This test FAILS if QuickLogFAB ever again invents positiveCount /
 * negativeCount (fabricated Gottman-ratio inputs) from a mood tap.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickLogFAB from '../../../components/dashboard/QuickLogFAB';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';

jest.mock('../../../services/api', () => ({
  logsApi: {
    submitDaily: jest.fn(),
  },
}));
jest.mock('../../../utils/celebrate', () => ({ celebrate: jest.fn() }));
jest.mock('../../../utils/haptics', () => ({ hapticLight: jest.fn() }));
import { logsApi } from '../../../services/api';

describe('QuickLogFAB payload integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logsApi.submitDaily.mockResolvedValue({ data: { message: 'Quick log saved' } });
  });

  async function openAndTapFirstMood() {
    renderWithProviders(<QuickLogFAB />);
    await userEvent.click(screen.getByRole('button', { name: /quick|log|add/i }));
    const moodButtons = await screen.findAllByRole('button', { name: /^Mood:/i });
    await userEvent.click(moodButtons[0]);
    await waitFor(() => expect(logsApi.submitDaily).toHaveBeenCalledTimes(1));
    return logsApi.submitDaily.mock.calls[0][0];
  }

  test('sends mood + quickLog flag and NOTHING else — no invented counts', async () => {
    const payload = await openAndTapFirstMood();

    expect(payload.quickLog).toBe(true);
    expect(typeof payload.mood).toBe('number');
    expect(payload.mood).toBeGreaterThanOrEqual(1);
    expect(payload.mood).toBeLessThanOrEqual(10);
    // The forbidden fields: fabricated Gottman-ratio inputs
    expect(payload).not.toHaveProperty('positiveCount');
    expect(payload).not.toHaveProperty('negativeCount');
    expect(Object.keys(payload).sort()).toEqual(['mood', 'quickLog']);
  });
});
