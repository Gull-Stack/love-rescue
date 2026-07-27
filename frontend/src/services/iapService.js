/**
 * IAP Service — Apple In-App Purchase (StoreKit) via cordova-plugin-purchase.
 *
 * Runs only inside the iOS native shell. On web (and Jest) every method is a
 * safe no-op / rejection — the web funnel uses Stripe Checkout instead.
 *
 * The plugin (`cordova-plugin-purchase`, aka `CdvPurchase`) is a maintained,
 * framework-agnostic StoreKit wrapper that surfaces the raw base64 App Store
 * receipt. We hand that receipt to our own backend (`POST /subscriptions/
 * verify-apple`), which validates it against Apple (prod → sandbox on 21007)
 * and writes the couple-aware entitlement. We deliberately do NOT use the
 * plugin's built-in remote validator — validation is our server's job.
 *
 * ── MANUAL / PENDING (requires App Store Connect + a physical device) ──────
 *   1. Create the two auto-renewing subscription products in App Store Connect
 *      with the IDs in PRODUCT_IDS below (or change them to match your ASC
 *      config — they must line up on both sides).
 *   2. Add the `cordova-plugin-purchase` iOS native project via `npx cap sync
 *      ios`, enable the In-App Purchase capability, and add a StoreKit
 *      configuration file for local testing.
 *   3. Device-test purchase + restore against sandbox. The exact field that
 *      carries the base64 receipt can vary by StoreKit version; extractReceipt
 *      below checks every documented location and logs if none matched so it
 *      can be pinned down on-device. Everything else is production code.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { isIOS, isNative } from '../utils/platform';

// Apple IAP is the correct payment path only inside the iOS native shell.
// (Mirrors platform.useAppleIAP, but named as a plain predicate so it can be
// called from these non-component service functions without tripping the
// react-hooks/rules-of-hooks lint on the `use` prefix.)
function iapSupported() {
  return isIOS() && isNative();
}

/**
 * Tier → App Store product identifier. These must exist in App Store Connect
 * as auto-renewing subscriptions. Keep in sync with the backend's expectations.
 */
export const PRODUCT_IDS = {
  premium: 'com.loverescue.premium.monthly',
  annual: 'com.loverescue.annual',
};

/** Reverse lookup: product id → tier. */
const TIER_BY_PRODUCT = Object.entries(PRODUCT_IDS).reduce((acc, [tier, id]) => {
  acc[id] = tier;
  return acc;
}, {});

// Lazily-loaded plugin globals + init state (module singletons).
let CdvPurchase = null;
let store = null;
let initialized = false;
let initializing = null;

/** True only where Apple IAP is the correct payment path (iOS native). */
export function isAvailable() {
  return iapSupported();
}

/**
 * Load the plugin bundle (executes on native only). The plugin attaches its
 * namespace to `window.CdvPurchase`; we also handle a module-shaped export.
 */
async function loadPlugin() {
  if (CdvPurchase) return CdvPurchase;
  const mod = await import('cordova-plugin-purchase');
  CdvPurchase =
    (typeof window !== 'undefined' && window.CdvPurchase) ||
    mod?.CdvPurchase ||
    mod?.default ||
    mod;
  if (!CdvPurchase || !CdvPurchase.store) {
    throw new Error('In-app purchases are unavailable on this device.');
  }
  return CdvPurchase;
}

/**
 * Initialize StoreKit and register our products. Idempotent and concurrency-
 * safe (parallel callers share one init promise).
 */
export async function initialize() {
  if (!isAvailable()) return false;
  if (initialized) return true;
  if (initializing) return initializing;

  initializing = (async () => {
    await loadPlugin();
    const { store: s, ProductType, Platform, LogLevel } = CdvPurchase;
    store = s;

    if (store.verbosity !== undefined && LogLevel) {
      store.verbosity = LogLevel.WARNING;
    }

    store.register(
      Object.values(PRODUCT_IDS).map((id) => ({
        id,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.APPLE_APPSTORE,
      }))
    );

    // Auto-finish approved transactions once observed. We surface receipts to
    // per-call listeners set up in purchase()/restorePurchases(); here we just
    // make sure nothing stays stuck in the queue.
    store
      .when()
      .approved((transaction) => {
        try {
          transaction.finish();
        } catch {
          /* finished elsewhere */
        }
      });

    store.error((err) => {
      // eslint-disable-next-line no-console
      console.warn('[iap] store error:', err?.code, err?.message);
    });

    await store.initialize([CdvPurchase.Platform.APPLE_APPSTORE]);
    initialized = true;
    return true;
  })();

  try {
    return await initializing;
  } finally {
    initializing = null;
  }
}

/** Whether the store finished initializing and is ready to transact. */
export function isReady() {
  return isAvailable() && initialized && !!store;
}

/**
 * Product catalog with live prices pulled from StoreKit. Returns
 * [{ tier, id, title, description, price, currency }]. Empty off-device.
 */
