const { Role, RoleMenuItem } = require("../models");
const { ALL_MENU_KEYS } = require("../constants/menuKeys");

/**
 * Returns the list of menu keys the given role is allowed to see.
 * - If role name is "admin", returns all keys.
 * - Otherwise returns keys stored in role_menu_items for that role (order preserved as in ALL_MENU_KEYS).
 * - "settings" is always included for every role so all users can access their profile and password settings.
 */
async function getMenuItemsForRole(roleId, roleName) {
  if (!roleId) return [];
  const name = (roleName || "").toLowerCase().trim();
  if (name === "admin") return [...ALL_MENU_KEYS];

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

module.exports = { getMenuItemsForRole };
