import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Button,
  Link,
} from '@mui/material';

// Shared, resource-first crisis support dialog. Shown when a backend write
// (daily log, gratitude, goals, real talk) returns a `crisis` payload:
// `{ message, resources: [{ name, contact, available, url }], ... }`.
// Warm and never alarmist or shaming; the underlying entry is already saved.

// Turn a resource contact string ("Call or text 988", "Text HOME to 741741",
// "Call 1-800-799-7233 or text START to 88788") into tappable tel:/sms: links.
// Returns [] when nothing parseable is found; caller falls back to plain text.
export const getContactActions = (contact = '') => {
  const actions = [];
  const call = contact.match(/call(?:\s+or\s+text)?\s+(\d[\d-]*\d|\d+)/i);
  if (call) {
    actions.push({ label: `Call ${call[1]}`, href: `tel:${call[1]}` });
  }
  const text = contact.match(/text\s+(?:([A-Za-z]+)\s+to\s+)?(\d[\d-]*\d|\d+)/i);
  if (text) {
    const [, keyword, number] = text;
    actions.push({
      label: keyword ? `Text ${keyword} to ${number}` : `Text ${number}`,
      href: `sms:${number}${keyword ? `?&body=${keyword}` : ''}`,
    });
  }
  return actions;
};

const CrisisSupportDialog = ({ open, crisis, onDismiss }) => (
  <Dialog
    open={open}
    onClose={onDismiss}
    PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
  >
    <DialogTitle sx={{ fontWeight: 700 }}>
      Before you go — we're here
    </DialogTitle>
    <DialogContent>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {crisis?.message ||
          "It sounds like you're carrying something heavy right now. You don't have to hold it alone."}
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        If you'd like to talk to someone, these people are ready to listen — anytime, for free:
      </Typography>
      {(crisis?.resources || []).map((resource) => {
        const actions = getContactActions(resource?.contact || '');
        return (
          <Box key={resource?.name || resource?.contact} sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {resource?.url ? (
                <Link href={resource.url} target="_blank" rel="noopener noreferrer" underline="hover">
                  {resource?.name}
                </Link>
              ) : (
                resource?.name
              )}
            </Typography>
            {actions.length > 0 ? (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {actions.map((action) => (
                  <Link key={action.href} href={action.href} variant="body1" sx={{ fontWeight: 600 }}>
                    {action.label}
                  </Link>
                ))}
              </Box>
            ) : (
              <Typography variant="body1">{resource?.contact}</Typography>
            )}
            {resource?.available && (
              <Typography variant="body2" color="text.secondary">
                Available {resource.available}
              </Typography>
            )}
          </Box>
        );
      })}
      <Typography variant="body2" color="text.secondary">
        Confidential, judgment-free, and there whenever you need them. What you wrote
        is saved — nothing changes that.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button
        variant="contained"
        onClick={onDismiss}
        sx={{ textTransform: 'none', fontWeight: 'bold' }}
      >
        I'm safe — continue
      </Button>
    </DialogActions>
  </Dialog>
);

export default CrisisSupportDialog;
