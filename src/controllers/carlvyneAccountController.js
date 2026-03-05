const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { CarlvyneAccount } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { toRelativeUploadPath } = require("../middleware/upload");

/** Normalize phone to Kenya +254 format (e.g. 0712345678 -> +254712345678). */
function normalizePhoneTo254(input) {
  if (input == null || String(input).trim() === "") return null;
  const raw = String(input).trim();
  let p = raw.replace(/[\s\-()]/g, "");
  if (p.startsWith("+254")) return p;
  if (p.startsWith("254")) return `+${p}`;
  if (p.startsWith("0") && p.length === 10) return `+254${p.slice(1)}`;
  if (/^[71]\d{8}$/.test(p)) return `+254${p}`;
  throw new Error('Phone must be a Kenya number in format +254XXXXXXXXX (e.g. +254712345678 or 0712345678)');
}

const buildCreateData = async (req) => {
  const body = { ...req.body };
  if (req.file?.path) body.profile_picture_path = toRelativeUploadPath(req.file.path);
  if (body.confirm_password !== undefined) delete body.confirm_password;
  if (body.phone_number != null) {
    try {
      body.phone_number = normalizePhoneTo254(body.phone_number);
    } catch (e) {
      throw new Error(e.message);
    }
  }
  if (body.password) {
    body.password = await bcrypt.hash(body.password, 10);
  }
  return body;
};

const buildUpdateData = async (req) => {
  const body = { ...req.body };
  if (req.file?.path) body.profile_picture_path = toRelativeUploadPath(req.file.path);
  if (body.confirm_password !== undefined) delete body.confirm_password;
  if (body.phone_number != null) {
    try {
      body.phone_number = normalizePhoneTo254(body.phone_number);
    } catch (e) {
      throw new Error(e.message);
    }
  }
  if (body.password) {
    body.password = await bcrypt.hash(body.password, 10);
  }
  return body;
};

const crud = createCrudController({
  Model: CarlvyneAccount,
  name: "CarlvyneAccount",
  searchableFields: ["name", "email", "phone_number", "bio"],
  buildCreateData: undefined,
  buildUpdateData: undefined,
  scopeByHospital: false,
  defaultOrder: [["name", "ASC"]],
});

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, is_active } = req.query;
    const where = {};
    if (is_active !== undefined) where.is_active = is_active === "true" || is_active === true;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
        { bio: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { count, rows } = await CarlvyneAccount.findAndCountAll({
      where,
      limit,
      offset,
      order: [["name", "ASC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching Carlvyne accounts", error: error.message });
  }
};

const create = async (req, res) => {
  try {
    req.body = await buildCreateData(req);
  } catch (err) {
    const isValidation = err.message && (err.message.includes("Phone") || err.message.includes("password"));
    return res.status(isValidation ? 400 : 500).json({ success: false, message: err.message || "Error preparing create data" });
  }
  return crud.create(req, res);
};

const update = async (req, res) => {
  try {
    req.body = await buildUpdateData(req);
  } catch (err) {
    const isValidation = err.message && (err.message.includes("Phone") || err.message.includes("password"));
    return res.status(isValidation ? 400 : 500).json({ success: false, message: err.message || "Error preparing update data" });
  }
  return crud.update(req, res);
};

module.exports = {
  getAll,
  getById: crud.getById,
  create,
  update,
  remove: crud.remove,
};
