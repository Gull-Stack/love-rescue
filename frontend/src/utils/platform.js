import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for Love Rescue.
 * Use these to conditionally show native IAP vs Stripe, 
 * register push tokens, and adjust UI.
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
 * Should we use Apple IAP for subscriptions?
 * True only when running natively on iOS.
 */
export const useAppleIAP = () => isIOS() && isNative();

/**
 * Should we use Stripe for subscriptions?
 * True on web or Android.
 */
export const useStripeCheckout = () => !useAppleIAP();
