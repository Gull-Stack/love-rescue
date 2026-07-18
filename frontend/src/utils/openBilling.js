import therapistService from '../services/therapistService';

/**
 * Shared, terms-aware launcher for the Medical Billing SSO handoff.
 *
 * Every "Medical Billing" button must go through this helper so all entry
 * points behave identically:
 *  - terms not accepted → route to the Billing Terms page (never a dead end)
 *  - any other failure  → surface a readable error via onError (never silent)
 *
 * @param {object}   opts
 * @param {function} opts.navigate  react-router navigate (falls back to a hard redirect)
 * @param {function} [opts.onError] receives a user-facing error message on failure
 * @returns {Promise<boolean>} true if the SSO redirect was initiated
 */
export async function openBilling({ navigate, onError } = {}) {
  try {
    const res = await therapistService.getBillingSsoUrl();
    window.location.href = res.data.url;
    return true;
  } catch (e) {
    if (e.response?.data?.error === 'BILLING_TERMS_NOT_ACCEPTED') {
      if (navigate) {
        navigate('/therapist/billing-terms');
      } else {
        window.location.href = '/therapist/billing-terms';
      }
      return false;
    }
    if (onError) {
      onError(
        e.response?.data?.error || 'Could not launch Medical Billing. Please try again.'
      );
    }
    return false;
  }
}

export default openBilling;
