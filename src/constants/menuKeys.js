/**
 * Navbar menu keys. Must match frontend Navbar item keys (e.g. path segment or key).
 * Used for role-based menu visibility: Super Admin sees all (filtered by package); other roles see only keys stored in role_menu_items.
 */
const ALL_MENU_KEYS = [
  "dashboard",
  "hospitals",
  "appointments",
  "patients",
  "laboratory",
  "pharmacy",
  "ward",
  "diet",
  "inventory",
  "billing",
  "users",
  "audit-logs",
  "settings",
];

/** Silver package: clinic setup — Hospital, Users & Roles + core menu items (settings always included in both). */
const SILVER_PACKAGE_KEYS = [
  "dashboard",
  "hospitals",
  "patients",
  "appointments",
  "laboratory",
  "pharmacy",
  "billing",
  "users",
  "audit-logs",
  "settings",
];

/** Gold package: full hospital — all menu items. */
const GOLD_PACKAGE_KEYS = [...ALL_MENU_KEYS];

const PACKAGE_KEYS = {
  silver: SILVER_PACKAGE_KEYS,
  gold: GOLD_PACKAGE_KEYS,
};

const ALL_MENU_KEYS_SET = new Set(ALL_MENU_KEYS);

function isValidMenuKey(key) {
  return typeof key === "string" && ALL_MENU_KEYS_SET.has(key);
}

module.exports = {
  ALL_MENU_KEYS,
  ALL_MENU_KEYS_SET,
  SILVER_PACKAGE_KEYS,
  GOLD_PACKAGE_KEYS,
  PACKAGE_KEYS,
  isValidMenuKey,
};
