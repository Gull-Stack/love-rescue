import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, LinearProgress, Paper, Fade,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// A 3-question, no-signup teaser. The whole point (Merlin-style): deliver a
// real, personal insight in under a minute BEFORE asking for anything, then
// convert curiosity into an account. Scoring is intentionally simple and runs
// client-side — the full assessment goes far deeper after signup.

const QUESTIONS = [
  { key: 'anxious', text: 'I often worry that my partner doesn’t value me as much as I value them.' },
  { key: 'avoidant', text: 'When things get tense, I tend to pull back or shut down rather than open up.' },
  { key: 'secure', text: 'I can stay close to my partner and still feel like my own person.' },
];

const SCALE = [
  { v: 1, label: 'Not at all' },
  { v: 2, label: 'A little' },
  { v: 3, label: 'Somewhat' },
  { v: 4, label: 'Mostly' },
  { v: 5, label: 'Very much' },
];

const RESULTS = {
  anxious: {
    title: 'You lean Anxious',
    body: 'You’re wired to notice disconnection fast — which means you care deeply. Unmanaged, it can read as pressure to your partner. Understood, it becomes your early-warning system for the relationship.',
  },
  avoidant: {
    title: 'You lean Avoidant',
    body: 'Under stress you protect yourself by withdrawing. It keeps you steady, but your partner can read distance as “he doesn’t care.” The skill is staying in the room when it’s uncomfortable.',
  },
  secure: {
    title: 'You lean Secure',
    body: 'You can be close without losing yourself — a real strength. The work now is using that stability to lead: setting the tone when your partner is dysregulated.',
  },
};

function scoreAnswers(answers) {
  const anxious = answers.anxious || 0;
  const avoidant = answers.avoidant || 0;
  const secure = answers.secure || 0;
  if (secure >= anxious && secure >= avoidant) return 'secure';
  return anxious >= avoidant ? 'anxious' : 'avoidant';
}

const QuickStart = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const done = step >= QUESTIONS.length;
  const leanKey = done ? scoreAnswers(answers) : null;
  const result = leanKey ? RESULTS[leanKey] : null;

  const answer = (key, v) => {
    setAnswers((a) => ({ ...a, [key]: v }));
    setTimeout(() => setStep((s) => s + 1), 180); // brief beat, then advance
  };

  // Hand the quick read off to signup so the momentum carries through.
  const goToSignup = () => {
    try {
      if (leanKey && result) {
        localStorage.setItem('lr_quickstart', JSON.stringify({ lean: leanKey, title: result.title }));
      }
    } catch { /* storage unavailable — no problem */ }
    navigate('/signup', { state: { quickStartTitle: result?.title } });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', px: 2, py: 4, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ maxWidth: 520, mx: 'auto', width: '100%' }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          Love Rescue
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          3 quick questions. No signup. See where you stand in under a minute.
        </Typography>

        {!done && (
          <>
            <LinearProgress
              variant="determinate"
              value={(step / QUESTIONS.length) * 100}
              sx={{ mb: 4, height: 8, borderRadius: 4 }}
            />
            <Fade in key={step}>
              <Box>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  {QUESTIONS[step].text}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {SCALE.map((opt) => (
                    <Button
                      key={opt.v}
                      variant="outlined"
                      size="large"
                      onClick={() => answer(QUESTIONS[step].key, opt.v)}
                      sx={{ justifyContent: 'flex-start', py: 1.5, borderRadius: 2, minHeight: 52 }}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Fade>
          </>
        )}

        {done && result && (
          <Fade in>
            <Box>
              <Paper
                elevation={0}
                sx={{
                  p: 4, mb: 3, borderRadius: 3, color: '#fff',
                  background: 'linear-gradient(135deg, #1B2735, #33455B)',
                }}
              >
                <Typography variant="overline" sx={{ opacity: 0.8 }}>Your quick read</Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>
                  {result.title}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.95, lineHeight: 1.6 }}>
                  {result.body}
                </Typography>
              </Paper>
              <Typography variant="body1" sx={{ mb: 3 }}>
                This is just the surface. Your full assessment builds a personalized,
                week-by-week plan for your marriage — free, no credit card.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                size="large"
                color="secondary"
                endIcon={<ArrowForwardIcon />}
                onClick={goToSignup}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 'bold', mb: 1.5 }}
              >
                Create your free account
              </Button>
              <Button fullWidth variant="text" size="small" onClick={() => navigate('/login')}>
                I already have an account
              </Button>
            </Box>
          </Fade>
        )}
      </Box>
    </Box>
  );
};

export default QuickStart;
