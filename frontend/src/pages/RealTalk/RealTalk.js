import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { brandGradients } from '../../theme';

const TOTAL_STEPS = 4;

const EMOTIONS = [
  'Hurt', 'Scared', 'Lonely', 'Frustrated',
  'Invisible', 'Unimportant', 'Overwhelmed', 'Dismissed',
];

const STEP_GRADIENTS = [
  brandGradients.success, // Teal: What happened
  brandGradients.hero,    // Slate: Feelings
  brandGradients.success, // Teal: Needs
  brandGradients.hero,    // Slate: Result
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

// ---- SAFETY DIALOG COPY (module scope) ----
// The backend flags two different kinds of safety responses on POST /api/real-talk:
//   1. The legacy abuse-keyword check — `safety: true` with hotline/textLine/url
//      but NO `crisis` payload → domestic-violence wording.
//   2. The crisis-detection hook — `safety: true` PLUS a `crisis` payload
//      ({detected, level, primaryType, safetyRisk, resources, ...}). Suicide /
//      self-harm indicators set `crisis.safetyRisk`, and those detections must
//      lead with 988, not DV wording.
const SAFETY_COPY = {
  suicide: {
    title: 'You Matter',
    body: "It sounds like you're carrying something heavy right now. You don't have to face it alone — trained counselors are ready to listen, right now.",
    resourceName: '988 Suicide & Crisis Lifeline',
    callLine: 'Call or text 988',
    textLine: 'Text HOME to 741741 (Crisis Text Line)',
    url: 'https://988lifeline.org',
  },
  abuse: {
    title: 'Your Safety Matters',
    body: 'It sounds like you may be experiencing abuse. You deserve to be safe.',
    resourceName: 'National Domestic Violence Hotline',
    callLine: 'Call: 1-800-799-7233',
    textLine: 'Text START to 88788',
    url: 'https://www.thehotline.org',
  },
  generic: {
    title: 'Support Is Available',
    body: "It sounds like you're going through something really hard. You don't have to carry it alone — someone caring is available to talk any time.",
    resourceName: '988 Suicide & Crisis Lifeline',
    callLine: 'Call or text 988',
    textLine: 'Text HOME to 741741 (Crisis Text Line)',
    url: 'https://988lifeline.org',
  },
};

const getSafetyCopy = (data) => {
  const crisis = data?.crisis;
  // Suicide / self-harm indicators take precedence — 988 first.
  if (crisis?.safetyRisk) return SAFETY_COPY.suicide;
  // No crisis payload = the abuse-keyword early return → keep DV wording.
  if (!crisis) return SAFETY_COPY.abuse;
  // Crisis detections that carry the DV hotline (escalated physical conflict)
  // also get the abuse wording.
  const hasDvResource = (crisis.resources || []).some(
    (r) => /domestic violence/i.test(r?.name || '')
  );
  if (hasDvResource || crisis.primaryType === 'ESCALATED_CONFLICT') return SAFETY_COPY.abuse;
  return SAFETY_COPY.generic;
};

// Resolve the exact lines the safety dialog shows — the branched copy above,
// overridden by whatever resources the backend actually returned.
const getSafetyDisplay = (data) => {
  const copy = getSafetyCopy(data);
  const crisis = data?.crisis;
  const display = { ...copy };

  if (crisis) {
    const resources = crisis.resources || [];
    // Pick the resource matching the wording branch (DV hotline for abuse,
    // 988 otherwise), falling back to the backend's primary resource.
    const primary =
      (copy === SAFETY_COPY.abuse
        ? resources.find((r) => /domestic violence/i.test(r?.name || ''))
        : resources.find((r) => /988/.test(r?.name || ''))) || resources[0];
    if (primary) {
      display.resourceName = primary.name || display.resourceName;
      display.callLine = primary.contact || display.callLine;
      display.url = primary.url || display.url;
    }
    const secondary = resources.find((r) => r !== primary && /\btext\b/i.test(r?.contact || ''));
    if (secondary) {
      display.textLine = `${secondary.contact}${secondary.name ? ` (${secondary.name})` : ''}`;
    } else if (primary && /\btext\b/i.test(primary.contact || '')) {
      // Primary line already covers texting (e.g. "Call or text 988").
      display.textLine = '';
    }
  } else {
    // Legacy abuse-keyword response: bare hotline number + text line + url.
    if (data?.hotline) display.callLine = `Call: ${data.hotline}`;
    if (data?.textLine) display.textLine = data.textLine;
    if (data?.url) display.url = data.url;
  }

  try {
    display.urlLabel = `Visit ${new URL(display.url).hostname.replace(/^www\./, '')}`;
  } catch {
    display.urlLabel = 'Open support website';
  }
  return display;
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

// ---- STEP COMPONENTS (module scope) ----
// Hoisted out of RealTalk so their component identity is stable across
// renders. Defining them inside the component body made React remount the
// step (and its TextFields) on every keystroke, dropping input focus.
// State and handlers arrive via props.

// Progress dots
const ProgressDots = ({ currentStep }) => (
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
const CardShell = ({ children, gradient, showBack, currentStep, goBack, navigate }) => (
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
        <IconButton aria-label="Go back" onClick={goBack} sx={{ color: '#fff' }}>
          <ArrowBackIcon />
        </IconButton>
      ) : (
        <IconButton aria-label="Go back" onClick={() => navigate(-1)} sx={{ color: '#fff' }}>
          <ArrowBackIcon />
        </IconButton>
      )}

      <Box sx={{ flex: 1 }}>
        <ProgressDots currentStep={currentStep} />
      </Box>

      <IconButton aria-label="View history" onClick={() => navigate('/real-talk/history')} sx={{ color: '#fff' }}>
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

const NextButton = ({ label = 'Next', onClick, disabled, canProceed, handleStepAction }) => (
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

const IssueStep = (props) => {
  const { issue, setIssue, result, canProceed, handleStepAction } = props;
  return (
    <CardShell {...props} gradient={STEP_GRADIENTS[0]} showBack={false}>
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

      <NextButton canProceed={canProceed} handleStepAction={handleStepAction} />
    </CardShell>
  );
};

const FeelingStep = (props) => {
  const { selectedEmotions, toggleEmotion, customFeeling, setCustomFeeling, canProceed, handleStepAction } = props;
  return (
    <CardShell {...props} gradient={STEP_GRADIENTS[1]} showBack>
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

      <NextButton canProceed={canProceed} handleStepAction={handleStepAction} />
    </CardShell>
  );
};

const NeedStep = (props) => {
  const { need, setNeed, loading, canProceed, handleStepAction } = props;
  return (
    <CardShell {...props} gradient={STEP_GRADIENTS[2]} showBack>
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
      <NextButton
        label={loading ? 'Generating...' : 'Generate Gentle Startup'}
        disabled={loading}
        canProceed={canProceed}
        handleStepAction={handleStepAction}
      />
      {loading && <CircularProgress sx={{ color: '#fff', mt: 2 }} size={32} />}
    </CardShell>
  );
};

const ResultStep = (props) => {
  const {
    result, copied, handleCopy, expertQuote,
    effectivenessRated, handleEffectiveness,
    error, onRetry, onReset,
  } = props;
  return (
    <CardShell {...props} gradient={STEP_GRADIENTS[3]} showBack>
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
            onClick={onReset}
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
            onClick={onRetry}
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
};

const steps = [IssueStep, FeelingStep, NeedStep, ResultStep];

const RealTalk = () => {
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Real Talk | Love Rescue'; }, []);
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

  const handleReset = () => {
    setCurrentStep(0);
    setIssue('');
    setSelectedEmotions([]);
    setCustomFeeling('');
    setNeed('');
    setResult(null);
    setEffectivenessRated(false);
    setExpertQuote(null);
    setError('');
  };

  const handleRetry = () => {
    setError('');
    handleSubmit();
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

  const CurrentStepComponent = steps[currentStep];

  // Safety-dialog copy, branched on the shape of the safety response.
  const safetyDisplay = getSafetyDisplay(safetyData);

  // Everything the hoisted step components need — state + handlers via props
  // so the component types themselves stay stable across renders.
  const stepProps = {
    currentStep,
    goBack,
    navigate,
    canProceed,
    handleStepAction,
    issue,
    setIssue,
    selectedEmotions,
    toggleEmotion,
    customFeeling,
    setCustomFeeling,
    need,
    setNeed,
    loading,
    result,
    copied,
    handleCopy,
    expertQuote,
    effectivenessRated,
    handleEffectiveness,
    error,
    onRetry: handleRetry,
    onReset: handleReset,
  };

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
          <CurrentStepComponent {...stepProps} />
        </motion.div>
      </AnimatePresence>

      {/* Safety Dialog — copy branches on the response type: suicide/self-harm
          detections (crisis.safetyRisk) lead with 988, DV detections keep the
          abuse wording, everything else gets a generic supportive fallback. */}
      <Dialog
        open={safetyDialog}
        onClose={() => setSafetyDialog(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {safetyDisplay.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {safetyDisplay.body}
          </Typography>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
            {safetyDisplay.resourceName}
          </Typography>
          <Typography variant="body1" sx={{ mb: 0.5 }}>
            {safetyDisplay.callLine}
          </Typography>
          {safetyDisplay.textLine && (
            <Typography variant="body1" sx={{ mb: 2 }}>
              {safetyDisplay.textLine}
            </Typography>
          )}
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
            onClick={() => window.open(safetyDisplay.url, '_blank')}
            sx={{ textTransform: 'none' }}
          >
            {safetyDisplay.urlLabel}
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
