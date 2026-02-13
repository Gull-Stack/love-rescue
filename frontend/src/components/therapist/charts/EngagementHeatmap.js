import React, { useMemo, useState } from 'react';
import { Box, Typography, Skeleton, Tooltip as MuiTooltip, Popover } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const CELL_SIZE = 14;
const CELL_GAP = 2;
const DAYS_TO_SHOW = 90;
const WEEK_DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const getIntensityColor = (level, baseColor) => {
  if (!level) return '#ebedf0';
  const opacities = [0, 0.25, 0.5, 0.75, 1.0];
  const clamped = Math.min(Math.max(level, 0), 4);
  return baseColor + Math.round(opacities[clamped] * 255).toString(16).padStart(2, '0');
};

const buildDateMap = (data) => {
  const map = {};
  (data || []).forEach((d) => { map[d.date] = d; });
  return map;
};

const getDatesGrid = (days) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  // Align to Sunday
  start.setDate(start.getDate() - start.getDay());

  const weeks = [];
  let current = new Date(start);
  while (current <= end || weeks.length === 0 || weeks[weeks.length - 1].length < 7) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek === 0) weeks.push([]);
    const dateStr = current.toISOString().slice(0, 10);
    if (weeks.length) weeks[weeks.length - 1].push(dateStr);
    current.setDate(current.getDate() + 1);
    if (weeks.length > 15 && dayOfWeek === 6) break;
  }
  return weeks;
};

const HeatmapRow = ({ label, weeks, dataMap, color, onCellClick }) => {
  const theme = useTheme();
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: `${CELL_GAP}px` }}>
        {/* Day labels */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${CELL_GAP}px`, mr: 0.5, minWidth: 24 }}>
          {WEEK_DAYS.map((d, i) => (
            <Typography key={i} variant="caption" sx={{ height: CELL_SIZE, lineHeight: `${CELL_SIZE}px`, fontSize: 9, color: 'text.secondary' }}>
              {d}
            </Typography>
          ))}
        </Box>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <Box key={wi} sx={{ display: 'flex', flexDirection: 'column', gap: `${CELL_GAP}px` }}>
            {week.map((date) => {
              const entry = dataMap[date];
              const level = entry?.level ?? 0;
              const bg = getIntensityColor(level, color);
              return (
                <MuiTooltip
                  key={date}
                  title={`${date}: ${entry ? `${entry.count ?? level} activities` : 'No activity'}`}
                  arrow
                  placement="top"
                >
                  <Box
                    onClick={() => onCellClick?.(date, entry)}
                    sx={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: '2px',
                      bgcolor: bg,
                      cursor: onCellClick ? 'pointer' : 'default',
                      border: `1px solid ${theme.palette.divider}20`,
                      '&:hover': { outline: `2px solid ${color}`, outlineOffset: -1 },
                    }}
                  />
                </MuiTooltip>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const EngagementHeatmap = ({
  activityData = [],
  partnerData = [],
  partner1Name = 'Partner A',
  partner2Name = 'Partner B',
  days = DAYS_TO_SHOW,
  loading = false,
  onDayClick,
}) => {
  const theme = useTheme();
  const [popover, setPopover] = useState(null);

  const weeks = useMemo(() => getDatesGrid(days), [days]);
  const map1 = useMemo(() => buildDateMap(activityData), [activityData]);
  const map2 = useMemo(() => buildDateMap(partnerData), [partnerData]);

  const handleCellClick = (date, entry) => {
    if (onDayClick) onDayClick(date, entry);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={24} />
        <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1, mt: 1 }} />
        <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1, mt: 2 }} />
      </Box>
    );
  }

  if (!activityData.length && !partnerData.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }} role="img" aria-label="No engagement data available">
        <CalendarTodayIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">No activity data yet</Typography>
        <Typography variant="body2" color="text.secondary">Daily engagement will appear here as partners use the app.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }} role="img" aria-label="Engagement heatmap showing daily activity for both partners">
      <HeatmapRow
        label={partner1Name}
        weeks={weeks}
        dataMap={map1}
        color={theme.palette.primary.main}
        onCellClick={handleCellClick}
      />
      {partnerData.length > 0 && (
        <HeatmapRow
          label={partner2Name}
          weeks={weeks}
          dataMap={map2}
          color={theme.palette.secondary.main}
          onCellClick={handleCellClick}
        />
      )}
      {/* Legend */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Less</Typography>
        {[0, 1, 2, 3, 4].map((level) => (
          <Box
            key={level}
            sx={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              borderRadius: '2px',
              bgcolor: getIntensityColor(level, theme.palette.primary.main),
              border: `1px solid ${theme.palette.divider}20`,
            }}
          />
        ))}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>More</Typography>
      </Box>
    </Box>
  );
};

export default EngagementHeatmap;
