const { Op } = require("sequelize");
const { Consultation, Appointment, Patient, Staff, User } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { requirePaidByReferenceOrRespond } = require("../utils/paymentGate");
const { auditLog } = require("../utils/auditLog");

const crud = createCrudController({
  Model: Consultation,
  name: "Consultation",
  searchableFields: ["symptoms", "diagnosis", "notes"],
});

const includeAppointmentDetails = [
  {
    model: Appointment,
    as: "appointment",
    include: [
      {
        model: Patient,
        as: "patient",
        attributes: { exclude: ["password"] },
        include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
      },
      {
        model: Staff,
        as: "doctor",
        include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
      },
    ],
  },
];

async function requireAppointmentConfirmedAndPaidOrRespond(res, appointment_id) {
  if (!appointment_id) {
    res.status(400).json({ success: false, message: "appointment_id is required" });
    return null;
  }

  const appt = await Appointment.findByPk(appointment_id);
  if (!appt) {
    res.status(404).json({ success: false, message: "Appointment not found" });
    return null;
  }

  if (appt.status !== "confirmed" && appt.status !== "completed") {
    res.status(409).json({
      success: false,
      code: "APPOINTMENT_NOT_CONFIRMED",
      message: "Consultation can only be recorded after the appointment is confirmed (payment required).",
      appointment: { id: appt.id, status: appt.status },
    });
    return null;
  }

  const ok = await requirePaidByReferenceOrRespond(res, {
    item_type: "appointment",
    reference_id: appt.id,
    actionLabel: "recording a consultation",
  });
  if (!ok) return null;

  return appt;
}

// record consultation (create) - ensure appointment exists
const recordConsultation = async (req, res) => {
  try {
    const { appointment_id, symptoms, diagnosis, notes } = req.body;
    const appt = await requireAppointmentConfirmedAndPaidOrRespond(res, appointment_id);
    if (!appt) return;

    const existing = await Consultation.findOne({ where: { appointment_id } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Consultation already exists for this appointment" });
    }

    const consultation = await Consultation.create({
      appointment_id,
      symptoms: symptoms ?? null,
      diagnosis: diagnosis ?? null,
      notes: notes ?? null,
    });
    await auditLog(req, { action: "RECORD_CONSULTATION", table_name: "Consultation", record_id: consultation?.id });
    return res.status(201).json({ success: true, data: consultation });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error recording consultation", error: error.message });
  }
};

// create (generic) - enforce same gate as /record
const create = async (req, res) => {
  try {
    const { appointment_id, symptoms, diagnosis, notes } = req.body;
    const appt = await requireAppointmentConfirmedAndPaidOrRespond(res, appointment_id);
    if (!appt) return;

    const existing = await Consultation.findOne({ where: { appointment_id } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Consultation already exists for this appointment" });
    }

    const consultation = await Consultation.create({
      appointment_id,
      symptoms: symptoms ?? null,
      diagnosis: diagnosis ?? null,
      notes: notes ?? null,
    });
    await auditLog(req, { action: "CREATE_CONSULTATION", table_name: "Consultation", record_id: consultation?.id });
    return res.status(201).json({ success: true, data: consultation });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error creating consultation", error: error.message });
  }
};

const getByAppointmentId = async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const record = await Consultation.findOne({ where: { appointment_id }, include: includeAppointmentDetails });
    if (!record) return res.status(404).json({ success: false, message: "Consultation not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching consultation", error: error.message });
  }
};

const updateDiagnosis = async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, notes, symptoms } = req.body;
    const consultation = await Consultation.findByPk(id);
    if (!consultation) return res.status(404).json({ success: false, message: "Consultation not found" });

    const appt = await requireAppointmentConfirmedAndPaidOrRespond(res, consultation.appointment_id);
    if (!appt) return;

    const updated = await consultation.update({
      diagnosis: diagnosis ?? consultation.diagnosis,
      notes: notes ?? consultation.notes,
      symptoms: symptoms ?? consultation.symptoms,
    });
    await auditLog(req, { action: "UPDATE_CONSULTATION", table_name: "Consultation", record_id: id });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating diagnosis", error: error.message });
  }
};

// List consultations with appointment + patient + doctor details (supports search)
const listConsultations = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search } = req.query;

    const patientWhere = search
      ? {
          [Op.or]: [
            { full_name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : undefined;

    const where = search
      ? {
          [Op.or]: [
            { symptoms: { [Op.iLike]: `%${search}%` } },
            { diagnosis: { [Op.iLike]: `%${search}%` } },
            { notes: { [Op.iLike]: `%${search}%` } },
            { appointment_id: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const { count, rows } = await Consultation.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Appointment,
          as: "appointment",
          required: true,
          include: [
            {
              model: Patient,
              as: "patient",
              required: true,
              where: patientWhere,
              attributes: { exclude: ["password"] },
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["id", "full_name", "email", "phone"],
                  required: false,
                },
              ],
            },
            {
              model: Staff,
              as: "doctor",
              required: true,
              include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
            },
          ],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error listing consultations", error: error.message });
  }
};

const getConsultationById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Consultation.findByPk(id, {
      include: includeAppointmentDetails,
    });
    if (!record) return res.status(404).json({ success: false, message: "Consultation not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching consultation", error: error.message });
  }
};

// Override CRUD update/remove to enforce the same gate
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Consultation.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Consultation not found" });

    const appt = await requireAppointmentConfirmedAndPaidOrRespond(res, record.appointment_id);
    if (!appt) return;

    const updated = await record.update(req.body);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating consultation", error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Consultation.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Consultation not found" });

    const appt = await requireAppointmentConfirmedAndPaidOrRespond(res, record.appointment_id);
    if (!appt) return;

    await record.destroy();
    return res.status(200).json({ success: true, message: "Consultation deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error deleting consultation", error: error.message });
  }
};

module.exports = {
  ...crud,
  create,
  update,
  remove,
  recordConsultation,
  updateDiagnosis,
  listConsultations,
  getConsultationById,
  getByAppointmentId,
};
