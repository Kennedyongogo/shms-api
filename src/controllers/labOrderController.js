const { Op } = require("sequelize");
const {
  LabOrder,
  LabOrderItem,
  LabTest,
  LabResult,
  Consultation,
  Appointment,
  Staff,
  Patient,
  User,
} = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");
const { sequelize } = require("../config/database");
const { requirePaidByReferenceOrRespond } = require("../utils/paymentGate");

const isAdmin = (req) => req.userType === "user" && req.role?.name === "admin";

async function getCurrentStaff(req) {
  if (!req.userId) return null;
  const staff = await Staff.findOne({ where: { user_id: req.userId } });
  return staff || null;
}

const createLabOrder = async (req, res) => {
  try {
    const { patient_id, doctor_id, consultation_id, items } = req.body;
    if (!patient_id) {
      return res
        .status(400)
        .json({ success: false, message: "patient_id is required" });
    }

    let finalDoctorId = doctor_id ?? null;

    if (!isAdmin(req)) {
      const staff = await getCurrentStaff(req);
      if (!staff)
        return res
          .status(403)
          .json({
            success: false,
            message: "Access denied: staff account required",
          });

      if (!consultation_id) {
        return res
          .status(400)
          .json({ success: false, message: "consultation_id is required" });
      }

      const consultation = await Consultation.findByPk(consultation_id);
      if (!consultation)
        return res
          .status(404)
          .json({ success: false, message: "Consultation not found" });

      const appt = await Appointment.findByPk(consultation.appointment_id);
      if (!appt)
        return res
          .status(404)
          .json({ success: false, message: "Appointment not found" });
      if (String(appt.doctor_id) !== String(staff.id)) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Access denied: only assigned doctor can create lab orders for this consultation",
          });
      }
      if (String(appt.patient_id) !== String(patient_id)) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "patient_id does not match consultation appointment patient",
          });
      }

      finalDoctorId = staff.id;
    }

    // Admin can optionally create orders; if linked to a consultation and doctor_id not provided,
    // derive doctor_id from the appointment so the UI shows "Doctor".
    if (isAdmin(req) && !finalDoctorId && consultation_id) {
      const consultation = await Consultation.findByPk(consultation_id);
      if (!consultation)
        return res
          .status(404)
          .json({ success: false, message: "Consultation not found" });
      const appt = await Appointment.findByPk(consultation.appointment_id);
      if (!appt)
        return res
          .status(404)
          .json({ success: false, message: "Appointment not found" });
      if (String(appt.patient_id) !== String(patient_id)) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "patient_id does not match consultation appointment patient",
          });
      }
      finalDoctorId = appt.doctor_id;
    }

    const order = await LabOrder.create({
      patient_id,
      doctor_id: finalDoctorId,
      consultation_id: consultation_id ?? null,
      status: "pending",
    });

    if (Array.isArray(items) && items.length) {
      const testIds = items.map((i) => i.lab_test_id).filter(Boolean);
      const tests = await LabTest.findAll({ where: { id: testIds } });
      const valid = new Set(tests.map((t) => t.id));
      const rows = items
        .filter((i) => valid.has(i.lab_test_id))
        .map((i) => ({ lab_order_id: order.id, lab_test_id: i.lab_test_id }));
      if (rows.length) await LabOrderItem.bulkCreate(rows);
    }

    const reloaded = await LabOrder.findByPk(order.id, {
      include: [{ model: LabOrderItem, as: "items" }],
    });
    return res.status(201).json({ success: true, data: reloaded });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error creating lab order",
        error: error.message,
      });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = new Set([
      "pending",
      "in_progress",
      "completed",
      "cancelled",
    ]);
    if (!status || !allowed.has(status)) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'status must be one of: "pending", "in_progress", "completed", "cancelled"',
        });
    }
    const order = await LabOrder.findByPk(id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Lab order not found" });

    if (status === "completed") {
      const ok = await requirePaidByReferenceOrRespond(res, {
        item_type: "lab_order",
        reference_id: id,
        actionLabel: 'marking lab order as "completed"',
      });
      if (!ok) return;
    }

    const updated = await order.update({ status });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error updating lab order status",
        error: error.message,
      });
  }
};

const list = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { status, patient_id, doctor_id, consultation_id, search } =
      req.query;

    const where = {};
    if (status) where.status = status;
    if (patient_id) where.patient_id = patient_id;
    if (doctor_id) where.doctor_id = doctor_id;
    if (consultation_id) where.consultation_id = consultation_id;

    const patientWhere = search
      ? {
          [Op.or]: [
            { full_name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : undefined;

    const { count, rows } = await LabOrder.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
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
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "email", "phone"],
              required: false,
            },
          ],
        },
        { model: Consultation, as: "consultation", required: false },
        {
          model: LabOrderItem,
          as: "items",
          required: false,
          include: [
            { model: LabTest, as: "labTest", required: false },
            { model: LabResult, as: "result", required: false },
          ],
        },
      ],
    });
    return res
      .status(200)
      .json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error listing lab orders",
        error: error.message,
      });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await LabOrder.findByPk(id, {
      include: [
        {
          model: LabOrderItem,
          as: "items",
          required: false,
          include: [{ model: LabResult, as: "result", required: false }],
        },
      ],
    });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Lab order not found" });

    const hasResults = (order.items || []).some((it) => Boolean(it.result));
    if (hasResults) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete lab order because results exist. Consider cancelling instead.",
      });
    }

    // Be robust even if DB constraints were created without ON DELETE CASCADE.
    await sequelize.transaction(async (t) => {
      await LabOrderItem.destroy({
        where: { lab_order_id: id },
        transaction: t,
      });
      await LabOrder.destroy({ where: { id }, transaction: t });
    });
    return res
      .status(200)
      .json({ success: true, message: "Lab order deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error deleting lab order",
        error: error.message,
      });
  }
};

module.exports = { createLabOrder, updateStatus, list, remove };
