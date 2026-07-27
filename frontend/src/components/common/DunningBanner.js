import React, { useState } from 'react';
import { Alert, Button } from '@mui/material';
import { paymentsApi } from '../../services/api';

const PAYMENT_ISSUE_STATUSES = new Set(['past_due', 'unpaid', 'incomplete']);

/**
 * Payment-failure banner. Before this existed, a failed card meant nothing —
 * no message anywhere — until premium calls started 402ing with no explanation.
 */
const DunningBanner = ({ status }) => {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!status || !PAYMENT_ISSUE_STATUSES.has(String(status).toLowerCase())) return null;

  const openPortal = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = await paymentsApi.openBillingPortal();
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Alert
      severity="warning"
      sx={{ mb: 2, borderRadius: 3, alignItems: 'center' }}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={openPortal}
          disabled={busy}
          sx={{ fontWeight: 700, minHeight: 44 }}
        >
          {busy ? 'Opening…' : 'Update card'}
        </Button>
      }
    >
      {failed
        ? "We couldn't open billing just now — try again in a moment."
        : 'There was a problem with your last payment. Update your card to keep your plan (your data is safe either way).'}
    </Alert>
  );
};

export default DunningBanner;
