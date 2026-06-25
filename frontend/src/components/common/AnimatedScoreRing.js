import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

/**
 * AnimatedScoreRing — a score that counts UP inside a filling ring.
 *
 * The number rolls 0→value and the arc sweeps in together, so a result reveal
 * (compatibility, health, anything 0–100) lands as an event instead of static
 * text. Color auto-bands on the grounded palette unless `color` is passed.
 *
 * Props: value, size, stroke, color, label, suffix='%', duration=1300
 */

function bandColor(v) {
  if (v >= 80) return '#0E9F8E'; // teal — thriving
  if (v >= 60) return '#2DD4BF'; // light teal — healthy
  if (v >= 40) return '#E08A3C'; // amber — working on it
  return '#D14343'; // soft red — needs care
}

const AnimatedScoreRing = ({
  value = 0,
  size = 180,
  stroke = 14,
  color,
  label,
  suffix = '%',
  duration = 1300,
}) => {
  const [display, setDisplay] = useState(0);
  const raf = useRef();

  useEffect(() => {
    const target = Math.max(0, Math.min(value, 100));
    let start;
    const tick = (t) => {
      if (start == null) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(Math.round(eased * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  const c = color || bandColor(value);
  const center = size / 2;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(display, 100) / 100);

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={c}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
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
        <Typography variant="h3" fontWeight="bold" sx={{ lineHeight: 1, color: c }}>
          {display}
          {suffix}
        </Typography>
        {label && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {label}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AnimatedScoreRing;
