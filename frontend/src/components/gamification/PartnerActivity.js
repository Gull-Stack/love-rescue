import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import Confetti from './Confetti';

// Partner Status Card - Shows if partner has logged today
export const PartnerStatusCard = ({ onNudge }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState(false);
  const [nudgeResult, setNudgeResult] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/partner/partner-status');
        setStatus(response.data);
      } catch (error) {
        console.error('Error fetching partner status:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleNudge = async () => {
    setNudging(true);
    try {
      const response = await api.post('/partner/nudge-partner');
      setNudgeResult({ success: true, message: response.data.message });
      setTimeout(() => setNudgeResult(null), 5000);
    } catch (error) {
      setNudgeResult({ 
        success: false, 
        message: error.response?.data?.message || 'Could not send nudge'
      });
      setTimeout(() => setNudgeResult(null), 5000);
    } finally {
      setNudging(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
        <div className="h-16 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!status?.hasPartner) {
    return (
      <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 rounded-xl p-4 border border-pink-500/20">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💕</span>
          <div>
            <p className="text-white font-medium">Invite your partner!</p>
            <p className="text-gray-400 text-sm">Share your journey together</p>
          </div>
        </div>
      </div>
    );
  }

  const { partnerName, partnerLoggedToday, userLoggedToday, partnerStreak, nudgeMessage } = status;

  return (
    <motion.div
      className={`rounded-xl p-4 border transition-all ${
        partnerLoggedToday && userLoggedToday
          ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30'
          : partnerLoggedToday
            ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/30'
            : 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-gray-700/50'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Partner avatar and status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
            partnerLoggedToday ? 'bg-green-500/20' : 'bg-gray-700'
          }`}>
            {partnerLoggedToday ? '✅' : '😴'}
          </div>
          <div>
            <p className="text-white font-bold">{partnerName}</p>
            <p className="text-gray-400 text-sm">
              {partnerLoggedToday ? 'Logged today!' : 'Hasn\'t logged yet'}
            </p>
          </div>
        </div>
        
        {/* Partner streak */}
        {partnerStreak > 0 && (
          <div className="text-center">
            <p className="text-2xl">🔥</p>
            <p className="text-xs text-gray-400">{partnerStreak} day</p>
          </div>
        )}
      </div>

      {/* Nudge message */}
      <div className="mt-3 p-3 bg-black/20 rounded-lg">
        <p className="text-sm text-gray-300">{nudgeMessage}</p>
      </div>

      {/* Nudge button - only show if user logged but partner hasn't */}
      {userLoggedToday && !partnerLoggedToday && (
        <motion.button
          onClick={handleNudge}
          disabled={nudging}
          className="mt-3 w-full py-2.5 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          whileTap={{ scale: 0.98 }}
        >
          {nudging ? (
            <>
              <span className="animate-spin">💕</span>
              Sending...
            </>
          ) : (
            <>
              <span>💌</span>
              Send Gentle Nudge
            </>
          )}
        </motion.button>
      )}

      {/* Nudge result toast */}
      <AnimatePresence>
        {nudgeResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-3 p-3 rounded-lg text-sm ${
              nudgeResult.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
            }`}
          >
            {nudgeResult.message}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Matchup Score Card - Shows alignment when both partners have logged
export const MatchupScoreCard = () => {
  const [matchup, setMatchup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const fetchMatchup = async () => {
      try {
        const response = await api.get('/partner/matchup-score');
        setMatchup(response.data);
      } catch (error) {
        console.error('Error fetching matchup:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMatchup();
  }, []);

  const handleReveal = () => {
    setRevealed(true);
    if (matchup?.alignmentScore >= 80) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 animate-pulse">
        <div className="h-24 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!matchup?.hasMatchup) {
    return null; // Don't show if no partner or neither has logged
  }

  if (!matchup.bothLogged) {
    return (
      <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl p-6 border border-purple-500/20">
        <div className="text-center">
          <span className="text-4xl mb-2 block">💕</span>
          <h3 className="text-white font-bold text-lg mb-1">Today's Matchup</h3>
          <p className="text-gray-400 text-sm">{matchup.message}</p>
          <div className="mt-4 h-4 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: matchup.userLogged || matchup.partnerLogged ? '50%' : '0%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {matchup.userLogged ? '1/2 complete' : matchup.partnerLogged ? '1/2 complete' : '0/2 complete'}
          </p>
        </div>
      </div>
    );
  }

  // Both logged - show matchup reveal
  const tierColors = {
    gold: 'from-yellow-500 to-amber-500',
    silver: 'from-gray-300 to-gray-400', 
    bronze: 'from-amber-700 to-orange-700'
  };

  return (
    <>
      {showConfetti && <Confetti />}
      
      <motion.div
        className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl p-6 border border-purple-500/20"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-center">
          <span className="text-4xl mb-2 block">💝</span>
          <h3 className="text-white font-bold text-lg mb-4">Today's Matchup</h3>
          
          {!revealed ? (
            <motion.button
              onClick={handleReveal}
              className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl transition-shadow"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ✨ Reveal Your Alignment ✨
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
            >
              {/* Score ring */}
              <div className="relative inline-block mb-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#374151"
                    strokeWidth="12"
                    fill="none"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="url(#matchupGradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={352}
                    initial={{ strokeDashoffset: 352 }}
                    animate={{ strokeDashoffset: 352 - (matchup.alignmentScore / 100) * 352 }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                  <defs>
                    <linearGradient id="matchupGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-black text-white">{matchup.alignmentScore}%</span>
                </div>
              </div>
              
              {/* Tier badge */}
              <div className={`inline-block px-4 py-1 rounded-full bg-gradient-to-r ${tierColors[matchup.celebrationTier]} text-white font-bold text-sm mb-3`}>
                {matchup.celebrationTier.toUpperCase()} ALIGNMENT
              </div>
              
              {/* Insight */}
              <p className="text-gray-300 text-sm max-w-xs mx-auto">
                {matchup.insight}
              </p>
              
              {/* Mood comparison */}
              <div className="flex justify-center gap-8 mt-4">
                <div className="text-center">
                  <p className="text-2xl">{getMoodEmoji(matchup.userMood)}</p>
                  <p className="text-xs text-gray-400">You</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl">{getMoodEmoji(matchup.partnerMood)}</p>
                  <p className="text-xs text-gray-400">Partner</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  );
};

// Helper: Get emoji for mood score
function getMoodEmoji(score) {
  if (score >= 8) return '😄';
  if (score >= 6) return '🙂';
  if (score >= 4) return '😐';
  if (score >= 2) return '😔';
  return '😢';
}

export default { PartnerStatusCard, MatchupScoreCard };
