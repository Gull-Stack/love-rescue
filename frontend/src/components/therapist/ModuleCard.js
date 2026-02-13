import React from 'react';
import { Card, CardContent, CardActions, Typography, Chip, Box, Button, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const difficultyColors = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'error',
};

const ModuleCard = ({ module, onAdd, onRemove, inPlan = false, order, completed = false, draggable = false }) => {
  return (
    <Card
      sx={{
        mb: 1,
        opacity: completed ? 0.7 : 1,
        border: completed ? '2px solid' : 'none',
        borderColor: 'success.light',
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          {draggable && (
            <DragIndicatorIcon sx={{ color: 'text.secondary', cursor: 'grab', mt: 0.3 }} />
          )}
          {order != null && (
            <Typography variant="caption" sx={{
              bgcolor: 'primary.main', color: '#fff', borderRadius: '50%',
              width: 24, height: 24, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 700, flexShrink: 0, mt: 0.3,
            }}>
              {order}
            </Typography>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {module.name}
              </Typography>
              {completed && <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />}
            </Box>
            <Typography variant="body2" color="text.secondary" noWrap>
              {module.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
              <Chip label={module.expert} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
              <Chip
                label={module.difficulty}
                size="small"
                color={difficultyColors[module.difficulty] || 'default'}
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
              {module.approach && (
                <Chip label={module.approach} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
              )}
            </Box>
          </Box>
          {onAdd && !inPlan && (
            <Tooltip title="Add to plan">
              <IconButton onClick={() => onAdd(module)} color="primary" sx={{ minWidth: 44, minHeight: 44 }}>
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}
          {onRemove && inPlan && (
            <Tooltip title="Remove from plan">
              <IconButton onClick={() => onRemove(module)} color="error" sx={{ minWidth: 44, minHeight: 44 }}>
                <RemoveIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ModuleCard;
