const { RoleMenuItem } = require("../models");
const { ALL_MENU_KEYS, PACKAGE_KEYS } = require("../constants/menuKeys");

/**
 * Returns the list of menu keys the given role is allowed to see (before package filter).
 * - If role name is "admin" or "superadmin", returns all keys.
 * - Otherwise returns keys stored in role_menu_items for that role (order preserved as in ALL_MENU_KEYS).
 * - "settings" is always included for every role.
 */
async function getMenuItemsForRole(roleId, roleName) {
  if (!roleId) return [];
  const name = (roleName || "").toLowerCase().trim();
  if (name === "admin" || name === "superadmin") return [...ALL_MENU_KEYS];

  const rows = await RoleMenuItem.findAll({
    where: { role_id: roleId },
    attributes: ["menu_key"],
    raw: true,
  });
  const keys = rows.map((r) => r.menu_key).filter(Boolean);
  const fromRole = ALL_MENU_KEYS.filter((k) => keys.includes(k));
  if (fromRole.includes("settings")) return fromRole;
  return [...fromRole, "settings"];
}

/**
 * Filters menu keys by subscription package. Returns only keys allowed for the package.
 * @param {string[]} menuKeys - keys from getMenuItemsForRole
 * @param {string} subscriptionPackage - 'silver' | 'gold'
 */
function filterMenuItemsByPackage(menuKeys, subscriptionPackage) {
  if (!menuKeys || !menuKeys.length) return [];
  const allowed = PACKAGE_KEYS[subscriptionPackage];
  if (!allowed) return menuKeys;
  const set = new Set(allowed);
  return menuKeys.filter((k) => set.has(k));
}

module.exports = { getMenuItemsForRole, filterMenuItemsByPackage };
