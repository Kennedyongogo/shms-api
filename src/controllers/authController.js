const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Role } = require("../models");
const config = require("../config/config");
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
  if (!/^\+254\d{9}$/.test(p)) throw new Error('Phone must be in format "+254XXXXXXXXX"');
  return p;
};

const sanitizeUser = (user) => {
  if (!user) return user;
  const json = user.toJSON ? user.toJSON() : user;
  // eslint-disable-next-line no-unused-vars
  const { password, ...rest } = json;
  return rest;
};

const getRoleIdByNameOrFail = async (name) => {
  const role = await Role.findOne({ where: { name } });
  if (!role) {
    const err = new Error(`Role "${name}" does not exist. Create it first.`);
    err.status = 400;
    throw err;
  }
  return role.id;
};

const getDefaultRoleId = async () => getRoleIdByNameOrFail("patient");
const getAdminRoleId = async () => getRoleIdByNameOrFail("admin");

const register = async (req, res) => {
  try {
    const { full_name, email, phone, password, confirm_password, role_id } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "full_name, email, password are required",
      });
    }
    if (confirm_password != null && password !== confirm_password) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ success: false, message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    let normalizedPhone = null;
    try {
      normalizedPhone = normalizeKenyanPhone(phone);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }
    const resolvedRoleId = role_id || (await getDefaultRoleId());
    const user = await User.create({
      full_name,
      email,
      phone: normalizedPhone,
      password: hashed,
      role_id: resolvedRoleId,
      status: "active",
      last_login: null,
    });

    const token = jwt.sign({ id: user.id, type: "user" }, config.jwtSecret, { expiresIn: "7d" });
    const role = await Role.findByPk(resolvedRoleId);
    await auditLog({ user: { id: user.id } }, { action: "REGISTER", table_name: "User", record_id: user.id });

    return res.status(201).json({
      success: true,
      data: { user: sanitizeUser(user), role, token },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error registering user", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (user.status !== "active") {
      return res.status(403).json({ success: false, message: "Account is not active" });
    }

    await user.update({ last_login: new Date() });
    const token = jwt.sign({ id: user.id, type: "user" }, config.jwtSecret, { expiresIn: "7d" });
    const role = await Role.findByPk(user.role_id);
    await auditLog({ user: { id: user.id } }, { action: "LOGIN", table_name: "auth" });
    return res.status(200).json({ success: true, data: { user: sanitizeUser(user), role, token } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error logging in", error: error.message });
  }
};

const logout = async (req, res) => {
  await auditLog(req, { action: "LOGOUT", table_name: "auth" });
  return res.status(200).json({ success: true, message: "Logged out" });
};

const bootstrapPromoteMe = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    // Only allow if there is currently NO admin user (bootstrap safety)
    const adminRoleId = await getAdminRoleId();
    const countAdmins = await User.count({ where: { role_id: adminRoleId } });
    if (countAdmins > 0) {
      return res.status(403).json({ success: false, message: "Bootstrap is disabled because an admin already exists" });
    }
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await user.update({ role_id: adminRoleId });
    const role = await Role.findByPk(adminRoleId);
    await auditLog({ user: { id: userId } }, { action: "BOOTSTRAP_PROMOTE_ADMIN", table_name: "User", record_id: userId });

    return res.status(200).json({
      success: true,
      message: "User promoted to admin (bootstrap)",
      data: { user: sanitizeUser(user), role },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error promoting user", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, new_password } = req.body;
    if (!email || !new_password) {
      return res.status(400).json({ success: false, message: "email and new_password are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const hashed = await bcrypt.hash(new_password, 10);
    await user.update({ password: hashed });
    await auditLog({ user: { id: user.id } }, { action: "RESET_PASSWORD", table_name: "User", record_id: user.id });
    return res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error resetting password", error: error.message });
  }
};

module.exports = { login, logout, register, resetPassword, bootstrapPromoteMe };

