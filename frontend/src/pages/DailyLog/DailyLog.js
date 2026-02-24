import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Slider,
  IconButton,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { hapticSuccess } from '../../utils/haptics';
import { logsApi, streaksApi, gratitudeApi } from '../../services/api';
import CelebrationToast from '../../components/gamification/CelebrationToast';
import { celebration } from '../../components/gamification/Confetti';
import MoodEmojiSlider from '../../components/gamification/MoodEmojiSlider';
import EmotionChips from '../../components/gamification/EmotionChips';
import StreakFlames from '../../components/gamification/StreakFlames';
import SaveCheckmark from '../../components/gamification/SaveCheckmark';
import { useAuth } from '../../contexts/AuthContext';

const TOTAL_CARDS = 7;

const cardGradients = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
];

// White-on-gradient styling for MUI components
const whiteSliderSx = {
  color: '#fff',
  '& .MuiSlider-thumb': {
    bgcolor: '#fff',
    width: 28,
    height: 28,
    '&:hover, &.Mui-active': { boxShadow: '0 0 0 8px rgba(255,255,255,0.2)' },
  },
  '& .MuiSlider-track': { bgcolor: '#fff', border: 'none' },
  '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.3)' },
  '& .MuiSlider-mark': { bgcolor: 'rgba(255,255,255,0.5)' },
  '& .MuiSlider-markLabel': { color: '#fff', fontSize: '1.4rem' },
  '& .MuiSlider-valueLabel': { bgcolor: 'rgba(0,0,0,0.6)' },
};

const whiteTextFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.8)' },
    '&.Mui-focused fieldset': { borderColor: '#fff' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#fff' },
  '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.5)' },
};

