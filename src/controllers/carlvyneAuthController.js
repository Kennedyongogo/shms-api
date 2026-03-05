const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { CarlvyneAccount } = require("../models");
const config = require("../config/config");

/** Normalize phone to Kenya +254 format (must match carlvyneAccountController). */
function normalizePhoneTo254(input) {
  if (input == null || String(input).trim() === "") return null;
  const raw = String(input).trim();
  let p = raw.replace(/[\s\-()]/g, "");
  if (p.startsWith("+254")) return p;
  if (p.startsWith("254")) return `+${p}`;
  if (p.startsWith("0") && p.length === 10) return `+254${p.slice(1)}`;
  if (/^[71]\d{8}$/.test(p)) return `+254${p}`;
  throw new Error('Phone must be a Kenya number in format +254XXXXXXXXX');
}

/**
 * POST /api/carlvyne-auth/login
 * Body: { email } or { phone_number } (or both), and { password }
 * Login with email or phone (phone normalized to +254).
 */
const login = async (req, res) => {
  try {
    const { email, phone_number, password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: "password is required" });
    }

    const emailVal = email ? String(email).trim().toLowerCase() : null;
    let phoneVal = null;
    if (phone_number != null && String(phone_number).trim() !== "") {
      try {
        phoneVal = normalizePhoneTo254(phone_number);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }

    if (!emailVal && !phoneVal) {
      return res.status(400).json({ success: false, message: "email or phone_number is required" });
    }

    const where = [];
    if (emailVal) where.push({ email: emailVal });
    if (phoneVal) where.push({ phone_number: phoneVal });

    const owner = await CarlvyneAccount.unscoped().findOne({
      where: { [Op.or]: where },
    });

    if (!owner || !owner.password) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, owner.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!owner.is_active) {
      return res.status(403).json({ success: false, message: "Account is not active" });
    }

    const token = jwt.sign(
      { id: owner.id, type: "carlvyne_owner" },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    const accountData = owner.toJSON ? owner.toJSON() : owner.get ? owner.get({ plain: true }) : {};
    delete accountData.password;

    return res.status(200).json({
      success: true,
      data: {
        account: accountData,
        token,
      },
    });
  } catch (error) {
    console.error("[carlvyne-auth login]", error.message);
    return res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

module.exports = { login };
