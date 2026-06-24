import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Button } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

/**
 * RelationshipHealth — the dashboard's hero card: "where things stand."
 *
 * Headline score (0–100) is sourced, in priority order, from:
 *   1. The Gottman Checkup assessment (clinical relationship-health score), or
 *   2. The live average of the three activity pillars (last 7 days), or
 *   3. nothing yet → an inviting "take your checkup" prompt.
 *
 * Beneath the score it shows the three pillars every relationship lives or dies
 * on — Connection, Communication, Conflict skills — and names the one that
 * needs the most attention right now.
 *
 * Palette is the grounded brand (slate / teal / amber), not wellness-pink.
 *
 * Props:
 *   assessments   — { completed: [{ type, score, ... }] }
 *   progressRings — { connection:{percent}, communication:{percent}, conflict_skill:{percent} }
 *   onViewDetails — () => void  (tap-through to assessments)
 *   onStart       — () => void  (CTA when there's no data yet)
 */

const PILLARS = [
  { key: 'connection', label: 'Connection', color: '#0E9F8E' },
  { key: 'communication', label: 'Communication', color: '#33455B' },
  { key: 'conflict_skill', label: 'Conflict skills', color: '#E08A3C' },
];

function band(score) {
  if (score >= 80) return { label: 'Thriving', color: '#0E9F8E', blurb: 'Strong foundation. Keep doing what works.' };
  if (score >= 60) return { label: 'Healthy', color: '#2DD4BF', blurb: 'Solid ground, with room to grow.' };
  if (score >= 40) return { label: 'Working on it', color: '#E08A3C', blurb: 'Real progress is within reach this week.' };
  return { label: 'Needs care', color: '#D14343', blurb: "You're here, and that's what matters. Start small." };
}

const RING_SIZE = 132;
const STROKE = 12;

const RelationshipHealth = ({ assessments, progressRings, onViewDetails, onStart }) => {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  // ── Resolve the headline score ──
  const gottman = assessments?.completed?.find((c) => c.type === 'gottman_checkup');
  const gottmanHealth =
    gottman && typeof gottman.score === 'object' && typeof gottman.score.overallHealth === 'number'
      ? gottman.score.overallHealth
      : null;

  const pillarPercents = PILLARS.map((p) => progressRings?.[p.key]?.percent).filter(
    (n) => typeof n === 'number'
  );
  const pillarAvg = pillarPercents.length
    ? Math.round(pillarPercents.reduce((a, b) => a + b, 0) / pillarPercents.length)
    : null;

  const score = gottmanHealth != null ? gottmanHealth : pillarAvg;
  const fromCheckup = gottmanHealth != null;

  // ── Empty / invite state — still front and center, just a hook ──
  if (score == null) {
    return (
      <Card
        sx={{
          mb: 2,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #1B2735 0%, #33455B 100%)',
          color: '#fff',
        }}
      >
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <FavoriteBorderIcon sx={{ fontSize: 22 }} />
            <Typography variant="overline" sx={{ letterSpacing: 1, opacity: 0.85 }}>
              Relationship health
            </Typography>
          </Box>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
            See where things stand
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, mb: 2 }}>
            A 3-minute checkup gives you one clear number — and shows you exactly where to focus.
          </Typography>
          <Button
            onClick={onStart}
            variant="contained"
            color="secondary"
            endIcon={<ArrowForwardIcon />}
            sx={{ fontWeight: 700 }}
          >
            Take the checkup
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { label, color, blurb } = band(score);

  // Lowest pillar that we actually have data for → the "focus here" callout.
  const pillarsWithData = PILLARS.map((p) => ({ ...p, percent: progressRings?.[p.key]?.percent })).filter(
    (p) => typeof p.percent === 'number'
  );
  const focus = pillarsWithData.length
    ? pillarsWithData.reduce((lo, p) => (p.percent < lo.percent ? p : lo))
    : null;

  // Ring geometry
  const center = RING_SIZE / 2;
  const radius = (RING_SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(score, 100) / 100);

  return (
    <Card
      onClick={onViewDetails}
      sx={{
        mb: 2,
        borderRadius: 4,
        cursor: onViewDetails ? 'pointer' : 'default',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onViewDetails
          ? { transform: 'translateY(-2px)', boxShadow: '0 8px 28px rgba(0,0,0,0.10)' }
          : undefined,
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FavoriteBorderIcon sx={{ fontSize: 20, color }} />
          <Typography variant="overline" sx={{ letterSpacing: 1, color: 'text.secondary' }}>
            Relationship health · where things stand
          </Typography>
        </Box>

        {/* Score gauge + verdict */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
            <svg width={RING_SIZE} height={RING_SIZE}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="rgba(0,0,0,0.06)"
                strokeWidth={STROKE}
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={animated ? dashOffset : circumference}
                transform={`rotate(-90 ${center} ${center})`}
                style={{ transition: 'stroke-dashoffset 1.1s ease-out' }}
              />
            </svg>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <Typography variant="h3" fontWeight="bold" sx={{ lineHeight: 1, color: 'text.primary' }}>
                {score}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                out of 100
              </Typography>
            </Box>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color, lineHeight: 1.2 }}>
              {label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {blurb}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, opacity: 0.8 }}>
              {fromCheckup ? 'From your relationship checkup' : 'From your activity this week'}
            </Typography>
          </Box>
        </Box>

        {/* Three pillars */}
        {pillarsWithData.length > 0 && (
          <Box sx={{ mt: 2.5 }}>
            {PILLARS.map(({ key, label: plabel, color: pcolor }) => {
              const pct = progressRings?.[key]?.percent;
              if (typeof pct !== 'number') return null;
              return (
                <Box key={key} sx={{ mb: key !== 'conflict_skill' ? 1.5 : 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                      {plabel}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 700, color: pcolor }}>
                      {pct}%
                    </Typography>
                  </Box>
                  <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        height: '100%',
                        borderRadius: 3,
                        bgcolor: pcolor,
                        width: animated ? `${Math.min(pct, 100)}%` : 0,
                        transition: 'width 1s ease-out',
                      }}
                    />
                  </Box>
                </Box>
              );
            })}

            {focus && (
              <Typography
                variant="caption"
                sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}
              >
                <Box component="span" sx={{ fontWeight: 700, color: focus.color }}>
                  {focus.label}
                </Box>{' '}
                needs the most attention right now — that's where this week's plan focuses.
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RelationshipHealth;
