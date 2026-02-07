import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  keyframes,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import AssignmentIcon from '@mui/icons-material/Assignment';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const TodayCard = ({ 
  hasLoggedToday, 
  hasGratitudeToday,
  assessmentsDone,
  totalAssessments,
  prompt,
  partnerName,
}) => {
  const navigate = useNavigate();

  // Determine what the "one thing" should be today
  const getTask = () => {
    // Priority 1: Complete assessments if not done
    if (assessmentsDone < totalAssessments) {
      return {
        type: 'assessment',
        title: 'Complete Your Profile',
        description: `${totalAssessments - assessmentsDone} assessments left to unlock insights`,
        icon: AssignmentIcon,
        action: () => navigate('/assessments'),
        buttonText: 'Continue',
        completed: false,
        color: '#9c27b0',
        gradient: 'linear-gradient(135deg, #9c27b0 0%, #d05ce3 100%)',
      };
    }

    // Priority 2: Daily log if not done
    if (!hasLoggedToday) {
      return {
        type: 'log',
        title: 'Daily Check-in',
        description: prompt?.prompt || (partnerName 
          ? `How are things with ${partnerName} today?` 
          : 'How are you feeling today?'),
        icon: TipsAndUpdatesIcon,
        action: () => navigate('/daily'),
        buttonText: 'Log Now',
        completed: false,
        color: '#e91e63',
        gradient: 'linear-gradient(135deg, #e91e63 0%, #ff6090 100%)',
      };
    }

    // Priority 3: Gratitude if not done
    if (!hasGratitudeToday) {
      return {
        type: 'gratitude',
        title: 'Gratitude Moment',
        description: partnerName 
          ? `What do you appreciate about ${partnerName}?`
          : 'What are you grateful for today?',
        icon: VolunteerActivismIcon,
        action: () => navigate('/gratitude'),
        buttonText: 'Share',
        completed: false,
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      };
    }

    // All done! Celebration state
    return {
      type: 'complete',
      title: "You're crushing it! 🎉",
      description: 'All daily tasks complete. Come back tomorrow!',
      icon: CheckCircleIcon,
      action: null,
      buttonText: null,
      completed: true,
      color: '#4caf50',
      gradient: 'linear-gradient(135deg, #4caf50 0%, #80e27e 100%)',
    };
  };

  const task = getTask();
  const IconComponent = task.icon;

  return (
    <Card
      sx={{
        background: task.completed 
          ? task.gradient 
          : 'background.paper',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}
    >
      {/* Shimmer effect for incomplete tasks */}
      {!task.completed && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, transparent, ${task.color}40, transparent)`,
            backgroundSize: '200% 100%',
            animation: `${shimmer} 2s linear infinite`,
          }}
        />
      )}

      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: task.completed ? 'rgba(255,255,255,0.2)' : `${task.color}15`,
            }}
          >
            <IconComponent 
              sx={{ 
                color: task.completed ? 'white' : task.color,
                fontSize: 24,
              }} 
            />
          </Box>
          <Typography 
            variant="overline" 
            sx={{ 
              color: task.completed ? 'rgba(255,255,255,0.9)' : 'text.secondary',
              fontWeight: 'bold',
              letterSpacing: 1,
            }}
          >
            Your one thing today
          </Typography>
          {task.completed && (
            <Chip 
              label="Done" 
              size="small" 
              sx={{ 
                ml: 'auto',
                bgcolor: 'rgba(255,255,255,0.3)',
                color: 'white',
                fontWeight: 'bold',
              }} 
            />
          )}
        </Box>

        {/* Title */}
        <Typography 
          variant="h5" 
          fontWeight="bold" 
          gutterBottom
          sx={{ color: task.completed ? 'white' : 'text.primary' }}
        >
          {task.title}
        </Typography>

        {/* Description */}
        <Typography 
          variant="body1" 
          sx={{ 
            color: task.completed ? 'rgba(255,255,255,0.9)' : 'text.secondary',
            mb: task.action ? 2 : 0,
            lineHeight: 1.5,
          }}
        >
          {task.description}
        </Typography>

        {/* Action button */}
        {task.action && (
          <Button
            variant="contained"
            onClick={task.action}
            fullWidth
            sx={{
              py: 1.5,
              fontWeight: 'bold',
              fontSize: '1rem',
              background: task.gradient,
              boxShadow: `0 4px 15px ${task.color}40`,
              '&:hover': {
                boxShadow: `0 6px 20px ${task.color}60`,
              },
            }}
          >
            {task.buttonText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayCard;
