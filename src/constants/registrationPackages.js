/**
 * Organization registration packages — amounts for Paystack (KES in smallest units / cents).
 * Silver: KES 10 → 1000; Gold: KES 20 → 2000.
 */
const VALID_PACKAGES = ["silver", "gold"];

const PACKAGE_AMOUNT_KES_SUBUNITS = {
  silver: 10 * 100,
  gold: 20 * 100,
};

function getPackageAmountKesSubunits(packageKey) {
  const k = String(packageKey || "").toLowerCase();
  return PACKAGE_AMOUNT_KES_SUBUNITS[k];
}

module.exports = {
  VALID_PACKAGES,
  PACKAGE_AMOUNT_KES_SUBUNITS,
  getPackageAmountKesSubunits,
};
