const bcrypt = require("bcryptjs");
const path = require("path");
const { Op } = require("sequelize");
const { User, Role, Staff } = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");
const { deleteFile, toRelativeUploadPath } = require("../middleware/upload");
const { auditLog } = require("../utils/auditLog");

const normalizeKenyanPhone = (input) => {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  let p = raw.replace(/[\s\-()]/g, "");
  if (p.startsWith("+254")) {
    // ok
  } else if (p.startsWith("254")) {
    p = `+${p}`;
  } else if (p.startsWith("0") && p.length === 10) {
    p = `+254${p.slice(1)}`;
  } else if (/^[71]\d{8}$/.test(p)) {
    p = `+254${p}`;
  } else {
    throw new Error('Phone must be a Kenya number starting with "+254"');
  }
  if (!/^\+254\d{9}$/.test(p))
    throw new Error('Phone must be in format "+254XXXXXXXXX"');
  return p;
};

const sanitizeUser = (user) => {
  if (!user) return user;
  const json = user.toJSON ? user.toJSON() : user;
  // Never return password hash
  // eslint-disable-next-line no-unused-vars
  const { password, ...rest } = json;
  return rest;
};

const getDefaultRoleId = async () => {
  const preferred = ["user", "regular_user", "regular"];
  for (const name of preferred) {
    // eslint-disable-next-line no-await-in-loop
    const role = await Role.findOne({ where: { name } });
    if (role) return role.id;
  }
  throw new Error(
    'Default role "user" (Regular user) does not exist. Create it first.',
  );
};

const create = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      password,
      confirm_password,
      role_id,
      status,
    } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "full_name, email, password are required",
      });
    }
    if (confirm_password != null && password !== confirm_password) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let resolvedRoleId = role_id;
    if (!resolvedRoleId) {
      try {
        resolvedRoleId = await getDefaultRoleId();
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }
    let normalizedPhone = null;
    try {
      normalizedPhone = normalizeKenyanPhone(phone);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }
    const created = await User.create({
      full_name,
      email,
      phone: normalizedPhone,
      password: hashedPassword,
      role_id: resolvedRoleId,
      status: status ?? "active",
      last_login: null,
    });

    await auditLog(req, { action: "CREATE_USER", table_name: "User", record_id: created?.id });
    return res.status(201).json({ success: true, data: sanitizeUser(created) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating User",
      error: error.message,
    });
  }
};

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const search = String(req.query.search || "").trim();
    const excludeStaff = String(req.query.exclude_staff || "").toLowerCase() === "true";

    const where = {};
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (excludeStaff) {
      const staffRows = await Staff.findAll({ attributes: ["user_id"] });
      const staffUserIds = Array.from(new Set(staffRows.map((s) => s.user_id).filter(Boolean)));
      if (staffUserIds.length) where.id = { [Op.notIn]: staffUserIds };
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows.map(sanitizeUser),
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching Users",
      error: error.message,
    });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, data: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching User",
      error: error.message,
    });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const updates = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(updates, "confirm_password")) {
      if (!updates.password) {
        return res
          .status(400)
          .json({
            success: false,
            message: "password is required when confirm_password is provided",
          });
      }
      if (updates.password !== updates.confirm_password) {
        return res
          .status(400)
          .json({ success: false, message: "Passwords do not match" });
      }
      delete updates.confirm_password;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "phone")) {
      try {
        updates.phone = normalizeKenyanPhone(updates.phone);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updated = await user.update(updates);
    await auditLog(req, { action: "UPDATE_USER", table_name: "User", record_id: id });
    return res.status(200).json({ success: true, data: sanitizeUser(updated) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating User",
      error: error.message,
    });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    await user.destroy();
    await auditLog(req, { action: "DELETE_USER", table_name: "User", record_id: id });
    return res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting User",
      error: error.message,
    });
  }
};

const deactivate = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const updated = await user.update({ status: "inactive" });
    await auditLog(req, { action: "DEACTIVATE_USER", table_name: "User", record_id: id });
    return res.status(200).json({ success: true, data: sanitizeUser(updated) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deactivating User",
      error: error.message,
    });
  }
};

const updateProfileImage = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (!req.file?.path) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Missing file field "profile_image"',
        });
    }

    // Delete previous file (best effort)
    if (user.profile_image_path) {
      const absOld = path.join(__dirname, "..", "..", user.profile_image_path);
      await deleteFile(absOld);
    }

    const relative = toRelativeUploadPath(req.file.path);
    const updated = await user.update({ profile_image_path: relative });
    await auditLog(req, { action: "UPDATE_USER_PROFILE_IMAGE", table_name: "User", record_id: id });
    return res.status(200).json({ success: true, data: sanitizeUser(updated) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating profile image",
      error: error.message,
    });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  updateProfileImage,
  deactivate,
  remove,
};
