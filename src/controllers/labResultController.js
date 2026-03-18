const { Op } = require("sequelize");
const { LabOrderItem, LabTest, LabOrder, Patient, User, Staff, Consultation, Appointment, LabTestTemplate, LabResultData } = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");
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
    const hid = req.user?.hospital_id ?? null;

    const where = {};
    if (search) {
      where[Op.or] = [
        { interpretation: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await LabResultData.findAndCountAll({
      where,
      limit,
      offset,
      include: include.map((inc) => {
        if (inc?.as !== "labOrderItem") return inc;
        return {
          ...inc,
          include: (inc.include || []).map((inner) => {
            if (inner?.as !== "labOrder") return inner;
            return {
              ...inner,
              required: hid != null,
              where: hid != null ? { hospital_id: hid } : undefined,
            };
          }),
        };
      }),
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
    const { lab_order_item_id, lab_technician_id, result_date, results, interpretation } = req.body;
    const hid = req.user?.hospital_id ?? null;
    if (!lab_order_item_id) {
      return res.status(400).json({ success: false, message: "lab_order_item_id is required" });
    }

    const item = await LabOrderItem.findByPk(lab_order_item_id, { include: [{ model: LabTest, as: "labTest", required: false, include: [{ model: LabTestTemplate, as: "template", required: false }] }] });
    if (!item) return res.status(404).json({ success: false, message: "Lab order item not found" });

    // Hospital scoping: ensure the parent lab order belongs to the current hospital.
    if (hid != null) {
      const scopedOrder = await LabOrder.findOne({
        where: { id: item.lab_order_id, hospital_id: hid },
        attributes: ["id", "consultation_id"],
      });
      if (!scopedOrder) {
        return res.status(404).json({ success: false, message: "Lab order not found" });
      }
    }

    // Only Super Admin, lab technician, or doctor assigned to the appointment can enter/update results (like consultation).
    if (!isSuperAdmin(req)) {
      const staff = await getCurrentStaff(req);
      if (!staff) {
        return res.status(403).json({ success: false, message: "Access denied: staff account required" });
      }
      const order = await LabOrder.findOne({
        where: hid != null ? { id: item.lab_order_id, hospital_id: hid } : { id: item.lab_order_id },
        attributes: ["id", "consultation_id"],
      });
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

    // Option A policy: allow saving results before payment.
    // Payment is still enforced when marking the lab order as "completed" (see labOrderController.updateStatus).

    let techId = lab_technician_id ?? null;
    if (!techId && req.userId) {
      const staff = await Staff.findOne({ where: { user_id: req.userId } });
      if (staff) techId = staff.id;
    }

    // Template-aware result entry:
    // If a template exists for this test, expect `results` (object) and store it in LabResultData.
    // Supports checkbox (boolean), text (string), multi_text (array of strings), number, select, multi_select.
    const templateRow = item.labTest?.template || (item.lab_test_id ? await LabTestTemplate.findOne({ where: { lab_test_id: item.lab_test_id } }) : null);
    const template = templateRow?.template || null;
    const templateVersion = templateRow?.version || 1;

    const validateByTemplate = (tpl, vals) => {
      if (!tpl || typeof tpl !== "object") return { ok: true, errors: [] };
      const fields = Array.isArray(tpl.fields) ? tpl.fields : [];
      if (!fields.length) return { ok: true, errors: [] };
      if (vals == null || typeof vals !== "object" || Array.isArray(vals)) {
        return { ok: false, errors: ["results must be an object keyed by field key"] };
      }
      const errors = [];
      for (const f of fields) {
        const key = String(f.key || f.name || "").trim();
        if (!key) continue;
        const required = !!f.required;
        const type = String(f.type || "text").toLowerCase();
        const v = vals[key];

        const isEmpty =
          v === undefined ||
          v === null ||
          (typeof v === "string" && v.trim() === "") ||
          (Array.isArray(v) && v.length === 0);

        if (required && isEmpty) {
          errors.push(`${key} is required`);
          continue;
        }
        if (isEmpty) continue;

        if (type === "checkbox" || type === "boolean") {
          if (typeof v !== "boolean") errors.push(`${key} must be boolean`);
        } else if (type === "number") {
          const n = typeof v === "number" ? v : Number(v);
          if (!Number.isFinite(n)) errors.push(`${key} must be a number`);
        } else if (type === "select") {
          if (typeof v !== "string") errors.push(`${key} must be a string`);
          const options = Array.isArray(f.options) ? f.options.map(String) : null;
          if (options && !options.includes(String(v))) errors.push(`${key} must be one of: ${options.join(", ")}`);
        } else if (type === "multi_select") {
          if (!Array.isArray(v)) errors.push(`${key} must be an array`);
          const options = Array.isArray(f.options) ? f.options.map(String) : null;
          if (Array.isArray(v) && options) {
            for (const choice of v) {
              if (!options.includes(String(choice))) errors.push(`${key} has invalid option: ${choice}`);
            }
          }
        } else if (type === "multi_text") {
          if (!Array.isArray(v)) errors.push(`${key} must be an array of strings`);
          if (Array.isArray(v) && v.some((x) => typeof x !== "string")) errors.push(`${key} must be an array of strings`);
        } else {
          // text / textarea / default
          if (typeof v !== "string") errors.push(`${key} must be a string`);
        }
      }
      return { ok: errors.length === 0, errors };
    };

    const hasTemplate = template && typeof template === "object" && Array.isArray(template.fields) && template.fields.length > 0;
    if (hasTemplate) {
      const validated = validateByTemplate(template, results);
      if (!validated.ok) {
        return res.status(400).json({ success: false, message: "Invalid results for template", errors: validated.errors });
      }
    }

    const existing = await LabResultData.findOne({ where: { lab_order_item_id } });
    if (existing) {
      const updated = await existing.update({
        lab_technician_id: techId ?? existing.lab_technician_id,
        result_date: result_date ?? existing.result_date,
        template_version: templateVersion,
        template_snapshot: template,
        results: results || existing.results,
        interpretation: interpretation ?? existing.interpretation,
      });
      await auditLog(req, { action: "UPDATE_LABRESULT", table_name: "LabResultData", record_id: existing?.id });
      return res.status(200).json({ success: true, data: updated });
    }

    const created = await LabResultData.create({
      lab_order_item_id,
      lab_technician_id: techId ?? null,
      result_date: result_date ?? new Date(),
      template_version: templateVersion,
      template_snapshot: template,
      results: results || {},
      interpretation: interpretation ?? null,
    });
    await auditLog(req, { action: "CREATE_LABRESULT", table_name: "LabResultData", record_id: created?.id });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error entering lab results", error: error.message });
  }
};

const updateResults = enterResults;

module.exports = { list, enterResults, updateResults };

