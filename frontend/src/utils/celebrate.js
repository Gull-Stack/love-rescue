/**
 * celebrate — one place for "you did a thing" delight.
 *
 * Wraps canvas-confetti (already a dependency) so every big moment in the app
 * pops the SAME tuned confetti AND fires a haptic on device. Previously the app
 * had three unrelated confetti codepaths and most visual wins were silent on
 * the phone — this unifies them.
 *
 * Colors are the grounded brand (teal / amber / slate), not rainbow candy.
 */

import confetti from 'canvas-confetti';
import { hapticSuccess, hapticMedium } from './haptics';

const BRAND_COLORS = ['#0E9F8E', '#2DD4BF', '#E08A3C', '#F0A55C', '#33455B'];

/**
 * @param {Object} opts
 *   big     — double-burst, wider spread (for headline reveals / mastery)
 *   hearts  — rain heart emojis (for partner / love moments)
 *   haptic  — fire a success buzz (default true)
 */
export function celebrate({ big = false, hearts = false, haptic = true } = {}) {
  try {
    confetti({
      particleCount: big ? 160 : 110,
      spread: big ? 95 : 70,
      startVelocity: big ? 52 : 45,
      origin: { y: 0.6 },
      colors: BRAND_COLORS,
      disableForReducedMotion: true,
    });

    if (big) {
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          startVelocity: 40,
          origin: { y: 0.7 },
          colors: BRAND_COLORS,
          disableForReducedMotion: true,
        });
      }, 250);
    }

    if (hearts) {
      // canvas-confetti can render text glyphs as particles
      const heart = confetti.shapeFromText ? confetti.shapeFromText({ text: '❤️', scalar: 2 }) : undefined;
      setTimeout(() => {
        confetti({
          particleCount: 26,
          spread: 100,
          startVelocity: 38,
          scalar: 2,
          origin: { y: 0.55 },
          ...(heart ? { shapes: [heart] } : { colors: ['#D14343', '#E36868'] }),
          disableForReducedMotion: true,
        });
      }, 150);
    }
  } catch {
    // confetti is pure delight — never let it break a flow
  }

  if (haptic) {
    if (big) hapticMedium();
    hapticSuccess();
  }
}

export default celebrate;
