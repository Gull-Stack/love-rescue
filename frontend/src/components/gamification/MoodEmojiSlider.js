import React from 'react';
import { Box, Slider, Typography } from '@mui/material';

const moodConfig = [
  { min: 1, max: 2, emoji: '😢', label: 'Sad', color: '#5C6BC0' },
  { min: 3, max: 4, emoji: '😟', label: 'Down', color: '#7E57C2' },
  { min: 5, max: 6, emoji: '😐', label: 'Okay', color: '#FFA726' },
  { min: 7, max: 8, emoji: '😊', label: 'Good', color: '#66BB6A' },
  { min: 9, max: 10, emoji: '🥰', label: 'Amazing', color: '#EC407A' },
];

const getMoodInfo = (val) => moodConfig.find(m => val >= m.min && val <= m.max) || moodConfig[2];

// Inject keyframe styles once
const styleId = 'mood-emoji-styles';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const s = document.createElement('style');
  s.id = styleId;
  s.textContent = `
    @keyframes tearDrop {
      0%, 100% { opacity: 0; transform: translateY(0); }
      50% { opacity: 0.7; transform: translateY(8px); }
    }
    @keyframes heartFloat {
      0% { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(-30px) scale(0.5); }
    }
    .mood-emoji-container { position: relative; display: inline-block; }
    .mood-tear {
      position: absolute; bottom: 10px; left: 50%; font-size: 16px;
      animation: tearDrop 2s ease-in-out infinite;
    }
    .mood-hearts {
      position: absolute; top: -5px; left: 50%; transform: translateX(-50%);
    }
    .mood-heart {
      position: absolute; font-size: 14px;
      animation: heartFloat 2s ease-out infinite;
    }
  `;
  document.head.appendChild(s);
}

const MoodEmojiSlider = ({ value, onChange }) => {
  const mood = getMoodInfo(value);

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box className="mood-emoji-container" sx={{ mb: 1 }}>
        <Typography
          sx={{
            fontSize: '80px',
            lineHeight: 1,
            transition: 'all 0.3s ease',
            filter: `drop-shadow(0 4px 12px ${mood.color}40)`,
          }}
        >
          {mood.emoji}
        </Typography>
        {value <= 2 && <span className="mood-tear" style={{ marginLeft: '-4px' }}>💧</span>}
        {value >= 9 && (
          <span className="mood-hearts">
            {[0, 1, 2].map(i => (
              <span key={i} className="mood-heart" style={{
                left: `${(i - 1) * 20}px`,
                animationDelay: `${i * 0.5}s`,
              }}>💕</span>
            ))}
          </span>
        )}
      </Box>
      <Typography variant="body1" fontWeight="bold" color={mood.color} sx={{ mb: 1, transition: 'color 0.3s' }}>
        {mood.label}
      </Typography>
      <Slider
        value={value}
        onChange={(_, v) => onChange(v)}
        min={1}
        max={10}
        marks
        valueLabelDisplay="auto"
        sx={{
          color: mood.color,
          '& .MuiSlider-thumb': {
            width: 28, height: 28,
            '&:hover, &.Mui-active': { boxShadow: `0 0 0 8px ${mood.color}20` },
          },
        }}
      />
    </Box>
  );
};

export default MoodEmojiSlider;
