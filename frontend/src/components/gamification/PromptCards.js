import React, { useRef } from 'react';
import { Box, Card, CardContent, Typography, alpha } from '@mui/material';
import { hapticLight } from '../../utils/haptics';

const prompts = [
  { text: "What made you smile today?", emoji: "😊" },
  { text: "One thing your partner did that you appreciated", emoji: "💝" },
  { text: "What's one thing you're grateful for in your relationship?", emoji: "🙏" },
  { text: "How did you show love today?", emoji: "💕" },
  { text: "What's something you'd like to improve tomorrow?", emoji: "🌱" },
  { text: "Describe a moment of connection today", emoji: "🔗" },
  { text: "What emotion surprised you today?", emoji: "🤔" },
];

const PromptCards = ({ onSelect }) => {
  const scrollRef = useRef(null);

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        💡 Tap a prompt for inspiration
      </Typography>
      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          pb: 1,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {prompts.map((p, i) => (
          <Card
            key={i}
            onClick={() => { hapticLight(); onSelect(p.text); }}
            sx={{
              minWidth: 200,
              maxWidth: 220,
              flexShrink: 0,
              scrollSnapAlign: 'start',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
                borderColor: 'primary.main',
              },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography sx={{ fontSize: '2rem', mb: 0.5 }}>{p.emoji}</Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.4 }}>{p.text}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default PromptCards;
