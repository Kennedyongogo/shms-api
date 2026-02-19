const { Role, Permission, User } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

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
    return res.status(200).json({ success: true, message: "Role deleted" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting Role",
      error: error.message,
    });
  }
};

module.exports = { ...crud, remove, assignPermissions };

