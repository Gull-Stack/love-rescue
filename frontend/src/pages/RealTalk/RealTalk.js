import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HistoryIcon from '@mui/icons-material/History';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { realTalkApi } from '../../services/api';

const TOTAL_STEPS = 4;

const EMOTIONS = [
  'Hurt', 'Scared', 'Lonely', 'Frustrated',
  'Invisible', 'Unimportant', 'Overwhelmed', 'Dismissed',
];

const STEP_GRADIENTS = [
  'linear-gradient(135deg, #4facfe, #00f2fe)', // Blue-teal: What happened
  'linear-gradient(135deg, #667eea, #764ba2)', // Purple: Feelings
  'linear-gradient(135deg, #43e97b, #38f9d7)', // Teal-green: Needs
  'linear-gradient(135deg, #4facfe, #00f2fe)', // Blue-teal: Result
];

const EXPERT_QUOTES = {
  effective: {
    text: '96% of conversations end the way they begin. You just chose a gentle beginning.',
    author: 'John Gottman',
  },
  first: {
    text: 'Clear is kind. Unclear is unkind.',
    author: 'Brene Brown',
  },
  milestone: {
    text: 'When you reveal vulnerability, your partner moves toward you.',
    author: 'Sue Johnson',
  },
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
  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.6)' },
};

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

