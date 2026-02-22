/**
 * useCelebrations Hook
 * Manages celebration checks and triggering for activity completions
 */

import { useState, useCallback } from 'react';
import api from '../services/api';

export const useCelebrations = () => {
  const [celebration, setCelebration] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * Check if user has earned any celebrations
   */
  const checkForCelebrations = useCallback(async () => {
    try {
      const response = await api.get('/api/celebrations/check');
      
      if (response.data.celebration) {
        setCelebration(response.data);
        setIsModalOpen(true);
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to check celebrations:', error);
      return null;
    }
  }, []);

  /**
   * Trigger celebration for skill unlock
   */
  const celebrateSkillUnlock = useCallback(async (techniqueId, techniqueName, expertName) => {
    try {
      const response = await api.post('/api/celebrations/skill-unlock', {
        techniqueId,
        techniqueName,
        expertName,
      });

      if (response.data.celebration) {
        setCelebration(response.data);
        setIsModalOpen(true);
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to trigger skill unlock celebration:', error);
      return null;
    }
  }, []);

  /**
   * Trigger celebration for breakthrough moment
   */
  const celebrateBreakthrough = useCallback(async (expertName) => {
    try {
      const response = await api.post('/api/celebrations/breakthrough', {
        expertName,
      });

      if (response.data.celebration) {
        setCelebration(response.data);
        setIsModalOpen(true);
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to trigger breakthrough celebration:', error);
      return null;
    }
  }, []);

  /**
   * Mark celebration as shown (prevent re-showing)
   */
  const markShown = useCallback(async (celebrationType) => {
    try {
      await api.post('/api/celebrations/mark-shown', {
        celebration: celebrationType,
      });
    } catch (error) {
      console.error('Failed to mark celebration as shown:', error);
    }
  }, []);

  /**
   * Close celebration modal
   */
  const closeCelebration = useCallback(async () => {
    if (celebration?.celebration) {
      await markShown(celebration.celebration);
    }
    setIsModalOpen(false);
    setCelebration(null);
  }, [celebration, markShown]);

  return {
    celebration,
    isModalOpen,
    checkForCelebrations,
    celebrateSkillUnlock,
    celebrateBreakthrough,
    closeCelebration,
  };
};

export default useCelebrations;
