/**
 * IAP Service — DISABLED
 *
 * The app is now fully free. StoreKit/Apple IAP integration has been removed.
 * All exports are no-ops for backward compatibility with any remaining imports.
 */

export async function initialize() {
  return false;
}

export function getProducts() {
  return [];
}

export function getProduct(_plan) {
  return null;
}

export async function purchase(_plan) {
  throw new Error('Purchases are not available — the app is free.');
}

export async function restorePurchases() {
  return;
}

export function isAvailable() {
  return false;
}

export function isReady() {
  return false;
}

const iapService = {
  initialize,
  getProducts,
  getProduct,
  purchase,
  restorePurchases,
  isAvailable,
  isReady,
};

export default iapService;
