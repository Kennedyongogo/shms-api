const {
  Admission,
  Appointment,
  Bed,
  Ward,
  Department,
  Patient,
  User,
  NursingNote,
  Staff,
  Bill,
  BillItem,
} = require("../models");
const { sequelize } = require("../config/database");
const { parsePagination } = require("../utils/crudControllerFactory");
const { auditLog } = require("../utils/auditLog");
const { requirePaidByReferenceOrRespond } = require("../utils/paymentGate");
const { getHospitalId } = require("../utils/hospitalScope");

const isSuperAdmin = (req) => req.userType === "user" && req.role?.name === "Super Admin";

async function getCurrentStaff(req) {
  if (!req.userId) return null;
  const staff = await Staff.findOne({ where: { user_id: req.userId } });
  return staff || null;
}

const admissionIncludes = [
  { model: Patient, as: "patient", attributes: ["id", "full_name", "email", "phone"], include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"] }] },
  { model: Appointment, as: "appointment", attributes: ["id", "appointment_date", "doctor_id", "patient_id", "service_id"], include: [{ model: Staff, as: "doctor", attributes: ["id"], include: [{ model: User, as: "user", attributes: ["id", "full_name"] }] }] },
  { model: Staff, as: "doctor", attributes: ["id"], include: [{ model: User, as: "user", attributes: ["id", "full_name"] }] },
  { model: Bed, as: "bed", attributes: ["id", "bed_number", "status", "ward_id"], include: [{ model: Ward, as: "ward", attributes: ["id", "name", "type", "department_id"], include: [{ model: Department, as: "department", attributes: ["id", "name"] }] }] },
  { model: NursingNote, as: "nursingNotes", separate: true, order: [["recorded_at", "DESC"]], include: [{ model: Staff, as: "nurse", attributes: ["id"], include: [{ model: User, as: "user", attributes: ["id", "full_name"] }] }] },
];

const listAdmissions = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { status, appointment_id, patient_id } = req.query;
    const where = {};
    const hid = getHospitalId(req);
    if (hid != null) where.hospital_id = hid;
    if (status && String(status).trim()) {
      where.status = String(status).trim();
    }
    if (appointment_id && String(appointment_id).trim()) {
      where.appointment_id = String(appointment_id).trim();
    }
    if (patient_id && String(patient_id).trim()) {
      where.patient_id = String(patient_id).trim();
    }
    const { count, rows } = await Admission.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: Patient, as: "patient", attributes: ["id", "full_name", "email", "phone"], include: [{ model: User, as: "user", attributes: ["id", "full_name"] }] },
        { model: Appointment, as: "appointment", attributes: ["id", "appointment_date", "doctor_id", "patient_id"], include: [{ model: Staff, as: "doctor", attributes: ["id"], include: [{ model: User, as: "user", attributes: ["id", "full_name"] }] }] },
        { model: Staff, as: "doctor", attributes: ["id"], include: [{ model: User, as: "user", attributes: ["id", "full_name"] }] },
        { model: Bed, as: "bed", attributes: ["id", "bed_number", "status", "ward_id"], include: [{ model: Ward, as: "ward", attributes: ["id", "name", "type"], include: [{ model: Department, as: "department", attributes: ["id", "name"] }] }] },
        { model: NursingNote, as: "nursingNotes", separate: true, order: [["recorded_at", "DESC"]], include: [{ model: Staff, as: "nurse", attributes: ["id"], required: false, include: [{ model: User, as: "user", attributes: ["id", "full_name"] }] }] },
      ],
      order: [["admission_date", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error listing admissions", error: error.message });
  }
};

const getAdmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const admission = await Admission.findByPk(id, { include: admissionIncludes });
    if (!admission) return res.status(404).json({ success: false, message: "Admission not found" });
    const hid = getHospitalId(req);
    if (hid != null && admission.hospital_id != null && admission.hospital_id !== hid)
      return res.status(404).json({ success: false, message: "Admission not found" });
    return res.status(200).json({ success: true, data: admission });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching admission", error: error.message });
  }
};

