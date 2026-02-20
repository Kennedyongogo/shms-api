const { Op } = require("sequelize");
const { Payment, Bill, Appointment, BillItem, Patient, User } = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");

/** When a bill becomes paid, confirm any appointment(s) it paid for. */
async function confirmAppointmentIfBillPaid(bill) {
  if (bill.status !== "paid") return;

  const appointmentIds = new Set();
  if (bill.appointment_id) appointmentIds.add(String(bill.appointment_id));

  const apptItems = await BillItem.findAll({
    where: { bill_id: bill.id, item_type: "appointment" },
    attributes: ["reference_id"],
  });
  for (const it of apptItems) {
    if (it.reference_id) appointmentIds.add(String(it.reference_id));
  }

  for (const apptId of appointmentIds) {
    const appt = await Appointment.findByPk(apptId);
    if (appt && appt.status === "pending") {
      await appt.update({ status: "confirmed" });
    }
  }
}

const processPayment = async (req, res) => {
  try {
    const { bill_id, amount_paid, payment_method, payment_date } = req.body;
    if (!bill_id || !payment_method) {
      return res.status(400).json({ success: false, message: "bill_id and payment_method are required" });
    }

    const bill = await Bill.findByPk(bill_id);
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });

    const payment = await Payment.create({
      bill_id,
      amount_paid: amount_paid ?? 0,
      payment_method,
      payment_date: payment_date ?? new Date(),
    });

    const payments = await Payment.findAll({ where: { bill_id } });
    const paid = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

    let status = "unpaid";
    if (paid <= 0) status = "unpaid";
    else if (paid < Number(bill.total_amount || 0)) status = "partial";
    else status = "paid";

    await bill.update({ status });
    await confirmAppointmentIfBillPaid(await bill.reload());
    return res.status(201).json({ success: true, data: { payment, bill } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error processing payment", error: error.message });
  }
};

const listPayments = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, bill_id, payment_method, from, to } = req.query;

    const where = {};
    if (bill_id) where.bill_id = bill_id;
    if (payment_method) where.payment_method = payment_method;
    if (from || to) {
      where.payment_date = {};
      if (from) where.payment_date[Op.gte] = new Date(from);
      if (to) where.payment_date[Op.lte] = new Date(to);
    }

    const uuidLike = typeof search === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search.trim());
    if (uuidLike && !where.bill_id) {
      where.bill_id = search.trim();
    }

    const patientWhere = search && !uuidLike
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
        model: Bill,
        as: "bill",
        required: true,
        include: [
          {
            model: Patient,
            as: "patient",
            required: true,
            where: patientWhere,
            attributes: { exclude: ["password"] },
            include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
          },
        ],
      },
    ];

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [["payment_date", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error listing payments", error: error.message });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Bill,
          as: "bill",
          required: true,
          include: [
            {
              model: Patient,
              as: "patient",
              required: true,
              attributes: { exclude: ["password"] },
              include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
            },
          ],
        },
      ],
    });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    return res.status(200).json({ success: true, data: payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching payment", error: error.message });
  }
};

module.exports = { processPayment, confirmAppointmentIfBillPaid, listPayments, getPaymentById };

