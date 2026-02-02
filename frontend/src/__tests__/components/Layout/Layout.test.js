import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';
import Layout from '../../../components/Layout/Layout';
import { useAuth } from '../../../contexts/AuthContext';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
}));

const renderWithProviders = (ui, { route = '/dashboard' } = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('Layout', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      user: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      logout: mockLogout,
    });
    // Default to desktop width
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false, // not mobile
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  test('renders navigation bar with app title', () => {
    renderWithProviders(<Layout />);

    expect(screen.getByText('Love Rescue')).toBeInTheDocument();
  });

  test('shows user initials avatar in the nav bar', () => {
    renderWithProviders(<Layout />);

    // The avatar shows initials derived from firstName[0] + lastName[0] = "JD"
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  test('has navigation links for all main sections', () => {
    renderWithProviders(<Layout />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Assessments')).toBeInTheDocument();
    expect(screen.getByText('Matchup')).toBeInTheDocument();
    expect(screen.getByText('Daily Log')).toBeInTheDocument();
    expect(screen.getByText('Strategies')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('logout menu item calls logout and navigates to login', async () => {
    renderWithProviders(<Layout />);

    // Click the avatar to open the user menu
    const avatarButton = screen.getByText('JD').closest('button');
    fireEvent.click(avatarButton);

    // Click Logout in the dropdown menu
    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Logout'));

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