const admitPatient = async (req, res) => {
  try {
    const { patient_id, bed_id, doctor_id, appointment_id, admission_date } = req.body;
    if (!bed_id) {
      return res.status(400).json({ success: false, message: "bed_id is required" });
    }

    let finalPatientId = patient_id;
    let finalDoctorId = doctor_id;
    let finalAppointmentId = appointment_id || null;

    if (appointment_id) {
      const appointment = await Appointment.findByPk(appointment_id);
      if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
      finalPatientId = appointment.patient_id;
      finalDoctorId = appointment.doctor_id;
      finalAppointmentId = appointment_id;
      if (patient_id && String(patient_id) !== String(appointment.patient_id)) {
        return res.status(400).json({ success: false, message: "patient_id does not match appointment" });
      }
      if (!isSuperAdmin(req)) {
        const staff = await getCurrentStaff(req);
        if (!staff) return res.status(403).json({ success: false, message: "Access denied: staff account required" });
        if (String(staff.id) !== String(appointment.doctor_id)) {
          return res.status(403).json({ success: false, message: "Access denied: only the doctor assigned to this appointment can admit the patient" });
        }
      }
    } else {
      if (!patient_id || !doctor_id) {
        return res.status(400).json({ success: false, message: "patient_id and doctor_id are required when not linking an appointment" });
      }
      finalPatientId = patient_id;
      finalDoctorId = doctor_id;
      if (!isSuperAdmin(req)) {
        const staff = await getCurrentStaff(req);
        if (!staff) return res.status(403).json({ success: false, message: "Access denied: staff account required" });
        if (String(staff.id) !== String(doctor_id)) {
          return res.status(403).json({ success: false, message: "Access denied: only the admitting doctor can admit a patient" });
        }
      }
    }

    const bed = await Bed.findByPk(bed_id);
    if (!bed) return res.status(404).json({ success: false, message: "Bed not found" });
    if (bed.status !== "available") {
      return res.status(400).json({ success: false, message: "Bed is not available" });
    }

    const hospitalId = getHospitalId(req);
    const result = await sequelize.transaction(async (tx) => {
      const admission = await Admission.create(
        {
          patient_id: finalPatientId,
          bed_id,
          appointment_id: finalAppointmentId,
          doctor_id: finalDoctorId,
          admission_date: admission_date ?? new Date(),
          status: "admitted",
          hospital_id: hospitalId ?? null,
        },
        { transaction: tx }
      );
      await bed.update({ status: "occupied" }, { transaction: tx });

      // Start admission billing: one unpaid bill with one item (amount 0 until discharge)
      const bill = await Bill.create(
        {
          patient_id: finalPatientId,
          total_amount: 0,
          status: "unpaid",
          hospital_id: hospitalId ?? null,
        },
        { transaction: tx }
      );
      await BillItem.create(
        {
          bill_id: bill.id,
          item_type: "admission",
          reference_id: admission.id,
          amount: 0,
        },
        { transaction: tx }
      );

      return admission;
    });

    await auditLog(req, { action: "ADMIT_PATIENT", table_name: "Admission", record_id: result?.id });
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error admitting patient", error: error.message });
  }
};

