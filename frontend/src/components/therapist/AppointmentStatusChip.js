import React from 'react';
import { Chip } from '@mui/material';

const STATUS_META = {
  scheduled: { label: 'Scheduled', color: 'primary' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'default' },
  no_show: { label: 'No-show', color: 'warning' },
};

/** Small status chip for appointments — shared by therapist + client views. */
const AppointmentStatusChip = ({ status, ...chipProps }) => {
  const meta = STATUS_META[status] || { label: status || 'Unknown', color: 'default' };
  return <Chip label={meta.label} color={meta.color} size="small" variant="outlined" {...chipProps} />;
};

export default AppointmentStatusChip;
