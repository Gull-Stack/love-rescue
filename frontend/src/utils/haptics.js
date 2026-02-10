/**
 * Haptic feedback utility - wraps @capacitor/haptics with graceful web fallback
 */

let Haptics = null;
let ImpactStyle = null;
let NotificationType = null;

// Lazy-load Capacitor haptics
const loadHaptics = async () => {
  if (Haptics) return true;
  try {
    const mod = await import('@capacitor/haptics');
    Haptics = mod.Haptics;
    ImpactStyle = mod.ImpactStyle;
    NotificationType = mod.NotificationType;
    return true;
  } catch {
    return false;
  }
};

export const hapticLight = async () => {
  try {
    if (await loadHaptics()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch {}
};

export const hapticMedium = async () => {
  try {
    if (await loadHaptics()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  } catch {}
};

export const hapticSuccess = async () => {
  try {
    if (await loadHaptics()) {
      await Haptics.notification({ type: NotificationType.Success });
    }
  } catch {}
};

export const hapticError = async () => {
  try {
    if (await loadHaptics()) {
      await Haptics.notification({ type: NotificationType.Error });
    }
  } catch {}
};
