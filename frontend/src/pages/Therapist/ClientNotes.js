import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Chip, Alert, Skeleton,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventNoteIcon from '@mui/icons-material/EventNote';
import therapistService from '../../services/therapistService';
import { SessionNoteEditor } from '../../components/therapist';
import EmptyState from '../../components/common/EmptyState';

const PAGE_SIZE = 20;
const PREVIEW_LENGTH = 80;

/** Sensitive content — surface only a short first-line preview in the list. */
const previewText = (note) => {
  const source = (note.content || '').replace(/\s+/g, ' ').trim();
  if (!source) return '(empty note)';
  return source.length > PREVIEW_LENGTH ? `${source.slice(0, PREVIEW_LENGTH)}…` : source;
};

const fmtSessionDate = (date) =>
  new Date(date).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

const ClientNotes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [notes, setNotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toast, setToast] = useState('');

  // Open a specific note once (e.g. arriving from "complete → create note").
  const openedFromQuery = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [clientRes, notesRes] = await Promise.all([
        therapistService.getClient(id),
        therapistService.getClientNotes(id, { limit: PAGE_SIZE, offset: 0 }),
      ]);
      setClient(clientRes.data);
      setNotes(notesRes.data.notes || []);
      setTotal(notesRes.data.pagination?.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load session notes');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    document.title = 'Session Notes | Love Rescue';
    fetchData();
  }, [fetchData]);

  // Deep-link: ?noteId=… opens that note in the editor, prefilled.
  useEffect(() => {
    const noteId = searchParams.get('noteId');
    if (!noteId || loading || openedFromQuery.current) return;
    openedFromQuery.current = true;
    const inList = notes.find((n) => n.id === noteId);
    if (inList) {
      setEditingNote(inList);
      setEditorOpen(true);
      return;
    }
    therapistService.getNote(noteId)
      .then((res) => {
        if (res.data?.note) {
          setEditingNote(res.data.note);
          setEditorOpen(true);
        }
      })
      .catch(() => { /* note not found — just show the list */ });
  }, [searchParams, loading, notes]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await therapistService.getClientNotes(id, { limit: PAGE_SIZE, offset: notes.length });
      setNotes((prev) => [...prev, ...(res.data.notes || [])]);
      setTotal(res.data.pagination?.total ?? total);
    } catch {
      setToast('Could not load more notes.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSaved = (savedNote) => {
    setToast(editingNote ? 'Note updated.' : 'Note saved.');
    setEditingNote(null);
    if (!savedNote) {
      fetchData();
      return;
    }
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === savedNote.id);
      const next = exists
        ? prev.map((n) => (n.id === savedNote.id ? savedNote : n))
        : [savedNote, ...prev];
      return next.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
    });
    if (!notes.some((n) => n.id === savedNote.id)) setTotal((t) => t + 1);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await therapistService.deleteNote(deleteTarget.id);
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleteTarget(null);
      setToast('Note deleted.');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Could not delete the note. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={280} height={40} sx={{ mb: 2 }} />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={88} sx={{ mb: 1.5 }} />)}
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={fetchData}>Retry</Button>}>{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <IconButton
          onClick={() => navigate(`/therapist/clients/${id}`)}
          sx={{ minWidth: 44, minHeight: 44 }}
          aria-label="Back to client"
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography variant="h4" fontWeight={600}>Session Notes</Typography>
          <Typography variant="body2" color="text.secondary">{client?.name}</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditingNote(null); setEditorOpen(true); }}
          sx={{ minHeight: 44 }}
        >
          New note
        </Button>
      </Box>

      {notes.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              emoji="📝"
              title="No session notes yet"
              subtitle="Notes are your private clinical record — clients never see them. Start one after your next session."
              ctaText="Write the first note"
              onCta={() => { setEditingNote(null); setEditorOpen(true); }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {notes.map((note) => (
            <Card key={note.id} sx={{ mb: 1.5 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <EventNoteIcon sx={{ color: 'text.disabled', display: { xs: 'none', sm: 'block' } }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {fmtSessionDate(note.sessionDate)}
                    </Typography>
                    <Chip
                      label={note.noteFormat === 'soap' ? 'SOAP' : 'Freeform'}
                      size="small"
                      variant="outlined"
                      color={note.noteFormat === 'soap' ? 'secondary' : 'default'}
                    />
                    {note.appointmentId && (
                      <Chip label="Linked to appointment" size="small" variant="outlined" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
                    {previewText(note)}
                  </Typography>
                </Box>
                <IconButton
                  aria-label="Edit note"
                  onClick={() => { setEditingNote(note); setEditorOpen(true); }}
                  sx={{ minWidth: 44, minHeight: 44 }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  aria-label="Delete note"
                  onClick={() => { setDeleteError(''); setDeleteTarget(note); }}
                  sx={{ minWidth: 44, minHeight: 44 }}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </CardContent>
            </Card>
          ))}

          {notes.length < total && (
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Button onClick={loadMore} disabled={loadingMore} sx={{ minHeight: 44 }}>
                {loadingMore ? <CircularProgress size={20} /> : `Load more (${total - notes.length} older)`}
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Editor */}
      <SessionNoteEditor
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingNote(null); }}
        clientId={id}
        note={editingNote}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteTarget)} onClose={deleting ? undefined : () => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete this note?</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <Typography>
            The note from {deleteTarget && fmtSessionDate(deleteTarget.sessionDate)} will be removed
            from your list.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ minHeight: 44 }}>Keep note</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting} sx={{ minHeight: 44 }}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default ClientNotes;
