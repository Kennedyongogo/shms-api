const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { Admin } = require("../models");

const sanitizeAdmin = (admin) => {
  if (!admin) return admin;
  const json = admin.toJSON ? admin.toJSON() : admin;
  const { password, ...rest } = json;
  return rest;
};

const register = async (req, res) => {
  try {
    const { full_name, email, password, confirm_password } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "full_name, email and password are required",
      });
    }
    if (confirm_password != null && password !== confirm_password) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const exists = await Admin.findOne({ where: { email: normalizedEmail } });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      full_name: String(full_name).trim(),
      email: normalizedEmail,
      password: hashed,
      status: "active",
      last_login: null,
    });

    const token = jwt.sign({ id: admin.id, type: "admin" }, config.jwtSecret, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      success: true,
      data: {
        admin: sanitizeAdmin(admin),
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error registering admin",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "email and password are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const admin = await Admin.findOne({ where: { email: normalizedEmail } });
    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }
    if (admin.status !== "active") {
      return res
        .status(403)
        .json({ success: false, message: "Admin account is not active" });
    }

    await admin.update({ last_login: new Date() });
    const token = jwt.sign({ id: admin.id, type: "admin" }, config.jwtSecret, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      data: {
        admin: sanitizeAdmin(admin),
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error logging in admin",
      error: error.message,
    });
  }
};

module.exports = { register, login };