const RealTalk = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [issue, setIssue] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [customFeeling, setCustomFeeling] = useState('');
  const [need, setNeed] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [safetyDialog, setSafetyDialog] = useState(false);
  const [safetyData, setSafetyData] = useState(null);
  const [effectivenessRated, setEffectivenessRated] = useState(false);
  const [expertQuote, setExpertQuote] = useState(null);
  const [snackbar, setSnackbar] = useState('');

  // Touch handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const getFeelingText = useCallback(() => {
    const chips = selectedEmotions.map(e => e.toLowerCase());
    const custom = customFeeling.trim().toLowerCase();
    if (custom && chips.length > 0) {
      return `${chips.join(' and ')} — ${custom}`;
    }
    if (custom) return custom;
    if (chips.length > 0) return chips.join(' and ');
    return '';
  }, [selectedEmotions, customFeeling]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0: return issue.trim().length > 0;
      case 1: return selectedEmotions.length > 0 || customFeeling.trim().length > 0;
      case 2: return need.trim().length > 0;
      default: return true;
    }
  }, [currentStep, issue, selectedEmotions, customFeeling, need]);

  const goNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const feeling = getFeelingText();
      const res = await realTalkApi.create({ issue: issue.trim(), feeling, need: need.trim() });

      if (res.data.safety) {
        setSafetyData(res.data);
        setSafetyDialog(true);
        setLoading(false);
        return;
      }

      setResult(res.data);

      // Determine which expert quote to show
      if (res.data.totalCount === 1) {
        setExpertQuote(EXPERT_QUOTES.first);
      } else if (res.data.totalCount >= 3) {
        setExpertQuote(EXPERT_QUOTES.milestone);
      } else {
        setExpertQuote(null);
      }

      setDirection(1);
      setCurrentStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [issue, need, getFeelingText]);

  const handleStepAction = useCallback(() => {
    if (currentStep === 2) {
      handleSubmit();
    } else if (currentStep < TOTAL_STEPS - 1) {
      goNext();
    }
  }, [currentStep, goNext, handleSubmit]);

  const handleCopy = useCallback(() => {
    if (result?.realTalk?.generatedStartup) {
      navigator.clipboard.writeText(result.realTalk.generatedStartup);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleEffectiveness = useCallback(async (value) => {
    if (!result?.realTalk?.id) return;
    try {
      await realTalkApi.rateEffectiveness(result.realTalk.id, value);
      setEffectivenessRated(true);
      if (value === 'effective') {
        setExpertQuote(EXPERT_QUOTES.effective);
      }
      setSnackbar(
        value === 'effective' ? 'That gentle beginning made a difference.'
        : value === 'somewhat' ? 'Every attempt builds the skill. Keep going.'
        : "Not every conversation lands. The courage to try still matters."
      );
    } catch {
      setSnackbar('Could not save rating');
    }
  }, [result]);

  const toggleEmotion = (emotion) => {
    setSelectedEmotions(prev =>
      prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion]
    );
  };

  // Touch swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0 && canProceed() && currentStep < 3) {
        handleStepAction();
      } else if (deltaX > 0 && currentStep > 0 && currentStep < 3) {
        goBack();
      }
    }
  };

  // Progress dots
  const ProgressDots = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, pt: 2, pb: 1 }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: i === currentStep ? 12 : 8,
            height: i === currentStep ? 12 : 8,
            borderRadius: '50%',
            bgcolor: i === currentStep ? '#fff' : 'transparent',
            border: '2px solid #fff',
            transition: 'all 0.3s ease',
            opacity: i <= currentStep ? 1 : 0.4,
          }}
        />
      ))}
    </Box>
  );

  // Card shell matching DailyLog pattern
  const CardShell = ({ children, gradient, showBack }) => (
    <Box
      sx={{
        minHeight: 'calc(100vh - 120px)',
        background: gradient,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1, pt: 1 }}>
        {showBack ? (
          <IconButton onClick={goBack} sx={{ color: '#fff' }}>
            <ArrowBackIcon />
          </IconButton>
        ) : (
          <IconButton onClick={() => navigate(-1)} sx={{ color: '#fff' }}>
            <ArrowBackIcon />
          </IconButton>
        )}

        <Box sx={{ flex: 1 }}>
          <ProgressDots />
        </Box>

        <IconButton onClick={() => navigate('/real-talk/history')} sx={{ color: '#fff' }}>
          <HistoryIcon />
        </IconButton>
      </Box>

      <Box sx={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        px: 3, pb: 4,
      }}>
        {children}
      </Box>
    </Box>
  );

  const NextButton = ({ label = 'Next', onClick, disabled }) => (
    <Button
      variant="contained"
      onClick={onClick || handleStepAction}
      disabled={disabled || !canProceed()}
      sx={{
        mt: 4, px: 6, py: 1.5,
        bgcolor: '#fff',
        color: '#333',
        fontWeight: 'bold',
        fontSize: '1.1rem',
        borderRadius: 3,
        textTransform: 'none',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
        '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.5)' },
      }}
    >
      {label}
    </Button>
  );

  // --- STEP RENDERS ---

  const IssueStep = () => (
    <CardShell gradient={STEP_GRADIENTS[0]} showBack={false}>
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1, textAlign: 'center' }}>
        What happened?
      </Typography>
      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3, textAlign: 'center', maxWidth: 360 }}>
        Describe the specific behavior — not their character
      </Typography>
      <TextField
        multiline
        rows={3}
        fullWidth
        placeholder='"You were on your phone during dinner every night this week"'
        value={issue}
        onChange={(e) => setIssue(e.target.value)}
        sx={{ ...whiteTextFieldSx, maxWidth: 400 }}
        helperText="Focus on what happened, not who they are"
      />

      {result?.warnings?.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2, maxWidth: 400 }}>
          {result.warnings[0]}
        </Alert>
      )}

      <NextButton />
    </CardShell>
  );

  const FeelingStep = () => (
    <CardShell gradient={STEP_GRADIENTS[1]} showBack>
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1, textAlign: 'center' }}>
        How does it make you feel?
      </Typography>
      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3, textAlign: 'center', maxWidth: 360 }}>
        Your emotion — not an accusation
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 400, mb: 3 }}>
        {EMOTIONS.map(emotion => (
          <Chip
            key={emotion}
            label={emotion}
            onClick={() => toggleEmotion(emotion)}
            variant={selectedEmotions.includes(emotion) ? 'filled' : 'outlined'}
            sx={{
              borderColor: 'rgba(255,255,255,0.6)',
              color: '#fff',
              fontSize: '0.95rem',
              py: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
              ...(selectedEmotions.includes(emotion) && {
                bgcolor: 'rgba(255,255,255,0.25)',
                borderColor: '#fff',
                fontWeight: 'bold',
              }),
            }}
          />
        ))}
      </Box>

      <TextField
        fullWidth
        placeholder="Or describe in your own words..."
        value={customFeeling}
        onChange={(e) => setCustomFeeling(e.target.value)}
        sx={{ ...whiteTextFieldSx, maxWidth: 400 }}
      />

      <NextButton />
    </CardShell>
  );

  const NeedStep = () => (
    <CardShell gradient={STEP_GRADIENTS[2]} showBack>
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1, textAlign: 'center' }}>
        What do you need?
      </Typography>
      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3, textAlign: 'center', maxWidth: 360 }}>
        A specific, doable request — not a demand
      </Typography>
      <TextField
        multiline
        rows={3}
        fullWidth
        placeholder='"15 minutes of distraction-free time to connect"'
        value={need}
        onChange={(e) => setNeed(e.target.value)}
        sx={{ ...whiteTextFieldSx, maxWidth: 400 }}
        helperText="Make it something they can actually do"
      />
      <NextButton label={loading ? 'Generating...' : 'Generate Gentle Startup'} disabled={loading} />
      {loading && <CircularProgress sx={{ color: '#fff', mt: 2 }} size={32} />}
    </CardShell>
  );

  const ResultStep = () => (
    <CardShell gradient={STEP_GRADIENTS[3]} showBack>
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 3, textAlign: 'center' }}>
        Your Gentle Startup
      </Typography>

      {result?.realTalk && (
        <>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              borderRadius: 3,
              p: 3,
              maxWidth: 400,
              width: '100%',
              border: '1px solid rgba(255,255,255,0.3)',
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ color: '#fff', fontWeight: 600, lineHeight: 1.6, fontStyle: 'italic' }}
            >
              &ldquo;{result.realTalk.generatedStartup}&rdquo;
            </Typography>
          </Box>

          {/* Copy button */}
          <Button
            variant="contained"
            startIcon={copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
            onClick={handleCopy}
            sx={{
              bgcolor: '#fff',
              color: '#333',
              fontWeight: 'bold',
              borderRadius: 3,
              textTransform: 'none',
              px: 4,
              py: 1.5,
              mb: 3,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
            }}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>

          {/* Why this works */}
          <Box sx={{ maxWidth: 400, width: '100%', mb: 3 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 0.5 }}>
              Why this works:
            </Typography>
            {[
              'No attack on their character',
              'You own your feelings',
              'Specific, doable request',
              'Invites collaboration',
            ].map(point => (
              <Typography key={point} variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', pl: 1 }}>
                {point}
              </Typography>
            ))}
          </Box>

          {/* Expert quote */}
          {expertQuote && (
            <Box
              sx={{
                bgcolor: 'rgba(255,255,255,0.1)',
                borderRadius: 2,
                p: 2,
                maxWidth: 400,
                width: '100%',
                borderLeft: '3px solid rgba(255,255,255,0.5)',
                mb: 3,
              }}
            >
              <Typography variant="body2" sx={{ color: '#fff', fontStyle: 'italic', mb: 0.5 }}>
                &ldquo;{expertQuote.text}&rdquo;
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                — {expertQuote.author}
              </Typography>
            </Box>
          )}

          {/* Effectiveness rating */}
          {!effectivenessRated ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1.5 }}>
                After you use it, let us know how it went:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  { value: 'effective', label: 'It worked', emoji: '' },
                  { value: 'somewhat', label: 'Somewhat', emoji: '' },
                  { value: 'ineffective', label: 'Not this time', emoji: '' },
                ].map(opt => (
                  <Button
                    key={opt.value}
                    variant="outlined"
                    onClick={() => handleEffectiveness(opt.value)}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.5)',
                      color: '#fff',
                      textTransform: 'none',
                      borderRadius: 2,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: '#fff' },
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ color: '#fff', fontSize: 32, mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#fff' }}>
                Rating saved
              </Typography>
            </Box>
          )}

          {/* Start new */}
          <Button
            onClick={() => {
              setCurrentStep(0);
              setIssue('');
              setSelectedEmotions([]);
              setCustomFeeling('');
              setNeed('');
              setResult(null);
              setEffectivenessRated(false);
              setExpertQuote(null);
              setError('');
            }}
            sx={{ color: '#fff', mt: 3, textTransform: 'none' }}
          >
            Start a new Real Talk
          </Button>
        </>
      )}

      {error && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#fff', mb: 2 }}>{error}</Typography>
          <Button
            variant="contained"
            onClick={() => { setError(''); handleSubmit(); }}
            sx={{
              bgcolor: '#fff', color: '#333', fontWeight: 'bold',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
            }}
          >
            Retry
          </Button>
        </Box>
      )}
    </CardShell>
  );

  const steps = [IssueStep, FeelingStep, NeedStep, ResultStep];
  const CurrentStepComponent = steps[currentStep];

  return (
    <Box
      sx={{ maxWidth: 600, mx: 'auto' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <CurrentStepComponent />
        </motion.div>
      </AnimatePresence>

      {/* Safety Dialog */}
      <Dialog
        open={safetyDialog}
        onClose={() => setSafetyDialog(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Your Safety Matters
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            It sounds like you may be experiencing abuse. You deserve to be safe.
          </Typography>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
            National Domestic Violence Hotline
          </Typography>
          <Typography variant="body1" sx={{ mb: 0.5 }}>
            Call: {safetyData?.hotline || '1-800-799-7233'}
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {safetyData?.textLine || 'Text START to 88788'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Available 24/7. Confidential. Free.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSafetyDialog(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => window.open(safetyData?.url || 'https://www.thehotline.org', '_blank')}
            sx={{ textTransform: 'none' }}
          >
            Visit thehotline.org
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for effectiveness feedback */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setSnackbar('')} sx={{ borderRadius: 2 }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RealTalk;
