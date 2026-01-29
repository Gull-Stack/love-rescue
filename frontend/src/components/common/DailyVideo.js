import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Checkbox,
  FormControlLabel,
  Chip,
  Skeleton,
  Box,
} from '@mui/material';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import { videosApi } from '../../services/api';

const DailyVideo = () => {
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [fallbackText, setFallbackText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [videoRes, streakRes] = await Promise.all([
        videosApi.getDaily(),
        videosApi.getStreak().catch(() => ({ data: { streak: 0 } })),
      ]);
      setVideo(videoRes.data.video);
      setCompleted(videoRes.data.completed);
      setFallbackText(videoRes.data.fallbackText || '');
      setStreak(streakRes.data.streak);
    } catch (err) {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!video || completed) return;
    try {
      await videosApi.markComplete(video.id);
      setCompleted(true);
      setStreak((s) => s + 1);
    } catch (err) {
      // Silently fail
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="rectangular" width="100%" height={0} sx={{ pb: '56.25%', borderRadius: 1 }} />
          <Skeleton variant="text" width="80%" sx={{ mt: 1 }} />
        </CardContent>
      </Card>
    );
  }

  if (!video) {
    if (!fallbackText) return null;
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <OndemandVideoIcon color="primary" />
            <Typography variant="h6">Daily Video</Typography>
          </Box>
          <Typography color="text.secondary">{fallbackText}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <OndemandVideoIcon color="primary" />
          <Typography variant="h6">Daily Video</Typography>
          <Chip
            label={`Week ${video.week}, Day ${video.day}`}
            size="small"
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
          {streak > 0 && (
            <Chip
              icon={<WhatshotIcon />}
              label={`${streak} day streak`}
              size="small"
              color="warning"
            />
          )}
        </Box>

        {/* Responsive YouTube embed (16:9 aspect ratio) */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingBottom: '56.25%',
            height: 0,
            overflow: 'hidden',
            borderRadius: 1,
            mb: 2,
          }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}`}
            title={video.title}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 0,
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </Box>

        <Typography variant="subtitle1" fontWeight="bold">
          {video.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {video.description}
        </Typography>

        <FormControlLabel
          control={
            <Checkbox
              checked={completed}
              onChange={handleComplete}
              disabled={completed}
              color="success"
            />
          }
          label={completed ? 'Watched' : 'Mark as watched'}
        />
      </CardContent>
    </Card>
  );
};

export default DailyVideo;
