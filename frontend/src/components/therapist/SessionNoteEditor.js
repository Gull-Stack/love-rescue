import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert,
  TextField, ToggleButton, ToggleButtonGroup, CircularProgress, Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import therapistService from '../../services/therapistService';
import { toLocalInputValue } from './AppointmentFormDialog';

const SOAP_FIELDS = [
  { key: 'subjective', label: 'Subjective', hint: "Client's report — feelings, events, complaints" },
  { key: 'objective', label: 'Objective', hint: 'Your observations — affect, behavior, appearance' },
  { key: 'assessment', label: 'Assessment', hint: 'Clinical impression and progress' },
  { key: 'plan', label: 'Plan', hint: 'Next steps, homework, next session focus' },
];

const emptySoap = () => ({ subjective: '', objective: '', assessment: '', plan: '' });

/**
 * Session note editor dialog (freeform + optional SOAP fields).
 * - `note` null → create a new note for `clientId`; otherwise edit that note.
 * - Explicit save with a dirty-state guard: closing with unsaved changes asks
 *   for confirmation before discarding.
 * Calls onSaved(note) after a successful save.
 */
const SessionNoteEditor = ({ open, onClose, clientId, note = null, onSaved }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [sessionDate, setSessionDate] = useState(toLocalInputValue(new Date()));
  const [noteFormat, setNoteFormat] = useState('freeform');
  const [content, setContent] = useState('');
  const [soap, setSoap] = useState(emptySoap());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);

  // (Re)hydrate the form each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setError('');
    setSaving(false);
    setDirty(false);
    setDiscardOpen(false);
    if (note) {
      setSessionDate(toLocalInputValue(note.sessionDate || new Date()));
      setNoteFormat(note.noteFormat === 'soap' ? 'soap' : 'freeform');
      setContent(note.content || '');
      setSoap({ ...emptySoap(), ...(note.soap || {}) });
    } else {
      setSessionDate(toLocalInputValue(new Date()));
      setNoteFormat('freeform');
      setContent('');
      setSoap(emptySoap());
    }
  }, [open, note]);

  const touch = (setter) => (value) => {
    setter(value);
    setDirty(true);
  };
  const setContentDirty = touch(setContent);
  const setSessionDateDirty = touch(setSessionDate);
  const setSoapField = (key) => (e) => {
    const value = e.target.value;
    setSoap((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const requestClose = useCallback(() => {
    if (saving) return;
    if (dirty) {
      setDiscardOpen(true);
    } else {
      onClose();
    }
  }, [dirty, saving, onClose]);

  const handleSave = async () => {
    setError('');
    if (!content.trim()) {
      setError('Note content is required.');
      return;
    }
    const parsedDate = new Date(sessionDate);
    if (!sessionDate || Number.isNaN(parsedDate.getTime())) {
      setError('Pick a valid session date.');
      return;
    }
    const soapValue = {};
    for (const { key } of SOAP_FIELDS) {
      if (soap[key] && soap[key].trim()) soapValue[key] = soap[key];
    }
    const hasSoapContent = noteFormat === 'soap' && Object.keys(soapValue).length > 0;
    const payload = {
      content,
      sessionDate: parsedDate.toISOString(),
      noteFormat,
      // The backend treats a MISSING soap key as "no change" and null as
      // "clear". Saving as freeform, or as SOAP with every field empty, must
      // send an explicit null so cleared clinical content is actually removed.
      soap: hasSoapContent ? soapValue : null,
      ...(note?.appointmentId ? { appointmentId: note.appointmentId } : {}),
    };
    setSaving(true);
    try {
      const res = note
        ? await therapistService.updateNote(note.id, payload)
        : await therapistService.createNote(clientId, payload);
      if (onSaved) onSaved(res.data.note);
      setDirty(false);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={requestClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
        <DialogTitle>{note ? 'Edit session note' : 'New session note'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            type="datetime-local"
            label="Session date"
            value={sessionDate}
            onChange={(e) => setSessionDateDirty(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
            sx={{ mt: 1, mb: 2 }}
          />

          <ToggleButtonGroup
            value={noteFormat}
            exclusive
            onChange={(_, v) => { if (v) { setNoteFormat(v); setDirty(true); } }}
            size="small"
            aria-label="Note format"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="freeform" sx={{ minHeight: 44, px: 2 }}>Freeform</ToggleButton>
            <ToggleButton value="soap" sx={{ minHeight: 44, px: 2 }}>SOAP</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label={noteFormat === 'soap' ? 'Summary' : 'Note'}
            value={content}
            onChange={(e) => setContentDirty(e.target.value)}
            multiline
            minRows={noteFormat === 'soap' ? 2 : 6}
            fullWidth
            autoFocus
            sx={{ mb: 2 }}
          />

          {noteFormat === 'soap' && SOAP_FIELDS.map(({ key, label, hint }) => (
            <TextField
              key={key}
              label={label}
              value={soap[key]}
              onChange={setSoapField(key)}
              multiline
              minRows={2}
              fullWidth
              size="small"
              placeholder={hint}
              sx={{ mb: 2 }}
            />
          ))}

          <Typography variant="caption" color="text.secondary">
            Session notes are your private clinical record — clients never see them.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={requestClose} disabled={saving} sx={{ minHeight: 44 }}>Close</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            sx={{ minHeight: 44 }}
          >
            {saving ? <CircularProgress size={20} /> : 'Save note'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dirty-state guard */}
      <Dialog open={discardOpen} onClose={() => setDiscardOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <Typography>This note has unsaved changes. If you close now, they will be lost.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardOpen(false)} sx={{ minHeight: 44 }}>Keep editing</Button>
          <Button
            color="error"
            onClick={() => { setDiscardOpen(false); setDirty(false); onClose(); }}
            sx={{ minHeight: 44 }}
          >
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SessionNoteEditor;
