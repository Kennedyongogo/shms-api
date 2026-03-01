const { Op } = require("sequelize");
const {
  Appointment,
  Admission,
  Bed,
  Consultation,
  NursingNote,
  Patient,
  Staff,
  User,
  Service,
  LabOrder,
  LabOrderItem,
  LabResult,
  Bill,
  BillItem,
  Payment,
  VitalSigns,
  Prescription,
  PrescriptionItem,
  DispenseRecord,
  MedicalReport,
  sequelize,
} = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");
const { requirePaidByReferenceOrRespond } = require("../utils/paymentGate");
const { auditLog } = require("../utils/auditLog");
const { getHospitalId } = require("../utils/hospitalScope");

const bookAppointment = async (req, res) => {
  try {
    const { patient_id, doctor_id, service_id, appointment_date, created_by, is_walk_in, bill_amount } =
      req.body;
    if (!patient_id || !doctor_id || !appointment_date) {
      return res.status(400).json({
        success: false,
        message: "patient_id, doctor_id, appointment_date are required",
      });
    }

    const billAmountProvided =
      bill_amount !== undefined && bill_amount !== null && String(bill_amount).trim() !== "";
    const billAmountNumber = billAmountProvided ? Number(bill_amount) : null;
    if (billAmountProvided && (!Number.isFinite(billAmountNumber) || billAmountNumber < 0)) {
      return res.status(400).json({
        success: false,
        message: "bill_amount must be a valid number >= 0",
      });
    }

    const hid = getHospitalId(req);
    if (hid != null) {
      const [patient, doctor] = await Promise.all([
        Patient.findByPk(patient_id, { attributes: ["id", "hospital_id"] }),
        Staff.findByPk(doctor_id, { attributes: ["id", "hospital_id"] }),
      ]);
      if (!patient || patient.hospital_id !== hid)
        return res.status(403).json({ success: false, message: "Patient does not belong to your hospital." });
      if (!doctor || doctor.hospital_id !== hid)
        return res.status(403).json({ success: false, message: "Doctor does not belong to your hospital." });
    }

    const appt = await Appointment.create({
      patient_id,
      doctor_id,
      service_id: service_id ?? null,
      appointment_date,
      status: "pending",
      created_by: created_by ?? null,
      is_walk_in: !!is_walk_in,
      bill_amount: billAmountNumber,
    });

    // Walk-in + pending: auto-create unpaid billing record (appointment-linked bill)
    if (appt.is_walk_in && appt.status === "pending") {
      const service = service_id
        ? await Service.findByPk(service_id, { attributes: ["id", "price"] })
        : null;
      const amount = billAmountProvided
        ? billAmountNumber
        : Number(service?.price ?? 0);

      const bill = await Bill.create({
        patient_id: appt.patient_id,
        consultation_id: null,
        appointment_id: appt.id,
        total_amount: amount,
        status: "unpaid",
      });

      await BillItem.create({
        bill_id: bill.id,
        item_type: "appointment",
        reference_id: appt.id,
        amount,
      });
    }

    await auditLog(req, { action: "BOOK_APPOINTMENT", table_name: "Appointment", record_id: appt?.id });
    return res.status(201).json({ success: true, data: appt });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error booking appointment",
        error: error.message,
      });
  }
};

const updateStatus = async (req, res, status) => {
  const { id } = req.params;
  const appt = await Appointment.findByPk(id, {
    include: [{ model: Patient, as: "patient", attributes: ["hospital_id"] }],
  });
  if (!appt)
    return res
      .status(404)
      .json({ success: false, message: "Appointment not found" });
  if (!ensureAppointmentBelongsToHospital(appt, req))
    return res.status(404).json({ success: false, message: "Appointment not found" });

  if (status === "confirmed" || status === "completed") {
    const ok = await requirePaidByReferenceOrRespond(res, {
      item_type: "appointment",
      reference_id: id,
      actionLabel: `setting appointment status to "${status}"`,
    });
    if (!ok) return;
  }

  const updated = await appt.update({ status });
  await auditLog(req, { action: "UPDATE_APPOINTMENT_STATUS", table_name: "Appointment", record_id: id });
  return res.status(200).json({ success: true, data: updated });
};

