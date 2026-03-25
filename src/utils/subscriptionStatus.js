/**
 * Hospital subscription status: 7-day trial, then paid 30-day periods.
 * When trial and paid period are both expired, all users in that hospital are blocked from login.
 */

const TRIAL_DAYS = 7;
const DEFAULT_SUBSCRIPTION_DAYS = 30;

/**
 * Returns true if the hospital has an active subscription (trial or paid).
 * - Trial active: trial_ends_at > now
 * - Paid active: subscription_ends_at > now
 * - Legacy: both trial_ends_at and subscription_ends_at are null → treated as active (backward compatibility for existing DBs)
 * @param {Object} hospital - Hospital instance or plain object with trial_ends_at, subscription_ends_at
 * @returns {boolean}
 */
function isHospitalSubscriptionActive(hospital) {
  if (!hospital) return false;
  const now = new Date();
  const trialEndsAt = hospital.trial_ends_at ? new Date(hospital.trial_ends_at) : null;
  const subscriptionEndsAt = hospital.subscription_ends_at ? new Date(hospital.subscription_ends_at) : null;

  if (trialEndsAt == null && subscriptionEndsAt == null) return true;
  if (trialEndsAt && trialEndsAt > now) return true;
  if (subscriptionEndsAt && subscriptionEndsAt > now) return true;
  return false;
}

/**
 * Returns subscription status for API responses: 'trial' | 'active' | 'expired'
 * - trial: trial_ends_at > now (and no paid period or paid period in future)
 * - active: trial ended but subscription_ends_at > now
 * - expired: trial ended and subscription_ends_at is past or null
 * @param {Object} hospital - Hospital instance or plain object
 * @returns {{ status: string, trial_ends_at: Date|null, subscription_ends_at: Date|null, message?: string }}
 */
function getSubscriptionStatus(hospital) {
  const now = new Date();
  const trialEndsAt = hospital?.trial_ends_at ? new Date(hospital.trial_ends_at) : null;
  const subscriptionEndsAt = hospital?.subscription_ends_at ? new Date(hospital.subscription_ends_at) : null;

  if (trialEndsAt == null && subscriptionEndsAt == null) {
    return {
      status: "active",
      trial_ends_at: null,
      subscription_ends_at: null,
      message: "Subscription active (legacy)",
    };
  }
  if (trialEndsAt && trialEndsAt > now) {
    return {
      status: "trial",
      trial_ends_at: trialEndsAt,
      subscription_ends_at: subscriptionEndsAt,
      message: "Trial period active",
    };
  }
  if (subscriptionEndsAt && subscriptionEndsAt > now) {
    return {
      status: "active",
      trial_ends_at: trialEndsAt,
      subscription_ends_at: subscriptionEndsAt,
      message: "Subscription active",
    };
  }
  return {
    status: "expired",
    trial_ends_at: trialEndsAt,
    subscription_ends_at: subscriptionEndsAt,
    message: "Subscription has expired. Renew to continue using the system.",
  };
}

/**
 * Add 7 days from now for trial end (legacy callers).
 * @returns {Date}
 */
function getTrialEndsAt() {
  const d = new Date();
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d;
}

/**
 * Trial end = now + N minutes (organization registration).
 * @param {number} minutes
 * @returns {Date}
 */
function getTrialEndsAtMinutes(minutes) {
  const m = Math.max(1, Number(minutes) || 10);
  const d = new Date();
  d.setMinutes(d.getMinutes() + m);
  return d;
}

/**
 * Add days to subscription end. If current subscription_ends_at is in the future, extend from there; else from now.
 * @param {Date|null} currentEndsAt - Current subscription_ends_at
 * @param {number} days - Days to add (default 30)
 * @returns {Date}
 */
function getNextSubscriptionEndsAt(currentEndsAt, days = DEFAULT_SUBSCRIPTION_DAYS) {
  const now = new Date();
  const base = currentEndsAt && new Date(currentEndsAt) > now ? new Date(currentEndsAt) : now;
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Paid period end = base + N minutes (organization subscription after Paystack).
 * @param {Date|null} currentEndsAt
 * @param {number} minutes
 * @returns {Date}
 */
function getNextSubscriptionEndsAtMinutes(currentEndsAt, minutes) {
  const m = Math.max(1, Number(minutes) || 10);
  const now = new Date();
  const base = currentEndsAt && new Date(currentEndsAt) > now ? new Date(currentEndsAt) : now;
  const next = new Date(base);
  next.setMinutes(next.getMinutes() + m);
  return next;
}

module.exports = {
  TRIAL_DAYS,
  DEFAULT_SUBSCRIPTION_DAYS,
  isHospitalSubscriptionActive,
  getSubscriptionStatus,
  getTrialEndsAt,
  getTrialEndsAtMinutes,
  getNextSubscriptionEndsAt,
  getNextSubscriptionEndsAtMinutes,
};
