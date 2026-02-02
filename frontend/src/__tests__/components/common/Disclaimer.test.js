import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../theme';
import Disclaimer from '../../../components/common/Disclaimer';

const renderWithProviders = (ui) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Disclaimer', () => {
  let localStorageMock;

  beforeEach(() => {
    jest.clearAllMocks();

    localStorageMock = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => localStorageMock[key] || null),
        setItem: jest.fn((key, value) => {
          localStorageMock[key] = value;
        }),
        removeItem: jest.fn((key) => {
          delete localStorageMock[key];
        }),
      },
      writable: true,
    });
  });

  test('renders disclaimer dialog content when not previously accepted', () => {
    renderWithProviders(<Disclaimer />);

    expect(screen.getByText('Important Notice')).toBeInTheDocument();
    expect(
      screen.getByText(/Welcome to Love Rescue App/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/It is not a substitute for professional therapy./)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/educational and informational purposes only/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I Understand and Accept/i })).toBeInTheDocument();
  });

  test('dismisses disclaimer and saves acceptance to localStorage on button click', async () => {
    renderWithProviders(<Disclaimer />);

    expect(screen.getByText('Important Notice')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /I Understand and Accept/i }));

    await waitFor(() => {
      expect(screen.queryByText('Important Notice')).not.toBeInTheDocument();
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith('disclaimerAccepted', 'true');
  });
});