const confirm = async (req, res) => {
  try {
    return await updateStatus(req, res, "confirmed");
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error confirming appointment",
        error: error.message,
      });
  }
};

const cancel = async (req, res) => {
  try {
    return await updateStatus(req, res, "cancelled");
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error cancelling appointment",
        error: error.message,
      });
  }
};

const setStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = new Set(["pending", "confirmed", "completed", "cancelled"]);
    if (!status || !allowed.has(status)) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'status must be one of: "pending", "confirmed", "completed", "cancelled"',
        });
    }

    const appt = await Appointment.findByPk(id, {
      include: [{ model: Patient, as: "patient", attributes: ["hospital_id"] }],
    });
    if (!appt)
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    if (!ensureAppointmentBelongsToHospital(appt, req))
      return res.status(404).json({ success: false, message: "Appointment not found" });

    const current = appt.status;
    if (current === "completed" || current === "cancelled") {
      return res
        .status(400)
        .json({
          success: false,
          message: `Cannot change status from ${current}`,
        });
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
      return res
        .status(400)
        .json({
          success: false,
          message: `Invalid status transition: ${current} → ${status}`,
        });
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
            include: [
              {
                model: LabOrderItem,
                as: "items",
                required: false,
                include: [{ model: LabResult, as: "result", required: false }],
              },
            ],
          },
        ],
      });

      const labOrders = consultation?.labOrders || [];
      const hasPendingOrders = labOrders.some(
        (o) => o.status !== "completed" && o.status !== "cancelled",
      );
      const hasMissingResults = labOrders
        .filter((o) => o.status !== "cancelled")
        .some((o) => (o.items || []).some((it) => !it.result));

      if (hasPendingOrders || hasMissingResults) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot mark appointment as completed while lab tests are pending. Complete/cancel lab orders and enter results first.",
        });
      }
    }

    const updated = await appt.update({ status });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error updating appointment status",
        error: error.message,
      });
  }
};

const listByDoctor = async (req, res) => {
  try {
    const { doctor_id } = req.params;
    const hid = getHospitalId(req);
    if (hid != null) {
      const doctor = await Staff.findByPk(doctor_id, { attributes: ["id", "hospital_id"] });
      if (!doctor || doctor.hospital_id !== hid)
        return res.status(200).json({ success: true, data: [], pagination: { total: 0, page: 1, limit: parseInt(req.query.limit, 10) || 10, totalPages: 0 } });
    }
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
        message: "Error listing appointments",
        error: error.message,
      });
  }
};

const listByPatient = async (req, res) => {
  try {
    const { patient_id } = req.params;
    const hid = getHospitalId(req);
    if (hid != null) {
      const patient = await Patient.findByPk(patient_id, { attributes: ["id", "hospital_id"] });
      if (!patient || patient.hospital_id !== hid)
        return res.status(200).json({ success: true, data: [], pagination: { total: 0, page: 1, limit: parseInt(req.query.limit, 10) || 10, totalPages: 0 } });
    }
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
        message: "Error listing appointments",
        error: error.message,
      });
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
      : {};
    if (req.user?.hospital_id) patientWhere.hospital_id = req.user.hospital_id;

    const include = [
      {
        model: Patient,
        as: "patient",
        required: true,
        where: Object.keys(patientWhere).length ? patientWhere : undefined,
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
        model: Service,
        as: "service",
        attributes: ["id", "name", "price", "status"],
        required: false,
      },
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
        message: "Error listing appointments",
        error: error.message,
      });
  }
};

