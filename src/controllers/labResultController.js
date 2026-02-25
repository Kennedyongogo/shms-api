const { Op } = require("sequelize");
const { LabResult, LabOrderItem, LabTest, LabOrder, Patient, User, Staff, Consultation, Appointment } = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");
const { requirePaidByReferenceOrRespond } = require("../utils/paymentGate");
const { auditLog } = require("../utils/auditLog");

const isAdmin = (req) => req.userType === "user" && req.role?.name === "admin";

async function getCurrentStaff(req) {
  if (!req.userId) return null;
  const staff = await Staff.findOne({ where: { user_id: req.userId } });
  return staff || null;
}

function isLabTechnicianStaff(staff) {
  const t = String(staff?.staff_type || "").toLowerCase();
  return t.includes("lab") || t.includes("laboratory") || t.includes("technician");
}

/** True if the current user is the staff/doctor assigned to the appointment linked to this lab order. */
async function isAssignedDoctorForLabOrder(req, order) {
  const staff = await getCurrentStaff(req);
  if (!staff || !order?.consultation_id) return false;
  const consultation = await Consultation.findByPk(order.consultation_id, { attributes: ["appointment_id"] });
  if (!consultation?.appointment_id) return false;
  const appt = await Appointment.findByPk(consultation.appointment_id, { attributes: ["doctor_id"] });
  if (!appt?.doctor_id) return false;
  return String(appt.doctor_id) === String(staff.id);
}

const include = [
  {
    model: LabOrderItem,
    as: "labOrderItem",
    required: true,
    include: [
      { model: LabTest, as: "labTest", required: false },
      {
        model: LabOrder,
        as: "labOrder",
        required: false,
        include: [
          {
            model: Patient,
            as: "patient",
            attributes: { exclude: ["password"] },
            required: false,
            include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
          },
          { model: Staff, as: "doctor", required: false, include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }] },
        ],
      },
    ],
  },
  {
    model: Staff,
    as: "labTechnician",
    required: false,
    include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
  },
];

const list = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { result_value: { [Op.iLike]: `%${search}%` } },
        { reference_range: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await LabResult.findAndCountAll({
      where,
      limit,
      offset,
      include,
      order: [["result_date", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error listing lab results", error: error.message });
  }
};

const enterResults = async (req, res) => {
  try {
    const { lab_order_item_id, result_value, reference_range, interpretation, lab_technician_id, result_date } = req.body;
    if (!lab_order_item_id) {
      return res.status(400).json({ success: false, message: "lab_order_item_id is required" });
    }

    const item = await LabOrderItem.findByPk(lab_order_item_id);
    if (!item) return res.status(404).json({ success: false, message: "Lab order item not found" });

    // Only admin, lab technician, or doctor assigned to the appointment can enter/update results (like consultation).
    if (!isAdmin(req)) {
      const staff = await getCurrentStaff(req);
      if (!staff) {
        return res.status(403).json({ success: false, message: "Access denied: staff account required" });
      }
      const order = await LabOrder.findByPk(item.lab_order_id, { attributes: ["id", "consultation_id"] });
      if (!order) return res.status(404).json({ success: false, message: "Lab order not found" });
      const isLabTech = isLabTechnicianStaff(staff);
      const isAssignedDoctor = await isAssignedDoctorForLabOrder(req, order);
      if (!isLabTech && !isAssignedDoctor) {
        return res.status(403).json({
          success: false,
          message: "Access denied: lab technician or doctor assigned to this appointment required to enter results",
        });
      }
    }

    // Enforce payment before results can be entered/updated.
    const ok = await requirePaidByReferenceOrRespond(res, {
      item_type: "lab_order",
      reference_id: item.lab_order_id,
      actionLabel: "entering lab results",
    });
    if (!ok) return;

    let techId = lab_technician_id ?? null;
    if (!techId && req.userId) {
      const staff = await Staff.findOne({ where: { user_id: req.userId } });
      if (staff) techId = staff.id;
    }

    const existing = await LabResult.findOne({ where: { lab_order_item_id } });
    if (existing) {
      const updated = await existing.update({
        result_value: result_value ?? existing.result_value,
        reference_range: reference_range ?? existing.reference_range,
        interpretation: interpretation ?? existing.interpretation,
        lab_technician_id: techId ?? existing.lab_technician_id,
        result_date: result_date ?? existing.result_date,
      });
      await auditLog(req, { action: "UPDATE_LABRESULT", table_name: "LabResult", record_id: existing?.id });
      return res.status(200).json({ success: true, data: updated });
    }

    const created = await LabResult.create({
      lab_order_item_id,
      result_value: result_value ?? null,
      reference_range: reference_range ?? null,
      interpretation: interpretation ?? null,
      lab_technician_id: techId ?? null,
      result_date: result_date ?? new Date(),
    });
    await auditLog(req, { action: "CREATE_LABRESULT", table_name: "LabResult", record_id: created?.id });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error entering lab results", error: error.message });
  }
};

const updateResults = enterResults;

module.exports = { list, enterResults, updateResults };

