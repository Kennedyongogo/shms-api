const { Op } = require("sequelize");
const { Bill, BillItem, Consultation, Payment, Patient, User, Appointment, Service } = require("../models");
const { getBillingStatusByReference } = require("../utils/paymentGate");
const { confirmAppointmentIfBillPaid } = require("./paymentController");
const { parsePagination } = require("../utils/crudControllerFactory");

const generateBill = async (req, res) => {
  try {
    const { patient_id, consultation_id } = req.body;
    if (!patient_id)
      return res
        .status(400)
        .json({ success: false, message: "patient_id is required" });

    if (consultation_id) {
      const consult = await Consultation.findByPk(consultation_id);
      if (!consult)
        return res
          .status(404)
          .json({ success: false, message: "Consultation not found" });
    }

    const bill = await Bill.create({
      patient_id,
      consultation_id: consultation_id ?? null,
      total_amount: 0,
      status: "unpaid",
    });
    return res.status(201).json({ success: true, data: bill });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error generating bill",
        error: error.message,
      });
  }
};

const addBillItems = async (req, res) => {
  try {
    const { bill_id } = req.params;
    const { items } = req.body; // [{item_type, reference_id, amount}]
    if (!Array.isArray(items) || !items.length) {
      return res
        .status(400)
        .json({ success: false, message: "items array is required" });
    }

    const bill = await Bill.findByPk(bill_id);
    if (!bill)
      return res
        .status(404)
        .json({ success: false, message: "Bill not found" });

    const rows = items.map((i) => ({
      bill_id,
      item_type: i.item_type,
      reference_id: i.reference_id ?? null,
      amount: i.amount ?? 0,
    }));
    await BillItem.bulkCreate(rows);

    const allItems = await BillItem.findAll({ where: { bill_id } });
    const total = allItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    await bill.update({ total_amount: total });

    return res
      .status(200)
      .json({ success: true, data: { bill, items: allItems } });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error adding bill items",
        error: error.message,
      });
  }
};

const getByReference = async (req, res) => {
  try {
    const { item_type, reference_id } = req.query;
    const status = await getBillingStatusByReference({
      item_type,
      reference_id,
    });
    if (!status.ok) {
      return res
        .status(400)
        .json({ success: false, message: status.message || "Invalid request" });
    }
    return res.status(200).json({ success: true, data: status });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error fetching billing status",
        error: error.message,
      });
  }
};

/** Set bill status (e.g. "paid" for testing when payment is not integrated). When status becomes paid, linked appointment is set to confirmed. */
const setBillStatus = async (req, res) => {
  try {
    const { bill_id } = req.params;
    const { status } = req.body;
    const allowed = new Set(["unpaid", "partial", "paid", "cancelled"]);
    if (!status || !allowed.has(status)) {
      return res.status(400).json({
        success: false,
        message: 'status must be one of: "unpaid", "partial", "paid", "cancelled"',
      });
    }

    const bill = await Bill.findByPk(bill_id);
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    await bill.update({ status });
    await confirmAppointmentIfBillPaid(await bill.reload());
    return res.status(200).json({ success: true, data: bill });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error updating bill status",
        error: error.message,
      });
  }
};

const listBills = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, status, patient_id, appointment_id, consultation_id } = req.query;

    const where = {};
    if (status) where.status = status;
    if (patient_id) where.patient_id = patient_id;
    if (appointment_id) where.appointment_id = appointment_id;
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

    const include = [
      {
        model: Patient,
        as: "patient",
        required: true,
        where: patientWhere,
        attributes: { exclude: ["password"] },
        include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
      },
      { model: Appointment, as: "appointment", required: false, include: [{ model: Service, as: "service", required: false }] },
      { model: Consultation, as: "consultation", required: false },
      { model: Payment, as: "payments", required: false },
    ];

    const { count, rows } = await Bill.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    const data = rows.map((b) => {
      const payments = b.payments || [];
      const paid_amount = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      const total_amount = Number(b.total_amount || 0);
      const paid = b.status === "paid" || (total_amount > 0 && paid_amount >= total_amount);
      return {
        ...b.toJSON(),
        paid_amount,
        balance: Math.max(0, total_amount - paid_amount),
        paid,
      };
    });

    return res.status(200).json({
      success: true,
      data,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error listing bills",
      error: error.message,
    });
  }
};

const getBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findByPk(id, {
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: { exclude: ["password"] },
          include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
        },
        { model: Appointment, as: "appointment", required: false, include: [{ model: Service, as: "service", required: false }] },
        { model: Consultation, as: "consultation", required: false },
        { model: BillItem, as: "items", required: false },
        { model: Payment, as: "payments", required: false },
      ],
      order: [["createdAt", "DESC"]],
    });
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });

    const payments = bill.payments || [];
    const paid_amount = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const total_amount = Number(bill.total_amount || 0);
    const paid = bill.status === "paid" || (total_amount > 0 && paid_amount >= total_amount);

    return res.status(200).json({
      success: true,
      data: {
        ...bill.toJSON(),
        paid_amount,
        balance: Math.max(0, total_amount - paid_amount),
        paid,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching bill", error: error.message });
  }
};

module.exports = { generateBill, addBillItems, getByReference, setBillStatus, listBills, getBillById };
