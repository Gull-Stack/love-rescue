import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../theme';

// Standard render wrapper: MUI theme + memory router.
//
// Auth is NOT provided here — pages consume useAuth() from
// contexts/AuthContext, so tests mock that module directly:
//   jest.mock('.../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
// and feed it a value from testHelpers/mockAuthContext.js.
export function renderWithProviders(ui, { initialEntries = ['/'], ...renderOptions } = {}) {
  function Wrapper({ children }) {
    return (
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </ThemeProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
