import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import Layout from '../../../components/Layout/Layout';
import { useAuth } from '../../../contexts/AuthContext';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';
import { createAuthValue } from '../../../testHelpers/mockAuthContext';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// XPBar (in the app bar) fetches streaks — keep the module mock broad.
jest.mock('../../../services/api', () =>
  require('../../../testHelpers/mockApi').buildApiModuleMock()
);
import { streaksApi } from '../../../services/api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
}));

describe('Layout', () => {
  let auth;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    auth = createAuthValue({
      user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    });
    useAuth.mockImplementation(() => auth);
    streaksApi.getStreak.mockResolvedValue({
      data: { currentStreak: 3, xp: 120, level: 2, levelName: 'Builder', levelProgress: 20, xpToNextLevel: 100 },
    });
    // Default polyfilled matchMedia matches:false → desktop layout
  });

  test('renders the Love Rescue brand and the routed page content', () => {
    renderWithProviders(<Layout />, { initialEntries: ['/dashboard'] });

    expect(screen.getByText('Love Rescue')).toBeInTheDocument();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  test('shows user initials avatar in the nav bar', () => {
    renderWithProviders(<Layout />, { initialEntries: ['/dashboard'] });

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  test('desktop drawer shows the grouped navigation sections', () => {
    // Established users get the full menu (BLANK users get a trimmed one).
    localStorage.setItem('lr_user_state', 'PRACTICING');
    renderWithProviders(<Layout />, { initialEntries: ['/dashboard'] });

    // Section headers
    expect(screen.getByText('GROW')).toBeInTheDocument();
    expect(screen.getByText('DAILY')).toBeInTheDocument();
    expect(screen.getByText('UNDERSTAND')).toBeInTheDocument();
    expect(screen.getByText('YOU')).toBeInTheDocument();

    // Key destinations
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('16-Week Journey')).toBeInTheDocument();
    expect(screen.getByText('Strategies')).toBeInTheDocument();
    expect(screen.getByText('Check-in')).toBeInTheDocument();
    expect(screen.getByText('Real Talk')).toBeInTheDocument();
    expect(screen.getByText('Gratitude')).toBeInTheDocument();
    expect(screen.getByText('Assessments')).toBeInTheDocument();
    expect(screen.getByText('Matchup')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
  });

  test('brand-new (BLANK) users get a trimmed menu without premature destinations', () => {
    localStorage.setItem('lr_user_state', 'BLANK');
    renderWithProviders(<Layout />, { initialEntries: ['/dashboard'] });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Matchup')).not.toBeInTheDocument();
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('Meetings')).not.toBeInTheDocument();
    expect(screen.queryByText('Skill Tree')).not.toBeInTheDocument();
  });

  test('admin section is hidden for regular users and shown for platform admins', () => {
    const { unmount } = renderWithProviders(<Layout />, { initialEntries: ['/dashboard'] });
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    unmount();

    auth = createAuthValue({
      user: {
        id: 'admin-1',
        firstName: 'Ada',
        lastName: 'Admin',
        email: 'admin@example.com',
        isPlatformAdmin: true,
      },
    });
    useAuth.mockImplementation(() => auth);

    renderWithProviders(<Layout />, { initialEntries: ['/dashboard'] });
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  test('clicking a drawer item navigates to its route', () => {
    renderWithProviders(<Layout />, { initialEntries: ['/dashboard'] });

    fireEvent.click(screen.getByText('Assessments'));
    expect(mockNavigate).toHaveBeenCalledWith('/assessments');
  });

  test('account menu shows email and logout works', async () => {
    renderWithProviders(<Layout />, { initialEntries: ['/dashboard'] });

    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));

    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
    expect(screen.getByText('john@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Logout'));

    expect(auth.logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('therapist routes get the therapist chrome badge', () => {
    renderWithProviders(<Layout />, { initialEntries: ['/therapist'] });

    expect(screen.getByText('Therapist')).toBeInTheDocument();
  });
});
