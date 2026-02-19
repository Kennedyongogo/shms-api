const { Payment, Bill } = require("../models");

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
    return res.status(201).json({ success: true, data: { payment, bill } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error processing payment", error: error.message });
  }
};

module.exports = { processPayment };

