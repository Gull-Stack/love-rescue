import React from 'react';
import { Card, CardActionArea, CardContent, Typography, Box, Badge, Chip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ProgressRing from './ProgressRing';

const ClientCard = ({ client, onClick, view = 'card' }) => {
  const lastActive = client.lastActive
    ? new Date(client.lastActive).toLocaleDateString()
    : 'Never';

  if (view === 'list') {
    return (
      <Card sx={{ mb: 1 }}>
        <CardActionArea onClick={onClick} sx={{ minHeight: 44 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Badge badgeContent={client.unreadAlerts || 0} color="error">
                <PersonIcon color="action" />
              </Badge>
              <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }}>
                {client.name}
              </Typography>
              {client.coupleStatus && (
                <Chip
                  icon={<FavoriteIcon sx={{ fontSize: 14 }} />}
                  label={client.coupleStatus}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 24 }}
                />
              )}
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {lastActive}
              </Typography>
              <ProgressRing value={client.progress || 0} size={36} thickness={3} />
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%', minHeight: 44 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Badge badgeContent={client.unreadAlerts || 0} color="error">
              <PersonIcon sx={{ fontSize: 32 }} color="action" />
            </Badge>
            <ProgressRing value={client.progress || 0} size={48} thickness={4} />
          </Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {client.name}
          </Typography>
          {client.coupleStatus && (
            <Chip
              icon={<FavoriteIcon sx={{ fontSize: 14 }} />}
              label={client.coupleStatus}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mb: 1, height: 24 }}
            />
          )}
          <Typography variant="caption" color="text.secondary" display="block">
            Last active: {lastActive}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default ClientCard;
