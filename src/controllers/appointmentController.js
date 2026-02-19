const { Op } = require("sequelize");
const { Appointment, Consultation, Patient, Staff, User, Service, LabOrder, LabOrderItem, LabResult } = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");
const { requirePaidByReferenceOrRespond } = require("../utils/paymentGate");

const bookAppointment = async (req, res) => {
  try {
    const { patient_id, doctor_id, service_id, appointment_date, created_by } = req.body;
    if (!patient_id || !doctor_id || !appointment_date) {
      return res.status(400).json({
        success: false,
        message: "patient_id, doctor_id, appointment_date are required",
      });
    }

    const appt = await Appointment.create({
      patient_id,
      doctor_id,
      service_id: service_id ?? null,
      appointment_date,
      status: "pending",
      created_by: created_by ?? null,
    });
    return res.status(201).json({ success: true, data: appt });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error booking appointment", error: error.message });
  }
};

const updateStatus = async (req, res, status) => {
  const { id } = req.params;
  const appt = await Appointment.findByPk(id);
  if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

  if (status === "confirmed" || status === "completed") {
    const ok = await requirePaidByReferenceOrRespond(res, {
      item_type: "appointment",
      reference_id: id,
      actionLabel: `setting appointment status to "${status}"`,
    });
    if (!ok) return;
  }

  const updated = await appt.update({ status });
  return res.status(200).json({ success: true, data: updated });
};

const confirm = async (req, res) => {
  try {
    return await updateStatus(req, res, "confirmed");
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error confirming appointment", error: error.message });
  }
};

const cancel = async (req, res) => {
  try {
    return await updateStatus(req, res, "cancelled");
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error cancelling appointment", error: error.message });
  }
};

const setStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = new Set(["pending", "confirmed", "completed", "cancelled"]);
    if (!status || !allowed.has(status)) {
      return res.status(400).json({ success: false, message: 'status must be one of: "pending", "confirmed", "completed", "cancelled"' });
    }

    const appt = await Appointment.findByPk(id);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

    const current = appt.status;
    if (current === "completed" || current === "cancelled") {
      return res.status(400).json({ success: false, message: `Cannot change status from ${current}` });
    }

    const transitions = {
      pending: new Set(["confirmed", "cancelled"]),
      confirmed: new Set(["completed", "cancelled"]),
    };
    if (status === current) {
      return res.status(200).json({ success: true, data: appt });
    }
    const can = transitions[current]?.has(status);
    if (!can) {
      return res.status(400).json({ success: false, message: `Invalid status transition: ${current} → ${status}` });
    }

    if (status === "confirmed" || status === "completed") {
      const ok = await requirePaidByReferenceOrRespond(res, {
        item_type: "appointment",
        reference_id: id,
        actionLabel: `setting appointment status to "${status}"`,
      });
      if (!ok) return;
    }

    // Prevent completing appointment when lab work is pending
    if (status === "completed") {
      const consultation = await Consultation.findOne({
        where: { appointment_id: id },
        include: [
          {
            model: LabOrder,
            as: "labOrders",
            required: false,
            include: [{ model: LabOrderItem, as: "items", required: false, include: [{ model: LabResult, as: "result", required: false }] }],
          },
        ],
      });

      const labOrders = consultation?.labOrders || [];
      const hasPendingOrders = labOrders.some((o) => o.status !== "completed" && o.status !== "cancelled");
      const hasMissingResults = labOrders
        .filter((o) => o.status !== "cancelled")
        .some((o) => (o.items || []).some((it) => !it.result));

      if (hasPendingOrders || hasMissingResults) {
        return res.status(400).json({
          success: false,
          message: "Cannot mark appointment as completed while lab tests are pending. Complete/cancel lab orders and enter results first.",
        });
      }
    }

    const updated = await appt.update({ status });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating appointment status", error: error.message });
  }
};

const listByDoctor = async (req, res) => {
  try {
    const { doctor_id } = req.params;
    const { page, limit, offset } = parsePagination(req.query);
    const { count, rows } = await Appointment.findAndCountAll({
      where: { doctor_id },
      limit,
      offset,
      order: [["appointment_date", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error listing appointments", error: error.message });
  }
};

const listByPatient = async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { page, limit, offset } = parsePagination(req.query);
    const { count, rows } = await Appointment.findAndCountAll({
      where: { patient_id },
      limit,
      offset,
      order: [["appointment_date", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error listing appointments", error: error.message });
  }
};

const listAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, status, doctor_id, patient_id } = req.query;

    const where = {};
    if (status) where.status = status;
    if (doctor_id) where.doctor_id = doctor_id;
    if (patient_id) where.patient_id = patient_id;

    const patientWhere = search
      ? {
          [Op.or]: [
            { full_name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : undefined;

    const include = [
      {
        model: Patient,
        as: "patient",
        required: true,
        where: patientWhere,
        attributes: { exclude: ["password"] },
        include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
      },
      { model: Service, as: "service", attributes: ["id", "name", "price", "status"], required: false },
      {
        model: Staff,
        as: "doctor",
        required: true,
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
        model: User,
        as: "createdBy",
        attributes: ["id", "full_name", "email"],
        required: false,
      },
    ];

    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [["appointment_date", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error listing appointments", error: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: { exclude: ["password"] },
          include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"] }],
        },
        { model: Service, as: "service", attributes: ["id", "name", "price", "status"], required: false },
        {
          model: Staff,
          as: "doctor",
          include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
        },
        { model: User, as: "createdBy", attributes: ["id", "full_name", "email"], required: false },
      ],
    });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
    return res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching appointment", error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findByPk(id);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

    const hasConsultation = await Consultation.findOne({ where: { appointment_id: id } });
    if (hasConsultation) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete appointment because a consultation exists. Consider cancelling instead.",
      });
    }

    await appt.destroy();
    return res.status(200).json({ success: true, message: "Appointment deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error deleting appointment", error: error.message });
  }
};

module.exports = { bookAppointment, confirm, cancel, setStatus, listByDoctor, listByPatient, listAll, getById, remove };

