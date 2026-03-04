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
  Bill,
  BillItem,
} = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");
const { sequelize } = require("../config/database");
const { requirePaidByReferenceOrRespond } = require("../utils/paymentGate");
const { auditLog } = require("../utils/auditLog");

const isSuperAdmin = (req) => req.userType === "user" && req.role?.name === "Super Admin";

async function getCurrentStaff(req) {
  if (!req.userId) return null;
  const staff = await Staff.findOne({ where: { user_id: req.userId } });
  return staff || null;
}

function isLabTechnicianStaff(staff) {
  const t = String(staff?.staff_type || "").toLowerCase();
  // Accept common naming variants: "lab_technician", "laboratory technician", "lab", etc.
  return t.includes("lab") || t.includes("laboratory") || t.includes("technician");
}

/** True if the current user is the staff/doctor assigned to the appointment linked to this lab order (via consultation). */
async function isAssignedDoctorForLabOrder(req, order) {
  const staff = await getCurrentStaff(req);
  if (!staff || !order?.consultation_id) return false;
  const consultation = await Consultation.findByPk(order.consultation_id, { attributes: ["appointment_id"] });
  if (!consultation?.appointment_id) return false;
  const appt = await Appointment.findByPk(consultation.appointment_id, { attributes: ["doctor_id"] });
  if (!appt?.doctor_id) return false;
  return String(appt.doctor_id) === String(staff.id);
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
    let appointmentIdForBill = null;

    if (!isSuperAdmin(req)) {
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
      appointmentIdForBill = appt.id;
    }

    // Admin can optionally create orders; if linked to a consultation and doctor_id not provided,
    // derive doctor_id from the appointment so the UI shows "Doctor".
    if (isSuperAdmin(req) && !finalDoctorId && consultation_id) {
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
      appointmentIdForBill = appt.id;
    }

    // If Super Admin provided consultation_id but we didn't load it above, still try to link the bill to appointment.
    if (!appointmentIdForBill && consultation_id) {
      const c = await Consultation.findByPk(consultation_id);
      if (c?.appointment_id) appointmentIdForBill = c.appointment_id;
    }

    const created = await sequelize.transaction(async (t) => {
      const order = await LabOrder.create(
        {
          patient_id,
          doctor_id: finalDoctorId,
          consultation_id: consultation_id ?? null,
          status: "pending",
          hospital_id: req.user?.hospital_id ?? null,
        },
        { transaction: t }
      );

      let rows = [];
      let total = 0;

      if (Array.isArray(items) && items.length) {
        const testIds = items.map((i) => i.lab_test_id).filter(Boolean);
        const tests = await LabTest.findAll({ where: { id: testIds } });
        const valid = new Set(tests.map((tt) => tt.id));
        const priceById = new Map(tests.map((tt) => [String(tt.id), Number(tt.price || 0)]));

        rows = items
          .filter((i) => valid.has(i.lab_test_id))
          .map((i) => ({ lab_order_id: order.id, lab_test_id: i.lab_test_id }));

        if (rows.length) {
          await LabOrderItem.bulkCreate(rows, { transaction: t });
          total = rows.reduce((sum, r) => sum + Number(priceById.get(String(r.lab_test_id)) || 0), 0);
        }
      }

      // Auto-create billing for this lab order (unpaid).
      if (rows.length) {
        const bill = await Bill.create(
          {
            patient_id,
            consultation_id: consultation_id ?? null,
            appointment_id: appointmentIdForBill ?? null,
            total_amount: total,
            status: "unpaid",
            hospital_id: req.user?.hospital_id ?? null,
          },
          { transaction: t }
        );

        await BillItem.create(
          {
            bill_id: bill.id,
            item_type: "lab_order",
            reference_id: order.id,
            amount: total,
          },
          { transaction: t }
        );
      }

      return order;
    });

    const reloaded = await LabOrder.findByPk(created.id, {
      include: [{ model: LabOrderItem, as: "items" }],
    });
    await auditLog(req, { action: "CREATE_LABORDER", table_name: "LabOrder", record_id: created?.id });
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

    // Status updates: Super Admin, or lab technician, or staff assigned to the appointment (like consultation).
    if (!isSuperAdmin(req)) {
      const staff = await getCurrentStaff(req);
      if (!staff) {
        return res.status(403).json({ success: false, message: "Access denied: staff account required" });
      }
      const isLabTech = isLabTechnicianStaff(staff);
      const isAssignedDoctor = await isAssignedDoctorForLabOrder(req, order);
      if (!isLabTech && !isAssignedDoctor) {
        return res.status(403).json({
          success: false,
          message: "Access denied: lab technician or doctor assigned to this appointment required",
        });
      }

      // Lab technician and assigned doctor: same workflow rules (no cancel, no set back to pending).
      if (status === "cancelled") {
        return res.status(403).json({ success: false, message: "Only Super Admin can cancel lab orders" });
      }
      if (status === "pending") {
        return res.status(403).json({ success: false, message: "Cannot set status back to pending" });
      }
    }

    const current = order.status;
    if (current === "completed" || current === "cancelled") {
      return res.status(400).json({ success: false, message: `Cannot change status from ${current}` });
    }

    // Simple transitions
    const transitions = {
      pending: new Set(["in_progress"]),
      in_progress: new Set(["completed"]),
    };
    if (status === current) {
      return res.status(200).json({ success: true, data: order });
    }
    const can = transitions[current]?.has(status);
    if (!can && !isSuperAdmin(req)) {
      return res.status(400).json({ success: false, message: `Invalid status transition: ${current} → ${status}` });
    }

    if (status === "completed") {
      const ok = await requirePaidByReferenceOrRespond(res, {
        item_type: "lab_order",
        reference_id: id,
        actionLabel: 'marking lab order as "completed"',
      });
      if (!ok) return;
    }

    const updated = await order.update({ status });
    await auditLog(req, { action: "UPDATE_LABORDER_STATUS", table_name: "LabOrder", record_id: id });
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

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await LabOrder.findByPk(id, {
      include: [
        {
          model: Patient,
          as: "patient",
          required: false,
          attributes: { exclude: ["password"] },
          include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
        },
        {
          model: Staff,
          as: "doctor",
          required: false,
          include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
        },
        { model: Consultation, as: "consultation", required: false },
        {
          model: LabOrderItem,
          as: "items",
          required: false,
          include: [
            { model: LabTest, as: "labTest", required: false },
            {
              model: LabResult,
              as: "result",
              required: false,
              include: [
                {
                  model: Staff,
                  as: "labTechnician",
                  required: false,
                  attributes: ["id", "staff_type"],
                  include: [{ model: User, as: "user", attributes: ["id", "full_name"], required: false }],
                },
              ],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    if (!order) return res.status(404).json({ success: false, message: "Lab order not found" });
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching lab order", error: error.message });
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
            {
              model: LabResult,
              as: "result",
              required: false,
              include: [
                {
                  model: Staff,
                  as: "labTechnician",
                  required: false,
                  attributes: ["id", "staff_type"],
                  include: [{ model: User, as: "user", attributes: ["id", "full_name"], required: false }],
                },
              ],
            },
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
    await auditLog(req, { action: "DELETE_LABORDER", table_name: "LabOrder", record_id: id });
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

module.exports = { createLabOrder, updateStatus, getById, list, remove };
