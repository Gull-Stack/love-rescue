import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../theme';
import SessionNoteEditor from '../../../components/therapist/SessionNoteEditor';
import therapistService from '../../../services/therapistService';

jest.mock('../../../services/therapistService', () => ({
  __esModule: true,
  default: {
    createNote: jest.fn(),
    updateNote: jest.fn(),
  },
}));

const renderEditor = (props = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <SessionNoteEditor
        open
        onClose={jest.fn()}
        clientId="client-1"
        onSaved={jest.fn()}
        {...props}
      />
    </ThemeProvider>
  );

describe('SessionNoteEditor (SOAP clearing contract)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    therapistService.createNote.mockResolvedValue({ data: { note: { id: 'n1' } } });
    therapistService.updateNote.mockResolvedValue({ data: { note: { id: 'n1' } } });
  });

  test('freeform save sends an explicit soap: null (missing key would mean "no change")', async () => {
    renderEditor();

    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Client is doing well.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));

    await waitFor(() => expect(therapistService.createNote).toHaveBeenCalled());
    expect(therapistService.createNote).toHaveBeenCalledWith(
      'client-1',
      expect.objectContaining({
        content: 'Client is doing well.',
        noteFormat: 'freeform',
        soap: null,
      })
    );
  });

  test('editing a SOAP note and clearing every field sends soap: null so content is removed', async () => {
    const note = {
      id: 'note-9',
      noteFormat: 'soap',
      content: 'Session summary',
      soap: { subjective: 'Client reported anxiety' },
      sessionDate: '2026-07-01T10:00:00.000Z',
    };
    renderEditor({ note });

    // Wipe the only populated SOAP field.
    fireEvent.change(screen.getByLabelText('Subjective'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));

    await waitFor(() => expect(therapistService.updateNote).toHaveBeenCalled());
    expect(therapistService.updateNote).toHaveBeenCalledWith(
      'note-9',
      expect.objectContaining({ noteFormat: 'soap', soap: null })
    );
  });

  test('switching a SOAP note to freeform sends soap: null even if fields had content', async () => {
    const note = {
      id: 'note-9',
      noteFormat: 'soap',
      content: 'Session summary',
      soap: { subjective: 'Client reported anxiety', plan: 'Weekly check-ins' },
      sessionDate: '2026-07-01T10:00:00.000Z',
    };
    renderEditor({ note });

    fireEvent.click(screen.getByRole('button', { name: 'Freeform' }));
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));

    await waitFor(() => expect(therapistService.updateNote).toHaveBeenCalled());
    expect(therapistService.updateNote).toHaveBeenCalledWith(
      'note-9',
      expect.objectContaining({ noteFormat: 'freeform', soap: null })
    );
  });

  test('SOAP save with content still sends the populated soap object', async () => {
    const note = {
      id: 'note-9',
      noteFormat: 'soap',
      content: 'Session summary',
      soap: { subjective: 'Client reported anxiety' },
      sessionDate: '2026-07-01T10:00:00.000Z',
    };
    renderEditor({ note });

    fireEvent.change(screen.getByLabelText('Plan'), {
      target: { value: 'Practice breathing exercises' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));

    await waitFor(() => expect(therapistService.updateNote).toHaveBeenCalled());
    expect(therapistService.updateNote).toHaveBeenCalledWith(
      'note-9',
      expect.objectContaining({
        noteFormat: 'soap',
        soap: {
          subjective: 'Client reported anxiety',
          plan: 'Practice breathing exercises',
        },
      })
    );
  });
});
