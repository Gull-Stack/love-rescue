import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

const styleId = 'save-check-styles';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const s = document.createElement('style');
  s.id = styleId;
  s.textContent = `
    @keyframes checkDraw {
      0% { stroke-dashoffset: 50; }
      100% { stroke-dashoffset: 0; }
    }
    @keyframes checkScale {
      0% { transform: scale(0.5); opacity: 0; }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); opacity: 1; }
    }
    .save-check-circle {
      animation: checkScale 0.5s ease-out forwards;
    }
    .save-check-path {
      stroke-dasharray: 50;
      stroke-dashoffset: 50;
      animation: checkDraw 0.4s ease-out 0.3s forwards;
    }
  `;
  document.head.appendChild(s);
}

const SaveCheckmark = ({ show, onDone }) => {
  useEffect(() => {
    if (show) {
      const t = setTimeout(() => onDone?.(), 1500);
      return () => clearTimeout(t);
    }
  }, [show, onDone]);

  if (!show) return null;

  return (
    <Box sx={{
      position: 'fixed', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      bgcolor: 'rgba(0,0,0,0.3)', zIndex: 99999,
    }}>
      <Box className="save-check-circle" sx={{
        width: 100, height: 100, borderRadius: '50%',
        bgcolor: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="50" height="50" viewBox="0 0 50 50">
          <path className="save-check-path" d="M12 25 L22 35 L38 15" 
            fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Box>
    </Box>
  );
};

export default SaveCheckmark;
