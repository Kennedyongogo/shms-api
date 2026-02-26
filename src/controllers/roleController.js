const { Role, Permission, User, RoleMenuItem } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");
const { auditLog } = require("../utils/auditLog");
const { getMenuItemsForRole } = require("../utils/menuItems");
const { ALL_MENU_KEYS, isValidMenuKey } = require("../constants/menuKeys");

const crud = createCrudController({
  Model: Role,
  name: "Role",
  searchableFields: ["name"],
});

const assignPermissions = async (req, res) => {
  try {
    const { id } = req.params; // role id
    const { permission_ids } = req.body;

    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({
        success: false,
        message: "permission_ids must be an array",
      });
    }

    const role = await Role.findByPk(id);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    const permissions = await Permission.findAll({ where: { id: permission_ids } });
    await role.setPermissions(permissions);

    await auditLog(req, { action: "ASSIGN_PERMISSIONS", table_name: "Role", record_id: id });
    const reloaded = await Role.findByPk(id, { include: [{ model: Permission, as: "permissions" }] });
    return res.status(200).json({ success: true, data: reloaded });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error assigning permissions",
      error: error.message,
    });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findByPk(id);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    if (role.name === "admin") {
      return res.status(400).json({ success: false, message: 'Cannot delete the "admin" role' });
    }

    const inUse = await User.count({ where: { role_id: id } });
    if (inUse > 0) {
      return res.status(400).json({ success: false, message: "Cannot delete a role that is assigned to users" });
    }

    await role.destroy();
    await auditLog(req, { action: "DELETE_ROLE", table_name: "Role", record_id: id });
    return res.status(200).json({ success: true, message: "Role deleted" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting Role",
      error: error.message,
    });
  }
};

const getMenuItems = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findByPk(id);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });
    const menuKeys = await getMenuItemsForRole(role.id, role.name);
    return res.status(200).json({
      success: true,
      data: { menuKeys, allMenuKeys: ALL_MENU_KEYS },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching role menu items",
      error: error.message,
    });
  }
};

const putMenuItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { menuKeys } = req.body;
    if (!Array.isArray(menuKeys)) {
      return res.status(400).json({ success: false, message: "menuKeys must be an array" });
    }
    const role = await Role.findByPk(id);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });
    if (role.name === "admin") {
      return res.status(400).json({
        success: false,
        message: "Cannot change menu items for the admin role; admin always sees all items.",
      });
    }
    const valid = menuKeys.filter((k) => isValidMenuKey(k));
    const invalid = menuKeys.filter((k) => !isValidMenuKey(k));
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid menu key(s): ${invalid.join(", ")}. Valid keys: ${ALL_MENU_KEYS.join(", ")}`,
      });
    }
    await RoleMenuItem.destroy({ where: { role_id: id } });
    if (valid.length > 0) {
      await RoleMenuItem.bulkCreate(valid.map((menu_key) => ({ role_id: id, menu_key })));
    }
    await auditLog(req, { action: "UPDATE_ROLE_MENU_ITEMS", table_name: "Role", record_id: id });
    const result = await getMenuItemsForRole(id, role.name);
    return res.status(200).json({ success: true, data: { menuKeys: result } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating role menu items",
      error: error.message,
    });
  }
};

module.exports = { ...crud, remove, assignPermissions, getMenuItems, putMenuItems };

