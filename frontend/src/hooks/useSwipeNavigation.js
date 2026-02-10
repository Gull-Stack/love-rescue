import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TAB_ROUTES = ['/dashboard', '/strategies', '/daily', '/matchup', '/settings'];
const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.3;
const EDGE_EXCLUSION = 20; // px from left edge to avoid browser back gesture

// Routes where swipe nav should be disabled (forms, quizzes, etc.)
const DISABLED_PATTERNS = ['/assessments/', '/meetings/', '/signup', '/login', '/join'];

export default function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchRef = useRef({ startX: 0, startY: 0, startTime: 0 });

  const isEnabled = useCallback(() => {
    const path = location.pathname;
    // Only on main tab pages
    if (!TAB_ROUTES.some(r => path === r || path.startsWith(r + '/'))) return false;
    // Disabled inside forms/quizzes
    if (DISABLED_PATTERNS.some(p => path.includes(p))) return false;
    return true;
  }, [location.pathname]);

  useEffect(() => {
    const onTouchStart = (e) => {
      if (!isEnabled()) return;
      const touch = e.touches[0];
      // Exclude left edge to not conflict with browser back
      if (touch.clientX < EDGE_EXCLUSION) return;
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
      };
    };

    const onTouchEnd = (e) => {
      if (!isEnabled()) return;
      const touch = e.changedTouches[0];
      const { startX, startY, startTime } = touchRef.current;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const dt = Date.now() - startTime;

      // Must be mostly horizontal
      if (Math.abs(dy) > Math.abs(dx) * 0.7) return;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (dt === 0) return;
      const velocity = Math.abs(dx) / dt;
      if (velocity < VELOCITY_THRESHOLD) return;

      const currentPath = location.pathname;
      const currentIdx = TAB_ROUTES.findIndex(r => currentPath === r || currentPath.startsWith(r + '/'));
      if (currentIdx < 0) return;

      const nextIdx = dx < 0 ? currentIdx + 1 : currentIdx - 1;
      if (nextIdx >= 0 && nextIdx < TAB_ROUTES.length) {
        navigate(TAB_ROUTES[nextIdx]);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isEnabled, navigate, location.pathname]);
}
