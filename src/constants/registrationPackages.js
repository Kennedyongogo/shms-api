/**
 * Organization registration packages.
 * Amounts are in KES smallest units for Paystack.
 * Silver: KES 900 → 90000; Gold: KES 1800 → 180000.
 */
const VALID_PACKAGES = ["silver", "gold"];

const PACKAGE_AMOUNT_KES_SUBUNITS = {
  silver: 900 * 100,
  gold: 1800 * 100,
};

const PACKAGE_TRIAL_DAYS = {
  silver: 7,
  gold: 14,
};

function getPackageAmountKesSubunits(packageKey) {
  const k = String(packageKey || "").toLowerCase();
  return PACKAGE_AMOUNT_KES_SUBUNITS[k];
}

function getPackageTrialDays(packageKey) {
  const k = String(packageKey || "").toLowerCase();
  return PACKAGE_TRIAL_DAYS[k];
}

module.exports = {
  VALID_PACKAGES,
  PACKAGE_AMOUNT_KES_SUBUNITS,
  PACKAGE_TRIAL_DAYS,
  getPackageAmountKesSubunits,
  getPackageTrialDays,
};
