const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const { Patient, User, Hospital } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { auditLog } = require("../utils/auditLog");
const { scopeByHospital, belongsToUserHospital, withHospitalId } = require("../utils/hospitalScope");

const sanitizePatient = (p) => {
  if (!p) return p;
  const plain = typeof p.toJSON === "function" ? p.toJSON() : { ...p };
  delete plain.password;
  return plain;
};

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

const baseInclude = [
  {
    model: User,
    as: "user",
    attributes: ["id", "full_name", "email", "phone", "status", "last_login", "profile_image_path"],
  },
  { model: Hospital, as: "hospital", attributes: ["id", "name"], required: false },
];

const crud = createCrudController({
  Model: Patient,
  name: "Patient",
  searchableFields: ["gender", "blood_group", "insurance_provider", "emergency_contact"],
  include: baseInclude,
  scopeByHospital: true,
});

const parseOptionalDecimal = (val) => {
  if (val === "" || val == null) return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return NaN;
  return n;
};

const applyVitals = (obj) => {
  if (Object.prototype.hasOwnProperty.call(obj, "temperature_c")) {
    const t = parseOptionalDecimal(obj.temperature_c);
    if (Number.isNaN(t)) throw new Error("temperature_c must be a number");
    if (t != null && (t < 25 || t > 50)) throw new Error("temperature_c seems invalid");
    obj.temperature_c = t;
  }
  if (Object.prototype.hasOwnProperty.call(obj, "weight_kg")) {
    const w = parseOptionalDecimal(obj.weight_kg);
    if (Number.isNaN(w)) throw new Error("weight_kg must be a number");
    if (w != null && (w < 0 || w > 1000)) throw new Error("weight_kg seems invalid");
    obj.weight_kg = w;
  }
};

const normalizePatientSource = (val) => {
  if (val == null || val === "") return null;
  const v = String(val).trim().toLowerCase();
  if (v === "walk_in" || v === "public") return v;
  throw new Error('patient_source must be "walk_in" or "public"');
};

// Override create/update to support patient-portal credentials on Patient model
const create = async (req, res) => {
  try {
    const body = withHospitalId({ ...req.body }, req);
    if (!body.hospital_id) {
      return res.status(400).json({ success: false, message: "hospital_id is required" });
    }

    if (Object.prototype.hasOwnProperty.call(body, "phone")) {
      try {
        body.phone = normalizeKenyanPhone(body.phone);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "email") && body.email) {
      body.email = String(body.email).trim().toLowerCase();
    }
    if (Object.prototype.hasOwnProperty.call(body, "full_name") && body.full_name) {
      body.full_name = String(body.full_name).trim();
    }

    try {
      if (!Object.prototype.hasOwnProperty.call(body, "patient_source") || body.patient_source == null || body.patient_source === "") {
        body.patient_source = "walk_in";
      } else {
        body.patient_source = normalizePatientSource(body.patient_source);
      }
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    try {
      applyVitals(body);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    const password = body.password;
    const confirm = body.confirm_password;
    if (confirm != null && password !== confirm) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }
    if (password) {
      body.password = await bcrypt.hash(password, 10);
    }
    delete body.confirm_password;

    const created = await Patient.create(body);
    await auditLog(req, { action: "CREATE_PATIENT", table_name: "Patient", record_id: created?.id });
    return res.status(201).json({ success: true, data: sanitizePatient(created) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error creating Patient", error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Patient.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Patient not found" });
    if (!belongsToUserHospital(record, req)) return res.status(404).json({ success: false, message: "Patient not found" });

    const updates = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(updates, "phone")) {
      try {
        updates.phone = normalizeKenyanPhone(updates.phone);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }
    if (Object.prototype.hasOwnProperty.call(updates, "email") && updates.email) {
      updates.email = String(updates.email).trim().toLowerCase();
    }
    if (Object.prototype.hasOwnProperty.call(updates, "full_name") && updates.full_name) {
      updates.full_name = String(updates.full_name).trim();
    }

    try {
      if (Object.prototype.hasOwnProperty.call(updates, "patient_source")) {
        const normalized = normalizePatientSource(updates.patient_source);
        if (normalized == null) {
          return res.status(400).json({ success: false, message: "patient_source cannot be empty" });
        }
        updates.patient_source = normalized;
      }
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    try {
      applyVitals(updates);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "confirm_password")) {
      if (!updates.password) {
        return res.status(400).json({ success: false, message: "password is required when confirm_password is provided" });
      }
      if (updates.password !== updates.confirm_password) {
        return res.status(400).json({ success: false, message: "Passwords do not match" });
      }
      delete updates.confirm_password;
    }
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updated = await record.update(updates);
    await auditLog(req, { action: "UPDATE_PATIENT", table_name: "Patient", record_id: id });
    return res.status(200).json({ success: true, data: sanitizePatient(updated) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating Patient", error: error.message });
  }
};

// Enhanced listing: supports search across linked user (name/email/phone) and patient fields; scoped to user's hospital
const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, hospital_id } = req.query;

    const where = { ...scopeByHospital(req) };
    if (hospital_id && where.hospital_id == null) where.hospital_id = hospital_id;

    const patientSearchWhere = search
      ? {
          [Op.or]: [
            { full_name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } },
            { gender: { [Op.iLike]: `%${search}%` } },
            { blood_group: { [Op.iLike]: `%${search}%` } },
            { insurance_provider: { [Op.iLike]: `%${search}%` } },
            { emergency_contact: { [Op.iLike]: `%${search}%` } },
            { patient_source: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : null;

    const include = [
      {
        model: User,
        as: "user",
        attributes: ["id", "full_name", "email", "phone", "status", "last_login", "profile_image_path"],
        required: false,
      },
      { model: Hospital, as: "hospital", attributes: ["id", "name"], required: false },
    ];

    const finalWhere = patientSearchWhere ? { ...where, [Op.and]: [patientSearchWhere] } : where;

    const { count, rows } = await Patient.findAndCountAll({
      where: finalWhere,
      attributes: { exclude: ["password"] },
      include,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching Patients",
      error: error.message,
    });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Patient.findByPk(id, { attributes: { exclude: ["password"] }, include: baseInclude });
    if (!record) return res.status(404).json({ success: false, message: "Patient not found" });
    if (!belongsToUserHospital(record, req)) return res.status(404).json({ success: false, message: "Patient not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching Patient", error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Patient.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Patient not found" });
    if (!belongsToUserHospital(record, req)) return res.status(404).json({ success: false, message: "Patient not found" });
    await record.destroy();
    await auditLog(req, { action: "DELETE_PATIENT", table_name: "patients", record_id: id });
    return res.status(200).json({ success: true, message: "Patient deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error deleting Patient", error: error.message });
  }
};

module.exports = { ...crud, create, update, getAll, getById, remove };

