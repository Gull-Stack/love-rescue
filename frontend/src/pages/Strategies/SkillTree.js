import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Snackbar,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ChatIcon from '@mui/icons-material/Chat';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StarIcon from '@mui/icons-material/Star';
import { skillTreeApi } from '../../services/api';

const TREE_ICONS = {
  chat: <ChatIcon />,
  psychology: <PsychologyIcon />,
  favorite: <FavoriteIcon />,
};

const SkillTree = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trees, setTrees] = useState([]);
  const [error, setError] = useState(null);
  const [expandedTree, setExpandedTree] = useState(null);
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  const [practiceDialogOpen, setPracticeDialogOpen] = useState(false);
  const [practiceNotes, setPracticeNotes] = useState('');
  const [effectivenessRating, setEffectivenessRating] = useState(0);
  const [practicing, setPracticing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  useEffect(() => {
    document.title = 'Skill Tree | Love Rescue';
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      const res = await skillTreeApi.getTree();
      setTrees(res.data.trees);
      // Auto-expand first tree
      if (res.data.trees.length > 0 && !expandedTree) {
        setExpandedTree(res.data.trees[0].id);
      }
    } catch {
      setError('Failed to load skill tree');
    } finally {
      setLoading(false);
    }
  };

  const handlePractice = async () => {
    if (!selectedTechnique) return;
    setPracticing(true);
    try {
      const res = await skillTreeApi.practice(
        selectedTechnique.id,
        practiceNotes || undefined,
        effectivenessRating || undefined
      );
      const msg = res.data.justMastered
        ? `${selectedTechnique.name} MASTERED!`
        : `Practice logged (${res.data.uses}/${res.data.uses_required})`;
      setSnackbar({ open: true, message: msg });
      setPracticeDialogOpen(false);
      setPracticeNotes('');
      setEffectivenessRating(0);
      fetchTree(); // Refresh progress
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to log practice',
      });
    } finally {
      setPracticing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'mastered': return 'success';
      case 'in_progress': return 'primary';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'mastered': return 'Mastered';
      case 'in_progress': return 'In Progress';
      default: return 'Locked';
    }
  };

  const getTreeProgress = (tree) => {
    let total = 0;
    let mastered = 0;
    tree.levels.forEach((level) => {
      level.techniques.forEach((t) => {
        total++;
        if (t.status === 'mastered') mastered++;
      });
    });
    return { total, mastered, percent: total > 0 ? Math.round((mastered / total) * 100) : 0 };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column" gap={2}>
        <CircularProgress size={48} />
        <Typography color="text.secondary">Loading skill tree...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4, maxWidth: 600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <IconButton onClick={() => navigate('/strategies')} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="bold">
            Skill Tree
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Master relationship techniques across 3 paths. Practice each technique 5 times to unlock the next level.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Skill Trees */}
      {trees.map((tree) => {
        const progress = getTreeProgress(tree);
        return (
          <Accordion
            key={tree.id}
            expanded={expandedTree === tree.id}
            onChange={(_, expanded) => setExpandedTree(expanded ? tree.id : null)}
            sx={{
              mb: 2,
              borderRadius: '12px !important',
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                background: `linear-gradient(135deg, ${tree.color}15 0%, ${tree.color}08 100%)`,
                borderLeft: `4px solid ${tree.color}`,
              }}
            >
              <Box display="flex" alignItems="center" gap={1.5} width="100%">
                <Box sx={{ color: tree.color, display: 'flex' }}>
                  {TREE_ICONS[tree.icon]}
                </Box>
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {tree.name}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={progress.percent}
                      sx={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: `${tree.color}20`,
                        '& .MuiLinearProgress-bar': { bgcolor: tree.color, borderRadius: 3 },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 45 }}>
                      {progress.mastered}/{progress.total}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              {tree.levels.map((level) => (
                <Box key={level.level} sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 1 }}
                  >
                    Level {level.level}: {level.name}
                  </Typography>

                  {level.techniques.map((technique) => (
                    <Card
                      key={technique.id}
                      onClick={() => setSelectedTechnique(technique)}
                      sx={{
                        mb: 1,
                        cursor: 'pointer',
                        opacity: technique.status === 'locked' ? 0.6 : 1,
                        border: technique.status === 'mastered' ? '2px solid' : '1px solid',
                        borderColor: technique.status === 'mastered'
                          ? 'success.main'
                          : 'divider',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        '&:hover': {
                          transform: technique.status !== 'locked' ? 'translateY(-1px)' : 'none',
                          boxShadow: technique.status !== 'locked'
                            ? '0 4px 12px rgba(0,0,0,0.1)'
                            : 'none',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {technique.status === 'locked' && (
                            <LockIcon fontSize="small" color="disabled" />
                          )}
                          {technique.status === 'mastered' && (
                            <CheckCircleIcon fontSize="small" color="success" />
                          )}
                          {technique.status === 'in_progress' && (
                            <PlayArrowIcon fontSize="small" color="primary" />
                          )}
                          <Typography variant="subtitle2" fontWeight="bold" flex={1}>
                            {technique.name}
                          </Typography>
                          <Chip
                            label={getStatusLabel(technique.status)}
                            size="small"
                            color={getStatusColor(technique.status)}
                            variant={technique.status === 'locked' ? 'outlined' : 'filled'}
                          />
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {technique.description}
                        </Typography>

                        {technique.status === 'locked' && technique.prereqs.length > 0 && (
                          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                            Requires: {technique.prereqs.map((p) => {
                              const prereqTech = findTechniqueInTrees(trees, p);
                              return prereqTech?.name || p;
                            }).join(', ')}
                          </Typography>
                        )}

                        {technique.status !== 'locked' && (
                          <Box display="flex" alignItems="center" gap={1} mt={1}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min((technique.uses / technique.uses_required) * 100, 100)}
                              sx={{
                                flex: 1,
                                height: 4,
                                borderRadius: 2,
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {technique.uses}/{technique.uses_required}
                            </Typography>
                            {technique.effectiveness && (
                              <Chip
                                icon={<StarIcon sx={{ fontSize: 14 }} />}
                                label={`${technique.effectiveness}%`}
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{ height: 22 }}
                              />
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Technique Detail Dialog */}
      <Dialog
        open={!!selectedTechnique}
        onClose={() => setSelectedTechnique(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedTechnique && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box display="flex" alignItems="center" gap={1}>
                {selectedTechnique.status === 'mastered' && <CheckCircleIcon color="success" />}
                {selectedTechnique.status === 'in_progress' && <PlayArrowIcon color="primary" />}
                {selectedTechnique.status === 'locked' && <LockIcon color="disabled" />}
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedTechnique.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedTechnique.expert}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {selectedTechnique.description}
              </Typography>

              <Box sx={{ bgcolor: 'primary.50', p: 2, borderRadius: 2, mb: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Why It Works
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedTechnique.why}
                </Typography>
              </Box>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                How to Practice
              </Typography>
              {selectedTechnique.practice_steps.map((step, i) => (
                <Box key={i} display="flex" gap={1} mb={1}>
                  <Chip
                    label={i + 1}
                    size="small"
                    sx={{ minWidth: 28, height: 24, fontSize: 12 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {step}
                  </Typography>
                </Box>
              ))}

              {/* Progress */}
              {selectedTechnique.status !== 'locked' && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2">Progress</Typography>
                    <Typography variant="subtitle2" color="primary">
                      {selectedTechnique.uses}/{selectedTechnique.uses_required} practices
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((selectedTechnique.uses / selectedTechnique.uses_required) * 100, 100)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  {selectedTechnique.effectiveness && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Average effectiveness: {selectedTechnique.effectiveness}%
                    </Typography>
                  )}
                </Box>
              )}

              {/* Usage History */}
              {selectedTechnique.history && selectedTechnique.history.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Recent Practice
                  </Typography>
                  {selectedTechnique.history.slice(-3).reverse().map((entry, i) => (
                    <Box key={i} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(entry.date).toLocaleDateString()}
                        {entry.effectiveness && ` · ${entry.effectiveness}% effective`}
                      </Typography>
                      {entry.notes && (
                        <Typography variant="body2" sx={{ mt: 0.25 }}>
                          {entry.notes}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setSelectedTechnique(null)} color="inherit">
                Close
              </Button>
              {selectedTechnique.status !== 'locked' && (
                <Button
                  variant="contained"
                  onClick={() => setPracticeDialogOpen(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Log Practice
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Practice Log Dialog */}
      <Dialog
        open={practiceDialogOpen}
        onClose={() => setPracticeDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          Log Practice: {selectedTechnique?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            How did it go? (Optional)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="What happened when you tried this technique?"
            value={practiceNotes}
            onChange={(e) => setPracticeNotes(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle2" gutterBottom>
            How effective was it?
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Rating
              value={effectivenessRating}
              onChange={(_, value) => setEffectivenessRating(value)}
              max={5}
            />
            {effectivenessRating > 0 && (
              <Typography variant="caption" color="text.secondary">
                {effectivenessRating * 20}%
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPracticeDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePractice}
            disabled={practicing}
            sx={{ borderRadius: 2 }}
          >
            {practicing ? <CircularProgress size={20} /> : 'Log Practice'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

// Helper: find technique across all trees by id
function findTechniqueInTrees(trees, id) {
  for (const tree of trees) {
    for (const level of tree.levels) {
      for (const t of level.techniques) {
        if (t.id === id) return t;
      }
    }
  }
  return null;
}

export default SkillTree;
