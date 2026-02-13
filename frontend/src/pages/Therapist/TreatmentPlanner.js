import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Slider,
  TextField, Select, MenuItem, FormControl, InputLabel, Divider,
  Alert, Skeleton, IconButton, Snackbar, LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import therapistService from '../../services/therapistService';
import { ModuleCard } from '../../components/therapist';

const APPROACHES = ['EFT', 'Gottman', 'CBT', 'Psychodynamic', 'Integrative'];

const TreatmentPlanner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [approach, setApproach] = useState('Integrative');
  const [pace, setPace] = useState(1);
  const [moduleLibrary, setModuleLibrary] = useState([]);
  const [planModules, setPlanModules] = useState([]);
  const [moduleNotes, setModuleNotes] = useState({});
  const [existingPlan, setExistingPlan] = useState(null);

  useEffect(() => {
    document.title = 'Treatment Planner | Love Rescue';
    fetchData();
  }, [id]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [libRes, planRes] = await Promise.all([
        therapistService.getModuleLibrary(),
        therapistService.getTreatmentPlan(id),
      ]);
      setModuleLibrary(libRes.data.modules || []);
      if (planRes.data.plan) {
        const plan = planRes.data.plan;
        setExistingPlan(plan);
        setPlanModules(plan.modules || []);
        setApproach(plan.approach || 'Integrative');
        setPace(plan.pace || 1);
        setModuleNotes(plan.notes || {});
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load treatment planner');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleAutoRecommend = async () => {
    try {
      const res = await therapistService.getRecommendedModules(approach);
      const recommended = res.data.modules || [];
      setPlanModules(recommended);
      setSnackbar(`Auto-recommended ${recommended.length} modules for ${approach}`);
    } catch {
      setSnackbar('Failed to get recommendations');
    }
  };

  const handleAddModule = (mod) => {
    if (planModules.find(m => m.id === mod.id)) return;
    setPlanModules(prev => [...prev, mod]);
  };

  const handleRemoveModule = (mod) => {
    setPlanModules(prev => prev.filter(m => m.id !== mod.id));
    setModuleNotes(prev => {
      const next = { ...prev };
      delete next[mod.id];
      return next;
    });
  };

  const handleMoveModule = (index, direction) => {
    const next = [...planModules];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPlanModules(next);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await therapistService.saveTreatmentPlan(id, {
        modules: planModules,
        approach,
        pace,
        notes: moduleNotes,
      });
      setSnackbar('Treatment plan saved!');
    } catch {
      setSnackbar('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={40} />
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}><Skeleton variant="rounded" height={400} /></Grid>
          <Grid item xs={12} md={6}><Skeleton variant="rounded" height={400} /></Grid>
        </Grid>
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

  // Filter library to exclude already-added modules
  const planIds = new Set(planModules.map(m => m.id));
  const available = moduleLibrary.filter(m => !planIds.has(m.id));

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate(`/therapist/clients/${id}`)} sx={{ minWidth: 44, minHeight: 44 }} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight={600} sx={{ flex: 1 }}>Treatment Planner</Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ minHeight: 44 }}
        >
          {saving ? 'Saving...' : 'Save Plan'}
        </Button>
      </Box>

      {/* Customization Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="approach-label">Approach</InputLabel>
                <Select
                  labelId="approach-label"
                  value={approach}
                  label="Approach"
                  onChange={(e) => setApproach(e.target.value)}
                >
                  {APPROACHES.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">Pace: {pace}x</Typography>
              <Slider
                value={pace}
                onChange={(_, v) => setPace(v)}
                min={0.5}
                max={1.5}
                step={0.1}
                marks={[
                  { value: 0.5, label: '0.5x' },
                  { value: 1, label: '1x' },
                  { value: 1.5, label: '1.5x' },
                ]}
                valueLabelDisplay="auto"
                aria-label="Pace"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AutoFixHighIcon />}
                onClick={handleAutoRecommend}
                sx={{ minHeight: 44 }}
              >
                Auto-Recommend
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Module Library */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Module Library ({available.length})</Typography>
          <Box sx={{ maxHeight: 600, overflow: 'auto', pr: 1 }}>
            {available.length === 0 ? (
              <Card><CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">All modules added to plan</Typography>
              </CardContent></Card>
            ) : (
              available.map(mod => (
                <ModuleCard key={mod.id} module={mod} onAdd={handleAddModule} />
              ))
            )}
          </Box>
        </Grid>

        {/* Current Plan */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Current Plan ({planModules.length} modules)
          </Typography>
          <Box sx={{ maxHeight: 600, overflow: 'auto', pr: 1 }}>
            {planModules.length === 0 ? (
              <Card><CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">Add modules from the library →</Typography>
              </CardContent></Card>
            ) : (
              planModules.map((mod, idx) => (
                <Box key={mod.id}>
                  <ModuleCard
                    module={mod}
                    inPlan
                    onRemove={handleRemoveModule}
                    order={idx + 1}
                    completed={mod.completed}
                    draggable
                  />
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Add notes for this module..."
                    value={moduleNotes[mod.id] || ''}
                    onChange={(e) => setModuleNotes(prev => ({ ...prev, [mod.id]: e.target.value }))}
                    sx={{ mb: 1.5, mt: -0.5 }}
                    inputProps={{ 'aria-label': `Notes for ${mod.name}` }}
                  />
                </Box>
              ))
            )}
          </Box>

          {/* Progress */}
          {planModules.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Plan Progress: {planModules.filter(m => m.completed).length}/{planModules.length} completed
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(planModules.filter(m => m.completed).length / planModules.length) * 100}
                sx={{ mt: 0.5, height: 8, borderRadius: 4 }}
              />
            </Box>
          )}
        </Grid>
      </Grid>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </Box>
  );
};

export default TreatmentPlanner;
