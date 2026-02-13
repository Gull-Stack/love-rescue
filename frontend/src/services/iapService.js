/**
 * Apple In-App Purchase Service for LoveRescue
 *
 * Uses cordova-plugin-purchase (CdvPurchase) for StoreKit 2 integration.
 * Only active on iOS native — all methods are safe no-ops on web/Android.
 *
 * Product IDs (configured in App Store Connect):
 *   - com.gullstack.loverescue.premium.monthly  ($13.99/mo)
 *   - com.gullstack.loverescue.premium.annual   ($109.99/yr)
 */

import { isIOS, isNative } from '../utils/platform';
import api from './api';

// ── Product Configuration ──────────────────────────────────────────────
const PRODUCT_IDS = {
  monthly: 'com.gullstack.loverescue.premium.monthly',
  annual: 'com.gullstack.loverescue.premium.annual',
};

// Map Subscribe page plan names → product IDs
const PLAN_TO_PRODUCT = {
  monthly: PRODUCT_IDS.monthly,
  yearly: PRODUCT_IDS.annual,
};

// ── Module State ───────────────────────────────────────────────────────
let store = null;
let initialized = false;
let initPromise = null;
let isInitializing = false;

// Map of pending purchase callbacks keyed by a counter to avoid overlap
let purchaseCallbackId = 0;
const pendingPurchases = new Map();

// ── Helpers ────────────────────────────────────────────────────────────

