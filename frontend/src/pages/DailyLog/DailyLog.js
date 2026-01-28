import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Slider,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SaveIcon from '@mui/icons-material/Save';
import { logsApi } from '../../services/api';

const DailyLog = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    positiveCount: 0,
    negativeCount: 0,
    journalEntry: '',
    closenessScore: 5,
    mood: 5,
  });

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    try {
      const promptRes = await logsApi.getPrompt();
      setPrompt(promptRes.data.prompt);
      setHasLoggedToday(promptRes.data.hasLoggedToday);

      if (promptRes.data.todayLog) {
        setFormData((prev) => ({
          ...prev,
          positiveCount: promptRes.data.todayLog.positiveCount || 0,
          negativeCount: promptRes.data.todayLog.negativeCount || 0,
        }));
      }

      // Try to get full today's log
      const today = new Date().toISOString().split('T')[0];
      try {
        const logRes = await logsApi.getDaily(today);
        if (logRes.data.log) {
          setFormData({
            positiveCount: logRes.data.log.positiveCount || 0,
            negativeCount: logRes.data.log.negativeCount || 0,
            journalEntry: logRes.data.log.journalEntry || '',
            closenessScore: logRes.data.log.closenessScore || 5,
            mood: logRes.data.log.mood || 5,
          });
        }
      } catch (e) {
        // No log for today yet
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCountChange = (field, delta) => {
    setFormData((prev) => ({
      ...prev,
      [field]: Math.max(0, prev[field] + delta),
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await logsApi.submitDaily(formData);
      setSuccess('Daily log saved successfully!');
      setHasLoggedToday(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save log');
    } finally {
      setSaving(false);
    }
  };

  const ratio =
    formData.negativeCount > 0
      ? (formData.positiveCount / formData.negativeCount).toFixed(1)
      : formData.positiveCount > 0
      ? '∞'
      : '0';

  const ratioColor =
    formData.negativeCount === 0 || parseFloat(ratio) >= 5
      ? 'success'
      : parseFloat(ratio) >= 3
      ? 'warning'
      : 'error';

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: isMobile ? '80px' : 0 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Daily Log
      </Typography>
      <Typography color="text.secondary" paragraph>
        Track your daily interactions and reflect on your relationship.
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Today's Prompt */}
      {prompt && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="overline">Today's Prompt</Typography>
            <Typography variant="h6">{prompt.prompt}</Typography>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Interaction Counter */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Interaction Counter
              </Typography>

              {/* Positive Interactions */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  Positive Interactions
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => handleCountChange('positiveCount', -1)}
                    disabled={formData.positiveCount === 0}
                    sx={{ minWidth: 48, minHeight: 48, p: 0 }}
                  >
                    <RemoveIcon />
                  </Button>
                  <Typography variant="h4" sx={{ minWidth: 60, textAlign: 'center' }}>
                    {formData.positiveCount}
                  </Typography>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleCountChange('positiveCount', 1)}
                    sx={{ minWidth: 48, minHeight: 48, p: 0 }}
                  >
                    <AddIcon />
                  </Button>
                </Box>
              </Box>

              {/* Negative Interactions */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="error.main" gutterBottom>
                  Negative Interactions
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleCountChange('negativeCount', -1)}
                    disabled={formData.negativeCount === 0}
                    sx={{ minWidth: 48, minHeight: 48, p: 0 }}
                  >
                    <RemoveIcon />
                  </Button>
                  <Typography variant="h4" sx={{ minWidth: 60, textAlign: 'center' }}>
                    {formData.negativeCount}
                  </Typography>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleCountChange('negativeCount', 1)}
                    sx={{ minWidth: 48, minHeight: 48, p: 0 }}
                  >
                    <AddIcon />
                  </Button>
                </Box>
              </Box>

              {/* Ratio Display */}
              <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={2}>
                <Typography variant="overline">Your Ratio</Typography>
                <Typography variant="h3" color={`${ratioColor}.main`}>
                  {ratio}:1
                </Typography>
                <Chip
                  label={
                    parseFloat(ratio) >= 5 || ratio === '∞'
                      ? 'Great!'
                      : parseFloat(ratio) >= 3
                      ? 'Good'
                      : 'Needs Work'
                  }
                  color={ratioColor}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Mood & Closeness */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                How are you feeling?
              </Typography>

              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Mood (1-10)
                </Typography>
                <Slider
                  value={formData.mood}
                  onChange={(_, value) => setFormData({ ...formData, mood: value })}
                  min={1}
                  max={10}
                  marks
                  valueLabelDisplay="on"
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Emotional Closeness (1-10)
                </Typography>
                <Slider
                  value={formData.closenessScore}
                  onChange={(_, value) => setFormData({ ...formData, closenessScore: value })}
                  min={1}
                  max={10}
                  marks
                  valueLabelDisplay="on"
                  color="secondary"
                />
              </Box>
            </CardContent>
          </Card>

          {/* Journal Entry */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Journal Entry
              </Typography>
              <TextField
                multiline
                minRows={3}
                maxRows={6}
                fullWidth
                placeholder="Reflect on your day together..."
                value={formData.journalEntry}
                onChange={(e) => setFormData({ ...formData, journalEntry: e.target.value })}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box
        sx={{
          mt: 3,
          textAlign: 'center',
          ...(isMobile && {
            position: 'fixed',
            bottom: 56,
            left: 0,
            right: 0,
            p: 2,
            bgcolor: 'background.paper',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
            zIndex: 1099,
          }),
        }}
      >
        <Button
          variant="contained"
          size="large"
          fullWidth={isMobile}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Saving...' : hasLoggedToday ? 'Update Log' : 'Save Log'}
        </Button>
      </Box>
    </Box>
  );
};

export default DailyLog;
