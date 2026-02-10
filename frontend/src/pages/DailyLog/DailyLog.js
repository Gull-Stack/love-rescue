import React, { useState, useEffect, useRef } from 'react';
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
import { hapticSuccess } from '../../utils/haptics';
import { logsApi, streaksApi } from '../../services/api';
import DailyInsight from '../../components/common/DailyInsight';
import DailyVideo from '../../components/common/DailyVideo';
import StreakCounter from '../../components/gamification/StreakCounter';
import CelebrationToast from '../../components/gamification/CelebrationToast';
import { celebration } from '../../components/gamification/Confetti';
import { PartnerStatusCard, MatchupScoreCard } from '../../components/gamification/PartnerActivity';
import MoodEmojiSlider from '../../components/gamification/MoodEmojiSlider';
import EmotionChips from '../../components/gamification/EmotionChips';
import PromptCards from '../../components/gamification/PromptCards';
import StreakFlames from '../../components/gamification/StreakFlames';
import SaveCheckmark from '../../components/gamification/SaveCheckmark';
import { useAuth } from '../../contexts/AuthContext';
import { isPremiumUser } from '../../utils/featureGating';
import PremiumGate from '../../components/common/PremiumGate';

const DailyLog = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const premium = isPremiumUser(user);
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
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [showSaveCheck, setShowSaveCheck] = useState(false);

  // Gamification state
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    xp: 0,
    level: 1,
    levelName: 'Relationship Rookie',
    levelProgress: 0,
    xpToNextLevel: 100,
    streakAlive: false,
    loggedToday: false,
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState('dailyLog');
  const [streakMilestone, setStreakMilestone] = useState(null);

  useEffect(() => {
    document.title = 'Daily Log | Love Rescue';
    fetchTodayData();
    fetchStreakData();
  }, []); // Intentional: run once on mount

  const fetchStreakData = async () => {
    try {
      const res = await streaksApi.getStreak();
      setStreakData(res.data);
    } catch (err) {
      console.error('Failed to fetch streak data:', err);
    }
  };

  const fetchTodayData = async () => {
    try {
      const promptRes = await logsApi.getPrompt();
      setPrompt(promptRes.data.prompt);
      setHasLoggedToday(promptRes.data.hasLoggedToday);

      if (promptRes.data.todayLog) {
        const tl = promptRes.data.todayLog;
        setFormData((prev) => ({
          ...prev,
          positiveCount: tl.positiveCount || 0,
          negativeCount: tl.negativeCount || 0,
          journalEntry: tl.journalEntry || prev.journalEntry,
          closenessScore: tl.closenessScore || prev.closenessScore,
          mood: tl.mood || prev.mood,
        }));
      }

      // Try to get full today's log (use local date, not UTC which can differ)
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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

  const checkStreakMilestones = (newStreak) => {
    const milestones = [7, 14, 21, 30, 60, 90];
    for (const milestone of milestones) {
      if (newStreak === milestone) {
        return milestone;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    const wasFirstLogToday = !hasLoggedToday;

    try {
      await logsApi.submitDaily({ ...formData, emotions: selectedEmotions });
      hapticSuccess();
      setShowSaveCheck(true);
      setHasLoggedToday(true);

      // 🎉 GAMIFICATION: Fire confetti and celebration!
      if (wasFirstLogToday) {
        celebration(); // Fire confetti!
        
        // Refresh streak data to get updated values
        const streakRes = await streaksApi.getStreak();
        const newStreak = streakRes.data;
        setStreakData(newStreak);

        // Check for streak milestones
        const milestone = checkStreakMilestones(newStreak.currentStreak);
        if (milestone) {
          setCelebrationType('streak');
          setStreakMilestone(milestone);
        } else {
          setCelebrationType('dailyLog');
          setStreakMilestone(null);
        }
        
        setShowCelebration(true);
      }
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

  const closenessMarks = [
    { value: 1, label: '😶' },
    { value: 5, label: '🤝' },
    { value: 10, label: '💕' },
  ];

  return (
    <Box sx={{ pb: isMobile ? '80px' : 0, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Daily Log
      </Typography>
      <Typography color="text.secondary" paragraph>
        Track your daily interactions and reflect on your relationship.
      </Typography>

      {/* Save Checkmark Animation */}
      <SaveCheckmark show={showSaveCheck} onDone={() => { setShowSaveCheck(false); setSuccess('Daily log saved successfully!'); }} />

      {/* 🎉 CELEBRATION TOAST */}
      <CelebrationToast
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        type={celebrationType}
        streakDay={streakMilestone}
      />

      {success && (
        <Alert severity="success" sx={{ mb: 2, bgcolor: '#fce4ec', color: '#c62828', '& .MuiAlert-icon': { color: '#f5576c' } }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 1. 🔥 STREAK FLAMES */}
      <Box sx={{ mb: 2 }}>
        <StreakFlames streak={streakData.currentStreak} />
      </Box>

      {/* 2. QUICK SLIDERS CARD — Mood + Closeness + Interactions */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          {/* Mood Emoji Slider */}
          <Typography variant="h6" gutterBottom>
            How are you feeling?
          </Typography>
          <Box sx={{ mb: 3 }}>
            <MoodEmojiSlider
              value={formData.mood}
              onChange={(value) => setFormData({ ...formData, mood: value })}
            />
          </Box>

          {/* Closeness Slider (FREE — no PremiumGate) */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Emotional Closeness
            </Typography>
            <Slider
              value={formData.closenessScore}
              onChange={(_, value) => setFormData({ ...formData, closenessScore: value })}
              min={1}
              max={10}
              marks={closenessMarks}
              valueLabelDisplay="auto"
              color="secondary"
              sx={{ '& .MuiSlider-markLabel': { fontSize: '1.2rem' } }}
            />
          </Box>

          {/* Compact Interaction Counter */}
          <Typography variant="subtitle2" gutterBottom>
            Interactions
          </Typography>
          <Box display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
            {/* Positive */}
            <Box display="flex" alignItems="center" gap={1} sx={{ flex: 1 }}>
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={() => handleCountChange('positiveCount', -1)}
                disabled={formData.positiveCount === 0}
                sx={{ minWidth: 36, minHeight: 36, p: 0 }}
              >
                <RemoveIcon fontSize="small" />
              </Button>
              <Typography variant="h5" color="success.main" sx={{ minWidth: 32, textAlign: 'center' }}>
                {formData.positiveCount}
              </Typography>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => handleCountChange('positiveCount', 1)}
                sx={{ minWidth: 36, minHeight: 36, p: 0 }}
              >
                <AddIcon fontSize="small" />
              </Button>
              <Typography variant="caption" color="success.main">+</Typography>
            </Box>

            {/* Ratio chip inline */}
            <Chip
              label={`${ratio}:1`}
              color={ratioColor}
              size="small"
              sx={{ fontWeight: 'bold' }}
            />

            {/* Negative */}
            <Box display="flex" alignItems="center" gap={1} sx={{ flex: 1, justifyContent: 'flex-end' }}>
              <Typography variant="caption" color="error.main">−</Typography>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleCountChange('negativeCount', -1)}
                disabled={formData.negativeCount === 0}
                sx={{ minWidth: 36, minHeight: 36, p: 0 }}
              >
                <RemoveIcon fontSize="small" />
              </Button>
              <Typography variant="h5" color="error.main" sx={{ minWidth: 32, textAlign: 'center' }}>
                {formData.negativeCount}
              </Typography>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => handleCountChange('negativeCount', 1)}
                sx={{ minWidth: 36, minHeight: 36, p: 0 }}
              >
                <AddIcon fontSize="small" />
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 3. EMOTION CHIPS */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <EmotionChips selected={selectedEmotions} onChange={setSelectedEmotions} />
        </CardContent>
      </Card>

      {/* 4. JOURNAL + PROMPT CARDS (Premium) */}
      <Box sx={{ mb: 2 }}>
        <PremiumGate
          feature="daily_log_journal"
          title="Daily Journal — Premium"
          subtitle="Reflect on your relationship with guided journal prompts. Upgrade to unlock."
        >
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Journal Entry
            </Typography>

            <Box sx={{ mb: 2 }}>
              <PromptCards onSelect={(text) => setFormData(prev => ({
                ...prev,
                journalEntry: prev.journalEntry ? prev.journalEntry + '\n\n' + text + '\n' : text + '\n',
              }))} />
            </Box>

            {prompt && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                <Typography variant="overline" sx={{ color: 'primary.contrastText' }}>
                  Today's Prompt
                </Typography>
                <Typography variant="body1" sx={{ color: 'primary.contrastText', fontWeight: 500 }}>
                  {prompt.prompt}
                </Typography>
              </Box>
            )}
            <TextField
              multiline
              minRows={4}
              maxRows={8}
              fullWidth
              placeholder={prompt ? "Respond to today's prompt..." : "Reflect on your day together..."}
              value={formData.journalEntry}
              onChange={(e) => setFormData({ ...formData, journalEntry: e.target.value })}
            />
          </CardContent>
        </Card>
        </PremiumGate>
      </Box>

      {/* 5. STREAK COUNTER + XP */}
      <Box sx={{ mb: 2 }}>
        <StreakCounter
          currentStreak={streakData.currentStreak}
          longestStreak={streakData.longestStreak}
          xp={streakData.xp}
          level={streakData.level}
          levelName={streakData.levelName}
          levelProgress={streakData.levelProgress}
          xpToNextLevel={streakData.xpToNextLevel}
          streakAlive={streakData.streakAlive || streakData.loggedToday}
        />
      </Box>

      {/* 6. PARTNER ACTIVITY */}
      <Box sx={{ mb: 2 }}>
        <PartnerStatusCard />
      </Box>
      <Box sx={{ mb: 2 }}>
        <MatchupScoreCard />
      </Box>

      {/* 7. DAILY INSIGHT & VIDEO */}
      <Box sx={{ mb: 2 }}>
        <DailyInsight />
      </Box>
      <Box sx={{ mb: 2 }}>
        <DailyVideo />
      </Box>

      {/* 8. SAVE BUTTON (fixed on mobile) */}
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
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 'bold',
            background: hasLoggedToday 
              ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              : 'linear-gradient(135deg, #FF6B35 0%, #FF8B5A 100%)',
            '&:hover': {
              background: hasLoggedToday
                ? 'linear-gradient(135deg, #e080e8 0%, #e04460 100%)'
                : 'linear-gradient(135deg, #E55A25 0%, #FF7B4A 100%)',
            },
          }}
        >
          {saving ? 'Saving...' : hasLoggedToday ? '✓ Update Log' : '🔥 Save Log & Keep Streak!'}
        </Button>
      </Box>
    </Box>
  );
};

export default DailyLog;