/** Get the CdvPurchase global (only available on native iOS after plugin loads) */
function getCdvPurchase() {
  if (typeof window !== 'undefined' && window.CdvPurchase) {
    return window.CdvPurchase;
  }
  return null;
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Initialize the IAP store. Call once at app startup.
 * Safe to call on any platform — returns false on web/Android.
 */
export async function initialize() {
  if (!(isIOS() && isNative())) return false;
  if (initialized) return true;
  if (isInitializing && initPromise) return initPromise;

  isInitializing = true;
  initPromise = _doInitialize();
  return initPromise;
}

async function _doInitialize() {
  try {
    // Small delay for the Cordova plugin to register on window
    await new Promise((r) => setTimeout(r, 200));

    const CdvPurchase = getCdvPurchase();
    if (!CdvPurchase) {
      console.warn('[IAP] CdvPurchase plugin not available');
      isInitializing = false;
      return false;
    }

    store = CdvPurchase.store;

    // Logging (reduce to WARNING for production)
    store.verbosity = CdvPurchase.LogLevel.WARNING;

    // ── Register products ──────────────────────────────────────────
    store.register([
      {
        id: PRODUCT_IDS.monthly,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
      },
      {
        id: PRODUCT_IDS.annual,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
      },
    ]);

    // ── Transaction lifecycle ──────────────────────────────────────
    store
      .when()
      .approved(async (transaction) => {
        console.log('[IAP] Transaction approved:', transaction.transactionId);
        try {
          await _verifyWithBackend(transaction);
          transaction.finish();
          // Resolve the most recent pending purchase
          _resolvePendingPurchase(transaction);
        } catch (err) {
          console.error('[IAP] Backend verification failed:', err);
          // Still finish the transaction to avoid stuck purchases (Apple requirement)
          transaction.finish();
          _rejectPendingPurchase(err);
        }
      })
      .finished((transaction) => {
        console.log('[IAP] Transaction finished:', transaction.transactionId);
      });

    // ── Initialize the Apple App Store platform ────────────────────
    await store.initialize([CdvPurchase.Platform.APPLE_APPSTORE]);

    initialized = true;
    isInitializing = false;
    console.log('[IAP] Store initialized. Products:', store.products.length);
    return true;
  } catch (err) {
    console.error('[IAP] Initialization failed:', err);
    isInitializing = false;
    initPromise = null; // allow retry
    return false;
  }
}

/**
 * Get available products with Apple's localized prices.
 * Returns [{ id, plan, title, description, price, priceMicros, currency, period, savings }]
 * Returns empty array if products aren't loaded yet (caller should show loading state).
 */
export function getProducts() {
  if (!store || !initialized) return [];

  const products = [];

  for (const [plan, productId] of Object.entries(PLAN_TO_PRODUCT)) {
    const product = store.get(productId);
    if (product) {
      const offer = product.offers && product.offers[0];
      const pricing = offer && offer.pricingPhases && offer.pricingPhases[0];

      products.push({
        id: productId,
        plan,
        title: product.title || (plan === 'monthly' ? 'Monthly Premium' : 'Annual Premium'),
        description: product.description || '',
        price: pricing ? pricing.price : '',
        priceMicros: pricing ? pricing.priceMicros : 0,
        currency: pricing ? pricing.currency : 'USD',
        period: plan === 'monthly' ? '/month' : '/year',
        savings: plan === 'yearly' ? 'Save 34%' : null,
      });
    }
  }

  return products;
}

/**
 * Get a single product by plan name ('monthly' | 'yearly').
 */
export function getProduct(plan) {
  return getProducts().find((p) => p.plan === plan) || null;
}

/**
 * Initiate a purchase for the given plan.
 * Returns a Promise that resolves when the purchase completes (or rejects on failure).
 */
export function purchase(plan) {
  return new Promise(async (resolve, reject) => {
    if (!store || !initialized) {
      return reject(new Error('IAP store not initialized'));
    }

    const productId = PLAN_TO_PRODUCT[plan];
    if (!productId) {
      return reject(new Error(`Unknown plan: ${plan}`));
    }

    const product = store.get(productId);
    if (!product) {
      return reject(new Error('Product not found in App Store'));
    }

    const offer = product.getOffer();
    if (!offer) {
      return reject(new Error('No offer available for this product'));
    }

    // Register this purchase with a unique ID to avoid callback overlap
    const callbackId = ++purchaseCallbackId;
    pendingPurchases.set(callbackId, { resolve, reject });

    // Auto-cleanup after 5 minutes (timeout safety)
    const timeoutId = setTimeout(() => {
      if (pendingPurchases.has(callbackId)) {
        pendingPurchases.delete(callbackId);
        reject(new Error('Purchase timed out'));
      }
    }, 5 * 60 * 1000);

    // Store the timeout so we can clear it
    const entry = pendingPurchases.get(callbackId);
    if (entry) entry.timeoutId = timeoutId;

    try {
      const result = await store.order(offer);
      // If order() returns an error synchronously
      if (result && result.isError) {
        _cleanupPurchase(callbackId);
        reject(new Error(result.message || 'Purchase failed'));
      }
    } catch (err) {
      _cleanupPurchase(callbackId);
      reject(err);
    }
  });
}

/**
 * Restore previous purchases.
 * Triggers re-validation of owned subscriptions.
 */
export async function restorePurchases() {
  if (!store || !initialized) {
    throw new Error('IAP store not initialized');
  }
  await store.restorePurchases();
}

/**
 * Check if Apple IAP should be used on this platform.
 */
export function isAvailable() {
  return isIOS() && isNative();
}

/**
 * Check if the store is initialized and ready for purchases.
 */
export function isReady() {
  return initialized && store !== null;
}

// ── Internal: Purchase Callback Management ─────────────────────────────

function _resolvePendingPurchase(transaction) {
  // Resolve the most recent pending purchase
  const entries = Array.from(pendingPurchases.entries());
  if (entries.length > 0) {
    const [id, entry] = entries[entries.length - 1];
    _cleanupPurchase(id);
    entry.resolve(transaction);
  }
}

function _rejectPendingPurchase(err) {
  const entries = Array.from(pendingPurchases.entries());
  if (entries.length > 0) {
    const [id, entry] = entries[entries.length - 1];
    _cleanupPurchase(id);
    entry.reject(err);
  }
}

function _cleanupPurchase(callbackId) {
  const entry = pendingPurchases.get(callbackId);
  if (entry) {
    if (entry.timeoutId) clearTimeout(entry.timeoutId);
    pendingPurchases.delete(callbackId);
  }
}

// ── Internal: Backend Verification ─────────────────────────────────────

/**
 * Send transaction data to our backend for server-side Apple receipt validation.
 * Includes a 15-second timeout to ensure transaction.finish() is called promptly.
 */
async function _verifyWithBackend(transaction) {
  // Extract receipt data from the transaction
  const appReceipt = store.getApplicationReceipt
    ? store.getApplicationReceipt()
    : null;

  const receiptData =
    (appReceipt &&
      appReceipt.nativePurchase &&
      appReceipt.nativePurchase.appStoreReceipt) ||
    (transaction.nativePurchase &&
      transaction.nativePurchase.appStoreReceipt) ||
    null;

  // 15-second timeout for backend verification
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await api.post(
      '/iap/verify',
      {
        transactionId: transaction.transactionId,
        productId:
          transaction.products && transaction.products[0]
            ? transaction.products[0].id
            : null,
        receiptData: receiptData,
        platform: 'apple',
      },
      { signal: controller.signal }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Verification failed');
    }

    return response.data;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Default Export ──────────────────────────────────────────────────────
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
