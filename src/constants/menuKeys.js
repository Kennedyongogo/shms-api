/**
 * Navbar menu keys. Must match frontend Navbar item keys (e.g. path segment or key).
 * Used for role-based menu visibility: admin sees all; other roles see only keys stored in role_menu_items.
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

const ALL_MENU_KEYS_SET = new Set(ALL_MENU_KEYS);

function isValidMenuKey(key) {
  return typeof key === "string" && ALL_MENU_KEYS_SET.has(key);
}

module.exports = { ALL_MENU_KEYS, ALL_MENU_KEYS_SET, isValidMenuKey };