/** Generate admission billing: set bill amount = days × ward daily_rate. Does not discharge. */
const generateAdmissionBilling = async (req, res) => {
  try {
    const { id } = req.params;
    const admission = await Admission.findByPk(id, {
      include: [{ model: Bed, as: "bed", include: [{ model: Ward, as: "ward" }] }],
    });
    if (!admission) return res.status(404).json({ success: false, message: "Admission not found" });

    if (!isSuperAdmin(req)) {
      const staff = await getCurrentStaff(req);
      if (!staff) return res.status(403).json({ success: false, message: "Access denied: staff account required" });
      if (admission.doctor_id && String(admission.doctor_id) !== String(staff.id)) {
        return res.status(403).json({ success: false, message: "Access denied: only the admitting doctor can generate billing for this admission" });
      }
    }

    if (admission.status !== "admitted") {
      return res.status(400).json({ success: false, message: "Only admitted patients can have billing generated" });
    }

    const asOfDate = new Date();
    const admissionDate = new Date(admission.admission_date);
    const dayMs = 24 * 60 * 60 * 1000;
    // Any part of a day counts as one full day (ceil); minimum 1 day
    const days = Math.max(1, Math.ceil((asOfDate - admissionDate) / dayMs));
    const ward = admission.bed?.ward;
    const dailyRate = Number(ward?.daily_rate ?? 0) || 0;
    const amount = Math.round(days * dailyRate * 100) / 100;

    const billItem = await BillItem.findOne({ where: { item_type: "admission", reference_id: id } });
    if (!billItem) return res.status(404).json({ success: false, message: "Admission bill not found" });

    await billItem.update({ amount });
    const items = await BillItem.findAll({ where: { bill_id: billItem.bill_id } });
    const total = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    await Bill.update({ total_amount: total }, { where: { id: billItem.bill_id } });

    await auditLog(req, { action: "GENERATE_ADMISSION_BILLING", table_name: "Admission", record_id: id });
    return res.status(200).json({
      success: true,
      message: "Billing generated. Patient must pay before discharge.",
      data: { admission_id: id, bill_id: billItem.bill_id, days, daily_rate: dailyRate, total_amount: total },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error generating admission billing", error: error.message });
  }
};

const dischargePatient = async (req, res) => {
  try {
    const { id } = req.params; // admission id
    const admission = await Admission.findByPk(id, {
      include: [{ model: Bed, as: "bed", include: [{ model: Ward, as: "ward" }] }],
    });
    if (!admission) return res.status(404).json({ success: false, message: "Admission not found" });

    if (!isSuperAdmin(req)) {
      const staff = await getCurrentStaff(req);
      if (!staff) return res.status(403).json({ success: false, message: "Access denied: staff account required" });
      if (admission.doctor_id && String(admission.doctor_id) !== String(staff.id)) {
        return res.status(403).json({ success: false, message: "Access denied: only the admitting doctor can discharge this patient" });
      }
    }

    if (admission.status !== "admitted") {
      return res.status(400).json({ success: false, message: "Patient is not in admitted status" });
    }

    // Require that billing was generated first (total > 0)
    const billItem = await BillItem.findOne({ where: { item_type: "admission", reference_id: id } });
    if (!billItem) {
      return res.status(400).json({
        success: false,
        message: "Generate billing first before discharging. Use 'Generate billing' to set the total bill, then collect payment.",
      });
    }
    const bill = await Bill.findByPk(billItem.bill_id);
    const totalAmount = Number(bill?.total_amount ?? 0);
    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Generate billing first before discharging. Use 'Generate billing' to set the total bill, then collect payment.",
      });
    }

    // Discharge only after the admission bill is paid
    const paid = await requirePaidByReferenceOrRespond(res, {
      item_type: "admission",
      reference_id: id,
      actionLabel: "discharging patient",
    });
    if (!paid) return;

    const dischargeDate = new Date();
    const updated = await sequelize.transaction(async (tx) => {
      const updatedAdmission = await admission.update(
        { discharge_date: dischargeDate, status: "discharged" },
        { transaction: tx }
      );
      const bed = await Bed.findByPk(admission.bed_id);
      if (bed) await bed.update({ status: "available" }, { transaction: tx });
      return updatedAdmission;
    });

    await auditLog(req, { action: "DISCHARGE_PATIENT", table_name: "Admission", record_id: id });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error discharging patient", error: error.message });
  }
};

module.exports = { listAdmissions, getAdmissionById, admitPatient, generateAdmissionBilling, dischargePatient };

