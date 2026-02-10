import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { hapticLight } from '../../utils/haptics';

const emotions = [
  { label: 'Happy', emoji: '😊', color: '#66BB6A' },
  { label: 'Grateful', emoji: '🙏', color: '#FFB74D' },
  { label: 'Loved', emoji: '🥰', color: '#EC407A' },
  { label: 'Peaceful', emoji: '☮️', color: '#26C6DA' },
  { label: 'Excited', emoji: '🤩', color: '#FFA726' },
  { label: 'Hopeful', emoji: '🌟', color: '#FFEE58' },
  { label: 'Anxious', emoji: '😰', color: '#7E57C2' },
  { label: 'Frustrated', emoji: '😤', color: '#EF5350' },
  { label: 'Sad', emoji: '😢', color: '#5C6BC0' },
  { label: 'Lonely', emoji: '🫠', color: '#78909C' },
  { label: 'Overwhelmed', emoji: '😵‍💫', color: '#AB47BC' },
  { label: 'Disconnected', emoji: '🔌', color: '#8D6E63' },
];

const EmotionChips = ({ selected = [], onChange }) => {
  const toggle = (label) => {
    hapticLight();
    const next = selected.includes(label)
      ? selected.filter(s => s !== label)
      : [...selected, label];
    onChange(next);
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>How are you feeling? (select all that apply)</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {emotions.map(e => {
          const isSelected = selected.includes(e.label);
          return (
            <Chip
              key={e.label}
              label={`${e.emoji} ${e.label}`}
              onClick={() => toggle(e.label)}
              variant={isSelected ? 'filled' : 'outlined'}
              sx={{
                fontWeight: isSelected ? 'bold' : 'normal',
                bgcolor: isSelected ? `${e.color}20` : undefined,
                borderColor: e.color,
                color: isSelected ? e.color : undefined,
                transition: 'all 0.2s',
                '&:hover': { bgcolor: `${e.color}15` },
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default EmotionChips;
