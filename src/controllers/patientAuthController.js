const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { Patient, Hospital } = require("../models");
const config = require("../config/config");

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

const sanitizePatient = (patient) => {
  if (!patient) return patient;
  const json = patient.toJSON ? patient.toJSON() : patient;
  // eslint-disable-next-line no-unused-vars
  const { password, ...rest } = json;
  return rest;
};

const resolveHospitalId = async (hospital_id) => {
  if (hospital_id) return hospital_id;
  const first = await Hospital.findOne({ order: [["createdAt", "ASC"]] });
  if (!first) {
    const err = new Error("No hospital found. Please create a hospital first.");
    err.status = 400;
    throw err;
  }
  return first.id;
};

const register = async (req, res) => {
  try {
    const { full_name, email, phone, password, confirm_password, hospital_id, date_of_birth, gender } = req.body;

    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({ success: false, message: "full_name is required" });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: "password is required" });
    }
    if (confirm_password != null && password !== confirm_password) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : null;
    let normalizedPhone = null;
    try {
      normalizedPhone = normalizeKenyanPhone(phone);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    if (!cleanEmail && !normalizedPhone) {
      return res.status(400).json({ success: false, message: "Provide at least email or phone" });
    }

    const exists = await Patient.findOne({
      where: {
        [Op.or]: [
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    });
    if (exists) return res.status(400).json({ success: false, message: "Patient account already exists" });

    const hospId = await resolveHospitalId(hospital_id);
    const hashed = await bcrypt.hash(password, 10);

    const created = await Patient.create({
      user_id: null,
      hospital_id: hospId,
      full_name: String(full_name).trim(),
      email: cleanEmail,
      phone: normalizedPhone,
      patient_source: "public",
      password: hashed,
      status: "active",
      last_login: null,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
    });

    const token = jwt.sign({ id: created.id, type: "patient" }, config.jwtSecret, { expiresIn: "7d" });
    return res.status(201).json({ success: true, data: { patient: sanitizePatient(created), token } });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ success: false, message: "Error registering patient", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const identifier = req.body.emailOrPhone || req.body.identifier || req.body.email || req.body.phone;
    const { password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "identifier and password are required" });
    }

    const idRaw = String(identifier).trim();
    const isPhoneLike = idRaw.startsWith("+") || idRaw.startsWith("0") || /^\d+$/.test(idRaw);
    let where = null;
    if (isPhoneLike) {
      let normalizedPhone = null;
      try {
        normalizedPhone = normalizeKenyanPhone(idRaw);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
      where = { phone: normalizedPhone };
    } else {
      where = { email: idRaw.toLowerCase() };
    }

    const patient = await Patient.findOne({ where });
    if (!patient || !patient.password) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, patient.password);
    if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (patient.status !== "active") {
      return res.status(403).json({ success: false, message: "Account is not active" });
    }

    await patient.update({ last_login: new Date() });
    const token = jwt.sign({ id: patient.id, type: "patient" }, config.jwtSecret, { expiresIn: "7d" });
    return res.status(200).json({ success: true, data: { patient: sanitizePatient(patient), token } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error logging in", error: error.message });
  }
};

const me = async (req, res) => {
  try {
    const patientId = req.patientId;
    if (!patientId) return res.status(401).json({ success: false, message: "Authentication required" });
    const patient = await Patient.findByPk(patientId);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    return res.status(200).json({ success: true, data: { patient: sanitizePatient(patient) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching profile", error: error.message });
  }
};

const logout = async (_req, res) => res.status(200).json({ success: true, message: "Logged out" });

module.exports = { register, login, me, logout };

