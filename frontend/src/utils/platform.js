import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for Love Rescue.
 * IAP/payment hooks always return false — the app is fully free.
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
 * Apple IAP — always disabled; app is free.
 */
export const useAppleIAP = () => false;

/**
 * Stripe checkout — always disabled; app is free.
 */
export const useStripeCheckout = () => false;