export function getProducts() {
  if (!isReady()) return [];
  const { Platform } = CdvPurchase;
  return Object.entries(PRODUCT_IDS)
    .map(([tier, id]) => {
      const product = store.get(id, Platform.APPLE_APPSTORE);
      if (!product) return null;
      const offer = product.getOffer && product.getOffer();
      const pricing = offer?.pricingPhases?.[0];
      return {
        tier,
        id,
        title: product.title,
        description: product.description,
        price: pricing?.price ?? product.pricing?.price,
        currency: pricing?.currency ?? product.pricing?.currency,
      };
    })
    .filter(Boolean);
}

/** Single product descriptor for a tier (or null). */
export function getProduct(tier) {
  return getProducts().find((p) => p.tier === tier) || null;
}

/**
 * Pull the base64 App Store receipt out of whatever shape the plugin hands us.
 * StoreKit versions surface it in different spots; check all documented ones.
 */
function extractReceipt(receipt, transaction) {
  const candidates = [
    transaction?.appStoreReceipt,
    transaction?.nativePurchase?.appStoreReceipt,
    transaction?.nativePurchase?.transactionReceipt,
    receipt?.nativeData?.appStoreReceipt,
    receipt?.sourceReceipt?.nativeData?.appStoreReceipt,
    receipt?.appStoreReceipt,
    // Fallback: the plugin's cached application receipt, if exposed.
    store?.localReceipts?.[0]?.nativeData?.appStoreReceipt,
  ];
  const found = candidates.find((c) => typeof c === 'string' && c.length > 0);
  if (!found) {
    // eslint-disable-next-line no-console
    console.warn(
      '[iap] Could not locate base64 receipt on transaction; inspect shape on-device.'
    );
  }
  return found || null;
}

/**
 * Error representing the user deliberately dismissing the Apple payment sheet.
 * Callers should branch on `err.userCancelled === true` (or `err.code ===
 * 'USER_CANCELLED'`) — never on message text, which other failures can
 * coincidentally resemble.
 */
function userCancelledError() {
  const err = new Error('Purchase cancelled.');
  err.userCancelled = true;
  err.code = 'USER_CANCELLED';
  return err;
}

/** True when a plugin error code means the user cancelled the payment sheet. */
function isCancelledCode(code) {
  return (
    code != null &&
    !!CdvPurchase?.ErrorCode &&
    code === CdvPurchase.ErrorCode.PAYMENT_CANCELLED
  );
}

/**
 * Purchase the subscription for a tier. Resolves with the base64 App Store
 * receipt (hand it to paymentsApi.verifyAppleReceipt). Rejects on
 * cancel/failure — a user-cancel rejection carries `userCancelled: true`.
 * Off-device this rejects immediately.
 */
export async function purchase(tier) {
  if (!isAvailable()) {
    throw new Error('In-app purchases are only available on iOS.');
  }
  const productId = PRODUCT_IDS[tier];
  if (!productId) {
    throw new Error(`Unknown subscription tier: ${tier}`);
  }

  await initialize();

  const { Platform } = CdvPurchase;
  const product = store.get(productId, Platform.APPLE_APPSTORE);
  if (!product) {
    throw new Error('This subscription is not available right now.');
  }
  const offer = product.getOffer && product.getOffer();
  if (!offer) {
    throw new Error('This subscription has no purchasable offer.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      fn(arg);
    };

    // One-shot listeners scoped to this product's transactions.
    store
      .when()
      .approved((transaction) => {
        if (!transaction.products?.some((p) => p.id === productId)) return;
        const receipt = extractReceipt(transaction.parentReceipt, transaction);
        try {
          transaction.finish();
        } catch {
          /* noop */
        }
        if (receipt) {
          done(resolve, receipt);
        } else {
          done(reject, new Error('Purchase completed but no receipt was returned.'));
        }
      });

    // Kick off the native purchase sheet.
    offer.order().then(
      (result) => {
        // A returned IError means the order was rejected/cancelled up front.
        if (result && result.isError) {
          done(
            reject,
            isCancelledCode(result.code)
              ? userCancelledError()
              : new Error(result.message || 'Purchase failed.')
          );
        }
        // Otherwise wait for the approved() callback above.
      },
      (err) =>
        done(
          reject,
          isCancelledCode(err?.code)
            ? userCancelledError()
            : err instanceof Error
              ? err
              : new Error('Purchase failed.')
        )
    );
  });
}

/**
 * Restore previous purchases. Resolves with the base64 App Store receipt if one
 * is found (verify it server-side to re-grant entitlement), else null.
 */
export async function restorePurchases() {
  if (!isAvailable()) return null;
  await initialize();

  await store.restorePurchases();

  // After a restore, the application receipt is available on the local receipts.
  const local = store.localReceipts || [];
  for (const receipt of local) {
    const extracted = extractReceipt(receipt, receipt?.transactions?.[0]);
    if (extracted) return extracted;
  }
  return null;
}

const iapService = {
  PRODUCT_IDS,
  TIER_BY_PRODUCT,
  initialize,
  isAvailable,
  isReady,
  getProducts,
  getProduct,
  purchase,
  restorePurchases,
};

export default iapService;
