import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { realTalkApi } from '../../services/api';

const EFFECTIVENESS_BADGES = {
  effective: { label: 'Worked', color: '#22c55e', bg: '#f0fdf4' },
  somewhat: { label: 'Somewhat', color: '#eab308', bg: '#fefce8' },
  ineffective: { label: 'Didn\'t land', color: '#ef4444', bg: '#fef2f2' },
};

const RealTalkHistory = () => {
  const navigate = useNavigate();
  const [realTalks, setRealTalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [detail, setDetail] = useState(null);
  const [snackbar, setSnackbar] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      const res = await realTalkApi.list({ limit: 50, offset: 0 });
      setRealTalks(res.data.realTalks || []);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Real Talk History | Love Rescue';
    fetchHistory();
  }, [fetchHistory]);

  const handleViewDetail = async (id) => {
    try {
      const res = await realTalkApi.get(id);
      setDetail(res.data.realTalk);
      setSelectedId(id);
      setDetailDialog(true);
    } catch {
      setSnackbar('Could not load details');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar('Copied to clipboard');
  };

  const handleDelete = async (id) => {
    try {
      await realTalkApi.delete(id);
      setRealTalks(prev => prev.filter(rt => rt.id !== id));
      setDetailDialog(false);
      setSnackbar('Real Talk deleted');
    } catch {
      setSnackbar('Could not delete');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="bold" sx={{ flex: 1 }}>
          Real Talk History
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => navigate('/real-talk')}
          sx={{
            borderRadius: 3,
            textTransform: 'none',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
          }}
        >
          New
        </Button>
      </Box>

      {/* Empty state */}
      {realTalks.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontSize: '3rem', mb: 2 }}>💬</Typography>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
            No Real Talks yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Say the hard thing — without being the hard person.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/real-talk')}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            }}
          >
            Start Your First Real Talk
          </Button>
        </Box>
      )}

      {/* List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {realTalks.map(rt => {
          const badge = rt.effectiveness ? EFFECTIVENESS_BADGES[rt.effectiveness] : null;
          return (
            <Card
              key={rt.id}
              onClick={() => handleViewDetail(rt.id)}
              sx={{
                cursor: 'pointer',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1, mr: 1 }}>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mb: 0.5,
                      }}
                    >
                      {rt.issue}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Feeling: {rt.feeling}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(rt.createdAt)}
                    </Typography>
                  </Box>
                  {badge && (
                    <Chip
                      label={badge.label}
                      size="small"
                      sx={{
                        bgcolor: badge.bg,
                        color: badge.color,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog}
        onClose={() => setDetailDialog(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {detail && (
          <>
            <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
              Real Talk Detail
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  WHAT HAPPENED
                </Typography>
                <Typography variant="body1">{detail.issue}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  HOW YOU FELT
                </Typography>
                <Typography variant="body1">{detail.feeling}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  WHAT YOU NEEDED
                </Typography>
                <Typography variant="body1">{detail.need}</Typography>
              </Box>
              <Box
                sx={{
                  bgcolor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 2,
                  p: 2,
                  mb: 2,
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  GENTLE STARTUP
                </Typography>
                <Typography variant="body1" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                  &ldquo;{detail.generatedStartup}&rdquo;
                </Typography>
              </Box>
              {detail.effectiveness && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    EFFECTIVENESS
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={EFFECTIVENESS_BADGES[detail.effectiveness]?.label || detail.effectiveness}
                      size="small"
                      sx={{
                        bgcolor: EFFECTIVENESS_BADGES[detail.effectiveness]?.bg,
                        color: EFFECTIVENESS_BADGES[detail.effectiveness]?.color,
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
              )}
              <Typography variant="caption" color="text.secondary">
                {formatDate(detail.createdAt)}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <IconButton
                onClick={() => handleDelete(detail.id)}
                color="error"
                size="small"
              >
                <DeleteOutlineIcon />
              </IconButton>
              <Box sx={{ flex: 1 }} />
              <Button
                startIcon={<ContentCopyIcon />}
                onClick={() => handleCopy(detail.generatedStartup)}
                sx={{ textTransform: 'none' }}
              >
                Copy
              </Button>
              <Button
                onClick={() => setDetailDialog(false)}
                variant="contained"
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setSnackbar('')} sx={{ borderRadius: 2 }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RealTalkHistory;
