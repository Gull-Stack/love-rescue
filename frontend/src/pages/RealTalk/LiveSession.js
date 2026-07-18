import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import SendIcon from '@mui/icons-material/Send';
import FlagIcon from '@mui/icons-material/Flag';
import GavelIcon from '@mui/icons-material/Gavel';
import { useNavigate } from 'react-router-dom';
import { realTalkApi } from '../../services/api';
import { brandGradients } from '../../theme';

const CATEGORY_META = {
  fallacy: { label: 'Fallacy', color: 'warning' },
  manipulation: { label: 'Manipulation', color: 'error' },
  horseman: { label: 'Gottman Horseman', color: 'secondary' },
};

const speechSupported =
  typeof window !== 'undefined' &&
  Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * Real Talk Live Session — an in-session listener. With both partners'
 * consent it records the conversation via the browser's speech recognition
 * (audio never reaches our servers), analyzes each finished sentence, and
 * flags fallacies, manipulative tactics, and Gottman horsemen as they happen.
 * A typed input is always available as a mic-free fallback.
 */
const LiveSession = () => {
  const navigate = useNavigate();
  const [consented, setConsented] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [listening, setListening] = useState(false);
  const [utterances, setUtterances] = useState([]); // {text, flags: []}
  const [interim, setInterim] = useState('');
  const [typed, setTyped] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [safety, setSafety] = useState(null);
  const [summary, setSummary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [speaker, setSpeaker] = useState('A');
  const [semanticOn, setSemanticOn] = useState(false);
  const recognitionRef = useRef(null);
  const startedAtRef = useRef(null);
  const feedRef = useRef(null);
  // analyze() runs from speech-recognition callbacks — read the live speaker
  // through a ref so utterances are attributed to whoever is selected NOW.
  const speakerRef = useRef('A');
  speakerRef.current = speaker;

  useEffect(() => {
    document.title = 'Live Session | Love Rescue';
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* already stopped */ }
      }
    };
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [utterances, interim]);

  const analyze = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const who = speakerRef.current;
    setAnalyzing(true);
    try {
      const res = await realTalkApi.liveAnalyze(trimmed);
      const { flags = [] } = res.data;
      if (res.data.safety) {
        setSafety(res.data);
      }
      if (typeof res.data.semantic === 'boolean') setSemanticOn(res.data.semantic);
      setUtterances((prev) => [...prev, { text: trimmed, flags, speaker: who }]);
    } catch (err) {
      // Never lose what was said — record it unflagged with an error marker.
      setUtterances((prev) => [...prev, { text: trimmed, flags: [], speaker: who, error: true }]);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          analyze(result[0].transcript);
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(interimText);
    };
    rec.onend = () => {
      // Chrome stops after silence — restart while the session is live.
      if (recognitionRef.current === rec) {
        try { rec.start(); } catch { /* tab lost focus etc. */ }
      }
    };
    rec.onerror = () => { /* mic denied or transient — typed input still works */ };
    recognitionRef.current = rec;
    if (!startedAtRef.current) startedAtRef.current = new Date();
    rec.start();
    setListening(true);
  };

  const stopListening = () => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      try { rec.stop(); } catch { /* already stopped */ }
    }
    setInterim('');
    setListening(false);
  };

  const submitTyped = (e) => {
    e.preventDefault();
    if (!startedAtRef.current) startedAtRef.current = new Date();
    analyze(typed);
    setTyped('');
  };

  const endSession = async () => {
    stopListening();
    const flagCounts = {};
    const flaggedExcerpts = [];
    for (const u of utterances) {
      for (const f of u.flags) {
        flagCounts[f.id] = (flagCounts[f.id] || 0) + 1;
      }
      if (u.flags.length > 0) {
        flaggedExcerpts.push({ text: u.text, flagIds: u.flags.map((f) => f.id), speaker: u.speaker || null });
      }
    }
    const summaryData = {
      startedAt: (startedAtRef.current || new Date()).toISOString(),
      endedAt: new Date().toISOString(),
      utteranceCount: utterances.length,
      flagCounts,
      flaggedExcerpts,
    };
    setSummary(summaryData);
    setSaving(true);
    setSaveError('');
    try {
      await realTalkApi.liveSaveSession(summaryData);
    } catch (err) {
      setSaveError('Could not save this session — the summary below is still yours to review.');
    } finally {
      setSaving(false);
    }
  };

  const totalFlags = utterances.reduce((n, u) => n + u.flags.length, 0);

  // ── Consent gate ──────────────────────────────────────────────────────────
  if (!consented) {
    return (
      <Box sx={{ p: 3, maxWidth: 640, mx: 'auto' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/real-talk')} sx={{ mb: 2, color: 'text.secondary' }}>
          Back to Real Talk
        </Button>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <GavelIcon color="primary" />
              <Typography variant="h5" fontWeight={700}>Live Session</Typography>
              <Chip label="Beta" size="small" color="secondary" />
            </Box>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              A neutral listener for hard conversations. It flags fallacies
              ("you always…"), manipulative tactics (reality-denial, guilt-tripping,
              ultimatums), and Gottman's four horsemen — as they happen, for both of you
              equally. It's a mirror, not a referee.
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Privacy</AlertTitle>
              Audio is transcribed by your browser and never reaches our servers —
              only text is analyzed. We save flag counts and flagged sentences, never
              the full conversation. No microphone? You can type instead.
            </Alert>
            <FormControlLabel
              control={<Checkbox checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />}
              label="We both agree to run this session with the live listener on."
            />
            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={!consentChecked}
              onClick={() => setConsented(true)}
              sx={{ mt: 2, minHeight: 48, background: brandGradients.action }}
            >
              Start Live Session
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // ── Summary view ──────────────────────────────────────────────────────────
  if (summary) {
    const flagged = Object.entries(summary.flagCounts);
    return (
      <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Session Summary</Typography>
        {saving && <CircularProgress size={20} sx={{ mb: 1 }} />}
        {saveError && <Alert severity="warning" sx={{ mb: 2 }}>{saveError}</Alert>}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="body1" sx={{ mb: 1 }}>
              {summary.utteranceCount} statements analyzed · {totalFlags} flag{totalFlags === 1 ? '' : 's'}
            </Typography>
            {flagged.length === 0 ? (
              <Alert severity="success">
                No fallacies or manipulative patterns detected. That's a clean, fair fight — keep going.
              </Alert>
            ) : (
              <>
                {(() => {
                  const bySpeaker = { A: 0, B: 0 };
                  for (const u of utterances) {
                    if (u.speaker && u.flags.length) bySpeaker[u.speaker] += u.flags.length;
                  }
                  return (bySpeaker.A > 0 || bySpeaker.B > 0) ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Partner A: {bySpeaker.A} flag{bySpeaker.A === 1 ? '' : 's'} · Partner B: {bySpeaker.B} flag{bySpeaker.B === 1 ? '' : 's'} —
                      patterns are habits both partners can name together, not a scoreboard.
                    </Typography>
                  ) : null;
                })()}
                <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                  Patterns that showed up — each one is a habit, not a verdict:
                </Typography>
                {utterances.filter((u) => u.flags.length > 0).map((u, i) => (
                  <Box key={i} sx={{ mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 0.5 }}>
                      {u.speaker ? `Partner ${u.speaker}: ` : ''}"{u.text}"
                    </Typography>
                    {u.flags.map((f) => (
                      <Typography key={f.id} variant="caption" display="block" color="text.secondary">
                        <strong>{f.label}:</strong> {f.reframe}
                      </Typography>
                    ))}
                  </Box>
                ))}
              </>
            )}
          </CardContent>
        </Card>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="contained" onClick={() => navigate('/real-talk')} sx={{ minHeight: 44 }}>
            Back to Real Talk
          </Button>
          <Button
            variant="outlined"
            onClick={() => { setSummary(null); setUtterances([]); startedAtRef.current = null; setSafety(null); }}
            sx={{ minHeight: 44 }}
          >
            New Session
          </Button>
        </Box>
      </Box>
    );
  }

  // ── Live view ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: 'auto', display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>Live Session</Typography>
        {semanticOn && (
          <Tooltip title="Deep analysis is on: an AI pass also catches sarcasm and implied patterns." arrow>
            <Chip label="Deep analysis" size="small" color="secondary" variant="outlined" />
          </Tooltip>
        )}
        <Chip icon={<FlagIcon />} label={`${totalFlags} flag${totalFlags === 1 ? '' : 's'}`} size="small" color={totalFlags > 0 ? 'warning' : 'default'} />
        <Button variant="outlined" color="error" onClick={endSession} sx={{ minHeight: 44 }} disabled={utterances.length === 0 && !listening}>
          End Session
        </Button>
      </Box>

      {/* Who's speaking — attribution for the transcript and summary */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">Speaking:</Typography>
        {['A', 'B'].map((s) => (
          <Chip
            key={s}
            label={`Partner ${s}`}
            size="small"
            color={speaker === s ? 'primary' : 'default'}
            variant={speaker === s ? 'filled' : 'outlined'}
            onClick={() => setSpeaker(s)}
            sx={{ minHeight: 32 }}
          />
        ))}
      </Box>

      {safety && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSafety(null)}>
          <AlertTitle>Your safety matters most</AlertTitle>
          {safety.message} — {safety.hotline} · {safety.textLine}
        </Alert>
      )}

      <Box ref={feedRef} sx={{ flex: 1, overflowY: 'auto', mb: 2, pr: 0.5 }} data-testid="live-feed">
        {utterances.length === 0 && !interim && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            {speechSupported
              ? 'Tap the mic and start talking — or type below. Each finished sentence is analyzed instantly.'
              : 'Speech recognition is not available in this browser — type each statement below and it will be analyzed instantly.'}
          </Typography>
        )}
        {utterances.map((u, i) => (
          <Box key={i} sx={{ mb: 1.5 }}>
            <Typography variant="body1">
              {u.speaker && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 20, height: 20, mr: 1, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                    bgcolor: u.speaker === 'A' ? 'primary.main' : 'secondary.main',
                    color: '#fff', verticalAlign: 'text-bottom',
                  }}
                >
                  {u.speaker}
                </Box>
              )}
              {u.text}
            </Typography>
            {u.error && (
              <Typography variant="caption" color="text.secondary">Couldn't analyze this one.</Typography>
            )}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {u.flags.map((f) => (
                <Tooltip key={f.id} title={<><strong>{f.explanation}</strong><br />Try: {f.reframe}</>} arrow>
                  <Chip
                    size="small"
                    icon={<FlagIcon />}
                    label={`${CATEGORY_META[f.category]?.label || f.category}: ${f.label}`}
                    color={CATEGORY_META[f.category]?.color || 'default'}
                    variant="outlined"
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>
        ))}
        {interim && (
          <Typography variant="body1" color="text.disabled" sx={{ fontStyle: 'italic' }}>{interim}…</Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {speechSupported && (
          <Button
            variant="contained"
            color={listening ? 'error' : 'primary'}
            onClick={listening ? stopListening : startListening}
            startIcon={listening ? <StopIcon /> : <MicIcon />}
            sx={{ minHeight: 48, minWidth: 130 }}
          >
            {listening ? 'Stop' : 'Listen'}
          </Button>
        )}
        <Box component="form" onSubmit={submitTyped} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Or type what was said…"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            inputProps={{ 'aria-label': 'Type what was said' }}
          />
          <Button type="submit" variant="outlined" disabled={!typed.trim() || analyzing} sx={{ minHeight: 44 }} aria-label="Analyze">
            {analyzing ? <CircularProgress size={18} /> : <SendIcon />}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default LiveSession;