const ensureAppointmentBelongsToHospital = (appointment, req) => {
  if (!req.user?.hospital_id) return true;
  const patientHospitalId = appointment?.patient?.hospital_id ?? appointment?.Patient?.hospital_id;
  const doctorHospitalId = appointment?.doctor?.hospital_id ?? appointment?.Doctor?.hospital_id;
  return patientHospitalId === req.user.hospital_id || doctorHospitalId === req.user.hospital_id;
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
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "email", "phone"],
            },
          ],
        },
        {
          model: Service,
          as: "service",
          attributes: ["id", "name", "price", "status"],
          required: false,
        },
        {
          model: Staff,
          as: "doctor",
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
      ],
    });
    if (!appointment)
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    if (!ensureAppointmentBelongsToHospital(appointment, req))
      return res.status(404).json({ success: false, message: "Appointment not found" });
    return res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error fetching appointment",
        error: error.message,
      });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findByPk(id, {
      include: [
        { model: Patient, as: "patient", attributes: ["hospital_id"] },
        { model: Staff, as: "doctor", attributes: ["hospital_id"] },
      ],
    });
    if (!appt)
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    if (!ensureAppointmentBelongsToHospital(appt, req))
      return res.status(403).json({ success: false, message: "Access denied" });

    const appointmentId = appt.id;
    const deleted = {
      consultation: false,
      appointmentBills: 0,
      admissionsDeleted: 0,
    };

    await sequelize.transaction(async (t) => {
      const tx = { transaction: t };

      // Delete admissions linked to this appointment (nursing notes, admission bills, free bed, then admission).
      const admissions = await Admission.findAll({
        where: { appointment_id: appointmentId },
        ...tx,
      });
      for (const admission of admissions) {
        await NursingNote.destroy({
          where: { admission_id: admission.id },
          ...tx,
        });
        const admissionBillItem = await BillItem.findOne({
          where: { item_type: "admission", reference_id: admission.id },
          ...tx,
        });
        if (admissionBillItem) {
          const billId = admissionBillItem.bill_id;
          await Payment.destroy({ where: { bill_id: billId }, ...tx });
          await BillItem.destroy({ where: { bill_id: billId }, ...tx });
          await Bill.destroy({ where: { id: billId }, ...tx });
        }
        const bed = await Bed.findByPk(admission.bed_id, tx);
        if (bed) await bed.update({ status: "available" }, tx);
        await admission.destroy(tx);
      }
      deleted.admissionsDeleted = admissions.length;

      // Find and delete consultation (and all its related records) for this appointment.
      const consultation = await Consultation.findOne({
        where: { appointment_id: appointmentId },
        ...tx,
      });

      if (consultation) {
        const consultationId = consultation.id;

        await VitalSigns.destroy({
          where: { consultation_id: consultationId },
          ...tx,
        });

        const labOrders = await LabOrder.findAll({
          where: { consultation_id: consultationId },
          include: [{ model: LabOrderItem, as: "items", required: false }],
          ...tx,
        });
        for (const order of labOrders) {
          const items = order.items || [];
          for (const item of items) {
            await LabResult.destroy({
              where: { lab_order_item_id: item.id },
              ...tx,
            });
            await item.destroy(tx);
          }
          await order.destroy(tx);
        }

        const prescriptions = await Prescription.findAll({
          where: { consultation_id: consultationId },
          ...tx,
        });
        for (const rx of prescriptions) {
          await DispenseRecord.destroy({
            where: { prescription_id: rx.id },
            ...tx,
          });
          await PrescriptionItem.destroy({
            where: { prescription_id: rx.id },
            ...tx,
          });
          await rx.destroy(tx);
        }

        await MedicalReport.destroy({
          where: { consultation_id: consultationId },
          ...tx,
        });

        // Unlink bills from consultation so we can delete the consultation row.
        await Bill.update(
          { consultation_id: null },
          { where: { consultation_id: consultationId }, ...tx }
        );
        await consultation.destroy(tx);
        deleted.consultation = true;
      }

      // Delete appointment-linked bills (payments, items, then bill).
      const appointmentBills = await Bill.findAll({
        where: { appointment_id: appointmentId },
        ...tx,
      });
      for (const bill of appointmentBills) {
        await Payment.destroy({ where: { bill_id: bill.id }, ...tx });
        await BillItem.destroy({ where: { bill_id: bill.id }, ...tx });
        await bill.destroy(tx);
      }
      deleted.appointmentBills = appointmentBills.length;

      await appt.destroy(tx);
    });

    await auditLog(req, { action: "CANCEL_APPOINTMENT", table_name: "Appointment", record_id: appointmentId });
    return res
      .status(200)
      .json({ success: true, message: "Appointment deleted", deleted });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error deleting appointment",
        error: error.message,
      });
  }
};

module.exports = {
  bookAppointment,
  confirm,
  cancel,
  setStatus,
  listByDoctor,
  listByPatient,
  listAll,
  getById,
  remove,
};