const DailyLog = () => {
  const { user, relationship } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const [direction, setDirection] = useState(0); // -1 = left, 1 = right, 0 = none
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    positiveCount: 0,
    negativeCount: 0,
    journalEntry: '',
    closenessScore: 5,
    mood: 5,
  });
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [gratitudeText, setGratitudeText] = useState('');
  const [showSaveCheck, setShowSaveCheck] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  // Touch handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Auto-advance timer for mood card
  const autoAdvanceTimer = useRef(null);
  const moodSelected = useRef(false);

  // Prevent double-submit
  const hasSubmittedRef = useRef(false);

  const partnerName = relationship?.partner?.firstName || 'your partner';

  useEffect(() => {
    document.title = 'Daily Log | Love Rescue';
    fetchTodayData();
    fetchStreakData();
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
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

  const handleSubmit = useCallback(async () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setSaving(true);
    setError('');

    const wasFirstLogToday = !hasLoggedToday;

    try {
      await logsApi.submitDaily({ ...formData, emotions: selectedEmotions });

      // Submit gratitude entry if provided
      if (gratitudeText.trim()) {
        try {
          await gratitudeApi.submitEntry({ text: gratitudeText.trim() });
        } catch (e) {
          console.error('Failed to save gratitude:', e);
        }
      }

      hapticSuccess();
      setShowSaveCheck(true);
      setHasLoggedToday(true);
      setSubmitted(true);

      if (wasFirstLogToday) {
        celebration();

        const streakRes = await streaksApi.getStreak();
        const newStreak = streakRes.data;
        setStreakData(newStreak);

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
      hasSubmittedRef.current = false;
    } finally {
      setSaving(false);
    }
  }, [formData, selectedEmotions, gratitudeText, hasLoggedToday]);

  // Auto-submit when reaching the DONE card
  useEffect(() => {
    if (currentCard === 6 && !submitted && !saving) {
      handleSubmit();
    }
  }, [currentCard, submitted, saving, handleSubmit]);

  // Card navigation
  const goToCard = useCallback((target) => {
    if (isTransitioning || target < 0 || target >= TOTAL_CARDS) return;
    setDirection(target > currentCard ? 1 : -1);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentCard(target);
      setDirection(0);
      setIsTransitioning(false);
    }, 300);
  }, [currentCard, isTransitioning]);

  const goNext = useCallback(() => goToCard(currentCard + 1), [currentCard, goToCard]);
  const goBack = useCallback(() => goToCard(currentCard - 1), [currentCard, goToCard]);

  // Touch swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    // Only swipe if horizontal movement is dominant
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0 && currentCard < TOTAL_CARDS - 1) {
        goNext();
      } else if (deltaX > 0 && currentCard > 0) {
        goBack();
      }
    }
  };

  // Handle mood change with auto-advance
  const handleMoodChange = (value) => {
    setFormData((prev) => ({ ...prev, mood: value }));
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    moodSelected.current = true;
    autoAdvanceTimer.current = setTimeout(() => {
      if (moodSelected.current) goNext();
    }, 1500);
  };

  // Progress dots
  const ProgressDots = () => (
    <Box sx={{
      display: 'flex', justifyContent: 'center', gap: 1,
      pt: 2, pb: 1,
    }}>
      {Array.from({ length: TOTAL_CARDS }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: i === currentCard ? 12 : 8,
            height: i === currentCard ? 12 : 8,
            borderRadius: '50%',
            bgcolor: i === currentCard ? '#fff' : 'transparent',
            border: '2px solid #fff',
            transition: 'all 0.3s ease',
            opacity: i <= currentCard ? 1 : 0.4,
          }}
        />
      ))}
    </Box>
  );

  // Card wrapper with gradient background
  const CardShell = ({ children, gradient, showBack, showSkip, onSkip }) => (
    <Box
      sx={{
        height: 'calc(100vh - 120px)',
        height: 'calc(100dvh - 120px)',
        background: gradient,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top bar: back + dots + skip */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1, pt: 1 }}>
        {showBack ? (
          <IconButton onClick={goBack} sx={{ color: '#fff' }}>
            <ArrowBackIcon />
          </IconButton>
        ) : <Box sx={{ width: 48 }} />}

        <Box sx={{ flex: 1 }}>
          <ProgressDots />
        </Box>

        {showSkip ? (
          <Button
            onClick={onSkip || goNext}
            sx={{ color: '#fff', fontWeight: 600, textTransform: 'none', minWidth: 'auto' }}
          >
            Skip
          </Button>
        ) : <Box sx={{ width: 48 }} />}
      </Box>

      {/* Card content */}
      <Box sx={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        px: 3, pb: 4,
      }}>
        {children}
      </Box>
    </Box>
  );

  // Next button (white on gradient)
  const NextButton = ({ label = 'Next', onClick }) => (
    <Button
      variant="contained"
      onClick={onClick || goNext}
      sx={{
        mt: 4, px: 6, py: 1.5,
        bgcolor: '#fff',
        color: '#333',
        fontWeight: 'bold',
        fontSize: '1.1rem',
        borderRadius: 3,
        textTransform: 'none',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
      }}
    >
      {label}
    </Button>
  );

  // ---- CARD RENDERS ----

  const MoodCard = () => (
    <CardShell gradient={cardGradients[0]} showBack={false}>
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 4, textAlign: 'center' }}>
        How are you feeling?
      </Typography>
      <Box sx={{ width: '100%', maxWidth: 320 }}>
        <MoodEmojiSlider
          value={formData.mood}
          onChange={handleMoodChange}
        />
      </Box>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 3 }}>
        Auto-advances after selection
      </Typography>
    </CardShell>
  );

  const ConnectionCard = () => (
    <CardShell gradient={cardGradients[1]} showBack>
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 2, textAlign: 'center' }}>
        How close did you feel to {partnerName} today?
      </Typography>
      <Box sx={{ width: '100%', maxWidth: 340, mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: '2rem' }}>🧊</Typography>
          <Typography sx={{ fontSize: '2rem' }}>🔥</Typography>
        </Box>
        <Slider
          value={formData.closenessScore}
          onChange={(_, value) => setFormData((prev) => ({ ...prev, closenessScore: value }))}
          min={0}
          max={10}
          marks
          valueLabelDisplay="auto"
          sx={whiteSliderSx}
        />
        <Typography variant="h2" sx={{ color: '#fff', textAlign: 'center', mt: 2, fontWeight: 700 }}>
          {formData.closenessScore}
        </Typography>
      </Box>
      <NextButton />
    </CardShell>
  );

  const InteractionsCard = () => (
    <CardShell gradient={cardGradients[2]} showBack>
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 4, textAlign: 'center' }}>
        Today's moments
      </Typography>
      <Box sx={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        {/* Positive */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
            Positive
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => handleCountChange('positiveCount', -1)}
              disabled={formData.positiveCount === 0}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', width: 56, height: 56,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' },
              }}
            >
              <RemoveIcon sx={{ fontSize: 28 }} />
            </IconButton>
            <Typography variant="h2" sx={{ color: '#fff', fontWeight: 700, minWidth: 48, textAlign: 'center' }}>
              {formData.positiveCount}
            </Typography>
            <IconButton
              onClick={() => handleCountChange('positiveCount', 1)}
              sx={{
                bgcolor: '#fff', color: '#4facfe', width: 56, height: 56,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              }}
            >
              <AddIcon sx={{ fontSize: 28 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Difficult */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
            Difficult
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => handleCountChange('negativeCount', -1)}
              disabled={formData.negativeCount === 0}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', width: 56, height: 56,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' },
              }}
            >
              <RemoveIcon sx={{ fontSize: 28 }} />
            </IconButton>
            <Typography variant="h2" sx={{ color: '#fff', fontWeight: 700, minWidth: 48, textAlign: 'center' }}>
              {formData.negativeCount}
            </Typography>
            <IconButton
              onClick={() => handleCountChange('negativeCount', 1)}
              sx={{
                bgcolor: '#fff', color: '#f5576c', width: 56, height: 56,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              }}
            >
              <AddIcon sx={{ fontSize: 28 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>
      <NextButton />
    </CardShell>
  );

  const GratitudeCard = () => (
    <CardShell gradient={cardGradients[3]} showBack showSkip>
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 2, textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
        One thing you appreciate about {partnerName}
      </Typography>
      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', mb: 3, textAlign: 'center', textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
        Optional — but noticing the good rewires everything
      </Typography>
      <TextField
        multiline
        maxRows={2}
        fullWidth
        placeholder={`What did ${partnerName} do that mattered?`}
        value={gratitudeText}
        onChange={(e) => setGratitudeText(e.target.value)}
        sx={{ ...whiteTextFieldSx, maxWidth: 400 }}
      />
      <NextButton />
    </CardShell>
  );

  const EmotionsCard = () => (
    <CardShell gradient={cardGradients[4]} showBack showSkip>
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 3, textAlign: 'center' }}>
        What did you feel?
      </Typography>
      <Box sx={{
        maxWidth: 400, width: '100%',
        '& .MuiChip-root': {
          borderColor: 'rgba(255,255,255,0.6)',
          color: '#fff',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
        },
        '& .MuiChip-filled': {
          bgcolor: 'rgba(255,255,255,0.25)',
          borderColor: '#fff',
          fontWeight: 'bold',
        },
        '& .MuiTypography-root': { color: '#fff' },
      }}>
        <EmotionChips selected={selectedEmotions} onChange={setSelectedEmotions} />
      </Box>
      <NextButton />
    </CardShell>
  );

  const ReflectionCard = () => (
    <CardShell gradient={cardGradients[5]} showBack showSkip>
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 2, textAlign: 'center' }}>
        Anything to remember about today?
      </Typography>
      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3, textAlign: 'center' }}>
        Optional — a sentence is enough
      </Typography>
      <TextField
        multiline
        rows={4}
        fullWidth
        placeholder="What happened, how you felt, what you learned..."
        value={formData.journalEntry}
        onChange={(e) => setFormData((prev) => ({ ...prev, journalEntry: e.target.value }))}
        sx={{ ...whiteTextFieldSx, maxWidth: 400 }}
      />
      <NextButton label="Finish" />
    </CardShell>
  );

  const DoneCard = () => (
    <CardShell gradient={cardGradients[6]} showBack={!hasLoggedToday || submitted}>
      <Box sx={{ textAlign: 'center' }}>
        {saving ? (
          <CircularProgress sx={{ color: '#fff', mb: 3 }} size={60} />
        ) : (
          <>
            <SaveCheckmark show={showSaveCheck} onDone={() => setShowSaveCheck(false)} />
            <Typography sx={{ fontSize: '4rem', mb: 2 }}>✓</Typography>
          </>
        )}
        <Typography variant="h3" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
          {saving ? 'Saving...' : error ? 'Something went wrong' : 'Done'}
        </Typography>

        {error && (
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
            {error}
          </Typography>
        )}

        {!saving && !error && (
          <>
            <Box sx={{ mb: 3 }}>
              <StreakFlames streak={streakData.currentStreak} />
            </Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
              Day {streakData.currentStreak} 🔥
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              See you tomorrow.
            </Typography>
          </>
        )}

        {error && (
          <Button
            variant="contained"
            onClick={() => { hasSubmittedRef.current = false; handleSubmit(); }}
            sx={{
              mt: 3, bgcolor: '#fff', color: '#333', fontWeight: 'bold',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
            }}
          >
            Retry
          </Button>
        )}
      </Box>
    </CardShell>
  );

  // If already logged today, show DONE card with edit option
  const AlreadyLoggedCard = () => (
    <Box
      sx={{
        minHeight: 'calc(100vh - 120px)',
        background: cardGradients[6],
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
      }}
    >
      <Typography sx={{ fontSize: '4rem', mb: 2 }}>✓</Typography>
      <Typography variant="h3" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
        Logged today
      </Typography>
      <Box sx={{ mb: 3 }}>
        <StreakFlames streak={streakData.currentStreak} />
      </Box>
      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
        Day {streakData.currentStreak} 🔥
      </Typography>
      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 4 }}>
        See you tomorrow.
      </Typography>
      <Button
        variant="contained"
        startIcon={<EditIcon />}
        onClick={() => {
          setHasLoggedToday(false);
          setSubmitted(false);
          hasSubmittedRef.current = false;
          setCurrentCard(0);
        }}
        sx={{
          bgcolor: '#fff', color: '#333', fontWeight: 'bold',
          px: 4, py: 1.5, borderRadius: 3, textTransform: 'none',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
        }}
      >
        Edit today's log
      </Button>
    </Box>
  );

  const cards = [MoodCard, ConnectionCard, InteractionsCard, GratitudeCard, EmotionsCard, ReflectionCard, DoneCard];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  // Already logged today — show done card with edit option
  if (hasLoggedToday && !submitted && currentCard === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <CelebrationToast
          open={showCelebration}
          onClose={() => setShowCelebration(false)}
          type={celebrationType}
          streakDay={streakMilestone}
        />
        <AlreadyLoggedCard />
      </Box>
    );
  }

  const CurrentCardComponent = cards[currentCard];

  return (
    <Box
      sx={{ maxWidth: 600, mx: 'auto' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Celebration Toast */}
      <CelebrationToast
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        type={celebrationType}
        streakDay={streakMilestone}
      />

      {/* Card with slide transition */}
      <Box
        sx={{
          transform: direction !== 0
            ? `translateX(${direction > 0 ? '-100%' : '100%'})`
            : 'translateX(0)',
          transition: direction !== 0 ? 'transform 300ms ease' : 'none',
          opacity: direction !== 0 ? 0 : 1,
        }}
      >
        <CurrentCardComponent />
      </Box>
    </Box>
  );
};

export default DailyLog;
