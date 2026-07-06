import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for Love Rescue.
 *
 * Payment path is split for App Store compliance:
 *   - Web browser  → Stripe Checkout
 *   - iOS native   → Apple In-App Purchase (StoreKit)
 */

export const isNative = () => Capacitor.isNativePlatform();

export const isIOS = () => Capacitor.getPlatform() === 'ios';

export const isAndroid = () => Capacitor.getPlatform() === 'android';

export const isWeb = () => Capacitor.getPlatform() === 'web';

/**
 * Returns 'ios' | 'android' | 'web'
 */
export const getPlatform = () => Capacitor.getPlatform();

/**
 * Apple IAP — enabled only inside the iOS native shell (StoreKit). Apple
 * requires digital-goods purchases on iOS to go through IAP, not Stripe.
 */
export const useAppleIAP = () => isIOS() && isNative();

/**
 * Stripe checkout — used on the web (any browser, desktop or mobile). Native
 * iOS is excluded (must use Apple IAP); native Android can still use Stripe.
 */
export const useStripeCheckout = () => isWeb();
