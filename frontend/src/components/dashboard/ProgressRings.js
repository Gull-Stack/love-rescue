import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

// Celebration burst when a ring hits 100%
const celebratePulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
`;

const RINGS = [
  { key: 'connection', label: 'Connection', color: '#34D399' },       // green (outer)
  { key: 'communication', label: 'Communication', color: '#60A5FA' }, // blue (middle)
  { key: 'conflict_skill', label: 'Conflict Skill', color: '#FB923C' }, // orange (inner)
];

const SIZE = 180;
const STROKE_WIDTH = 14;
const GAP = 4; // gap between rings

/**
 * Apple Watch-style 3 concentric progress rings.
 *
 * Props:
 *   data — { connection: {earned, total, percent}, communication: {...}, conflict_skill: {...} }
 *          Falls back to zeroes when not provided.
 */
const ProgressRings = ({ data }) => {
  const [animated, setAnimated] = useState(false);
  const [celebrated, setCelebrated] = useState({});
  const prevPercents = useRef({});

  useEffect(() => {
    // Trigger entry animation on mount
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Detect ring closure (transition to 100%) for celebration
  useEffect(() => {
    if (!data) return;
    const next = {};
    RINGS.forEach(({ key }) => {
      const pct = data[key]?.percent ?? 0;
      const prev = prevPercents.current[key] ?? 0;
      if (pct >= 100 && prev < 100) {
        next[key] = true;
      }
      prevPercents.current[key] = pct;
    });
    if (Object.keys(next).length > 0) {
      setCelebrated(prev => ({ ...prev, ...next }));
      // Clear celebration after animation
      const t = setTimeout(() => setCelebrated({}), 1500);
      return () => clearTimeout(t);
    }
  }, [data]);

  const center = SIZE / 2;

  // Find bottleneck (lowest percent) for center display
  const percents = RINGS.map(({ key }) => data?.[key]?.percent ?? 0);
  const bottleneck = Math.min(...percents);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 3,
        p: 2.5,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
        This Week
      </Typography>

      {/* Concentric rings */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Box sx={{ position: 'relative', width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE}>
            {RINGS.map(({ key, color }, i) => {
              const radius = (SIZE - STROKE_WIDTH) / 2 - i * (STROKE_WIDTH + GAP);
              const circumference = 2 * Math.PI * radius;
              const pct = data?.[key]?.percent ?? 0;
              const progress = Math.min(pct / 100, 1);
              const dashOffset = circumference * (1 - progress);
              const isCelebrating = celebrated[key];

              return (
                <g key={key}>
                  {/* Background track */}
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="rgba(0,0,0,0.06)"
                    strokeWidth={STROKE_WIDTH}
                  />
                  {/* Progress arc */}
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={animated ? dashOffset : circumference}
                    transform={`rotate(-90 ${center} ${center})`}
                    style={{
                      transition: 'stroke-dashoffset 1s ease-out',
                      ...(isCelebrating
                        ? { animation: `${celebratePulse} 0.6s ease-in-out` }
                        : {}),
                    }}
                  />
                  {/* Round end-cap glow for completed rings */}
                  {pct >= 100 && (
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="none"
                      stroke={color}
                      strokeWidth={STROKE_WIDTH}
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={0}
                      transform={`rotate(-90 ${center} ${center})`}
                      style={{ opacity: 0.3, filter: 'blur(3px)' }}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Center bottleneck display */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ lineHeight: 1, color: 'text.primary' }}
            >
              {bottleneck}%
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: '0.6rem' }}
            >
              lowest
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {RINGS.map(({ key, label, color }) => {
          const earned = data?.[key]?.earned ?? 0;
          const total = data?.[key]?.total ?? 0;
          return (
            <Box
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: color,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="body2"
                sx={{ flex: 1, fontWeight: 500 }}
              >
                {label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {earned}/{total}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ProgressRings;
