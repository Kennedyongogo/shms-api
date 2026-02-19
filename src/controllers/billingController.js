const { Bill, BillItem, Consultation } = require("../models");
const { getBillingStatusByReference } = require("../utils/paymentGate");

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

module.exports = { generateBill, addBillItems, getByReference };
