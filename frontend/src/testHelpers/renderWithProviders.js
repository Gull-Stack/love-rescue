import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../theme';

// Create a simple AuthContext mock
const AuthContext = React.createContext(null);

export const MockAuthProvider = ({ value, children }) => (
  <AuthContext.Provider value={value}>
    {children}
  </AuthContext.Provider>
);

const defaultAuthValue = {
  user: { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', subscriptionStatus: 'trial' },
  relationship: { id: 'rel-1', hasPartner: false, inviteCode: 'TESTCODE', partner: null },
  loading: false,
  error: null,
  login: jest.fn(),
  signup: jest.fn(),
  logout: jest.fn(),
  invitePartner: jest.fn(),
  joinRelationship: jest.fn(),
  refreshUser: jest.fn(),
};

export function renderWithProviders(ui, { authValue = {}, initialEntries = ['/'], ...renderOptions } = {}) {
  const mergedAuth = { ...defaultAuthValue, ...authValue };

  function Wrapper({ children }) {
    return (
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </ThemeProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    authValue: mergedAuth,
  };
}

export { defaultAuthValue };
