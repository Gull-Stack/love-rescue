import React from 'react';
import { Box, Skeleton } from '@mui/material';

/**
 * PageLoader — one shared full-page loading skeleton.
 *
 * Replaces the bare centered spinner most pages used, so a load feels like the
 * page filling in rather than a blank flash. Mirrors the common layout: a
 * header strip, a hero block, then a couple of content rows.
 */
const PageLoader = () => (
  <Box sx={{ maxWidth: 600, mx: 'auto', width: '100%', px: 0, pt: 1 }} aria-busy="true" aria-label="Loading">
    <Skeleton variant="text" width="45%" height={36} sx={{ mb: 2 }} />
    <Skeleton variant="rounded" height={150} sx={{ borderRadius: 4, mb: 2.5 }} />
    <Skeleton variant="rounded" height={110} sx={{ borderRadius: 4, mb: 2 }} />
    <Skeleton variant="rounded" height={110} sx={{ borderRadius: 4 }} />
  </Box>
);

export default PageLoader;
