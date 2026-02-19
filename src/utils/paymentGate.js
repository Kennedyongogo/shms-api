const { Bill, BillItem, Payment } = require("../models");

async function getBillingStatusByReference({ item_type, reference_id }) {
  if (!item_type || !reference_id) {
    return {
      ok: false,
      exists: false,
      paid: false,
      status: "unpaid",
      message: "item_type and reference_id are required",
    };
  }

  const items = await BillItem.findAll({
    where: { item_type, reference_id },
    include: [
      {
        model: Bill,
        as: "bill",
        required: true,
        include: [{ model: Payment, as: "payments", required: false }],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: 20,
  });

  if (!items.length) {
    return {
      ok: true,
      exists: false,
      paid: false,
      status: "unpaid",
      bill_id: null,
      total_amount: 0,
      paid_amount: 0,
      balance: 0,
    };
  }

  // Pick the most recent bill we can see.
  const bill = items[0].bill;
  const payments = bill?.payments || [];
  const paid_amount = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  const total_amount = Number(bill?.total_amount || 0);
  const status = bill?.status || "unpaid";
  const paid = status === "paid" || paid_amount >= total_amount;

  return {
    ok: true,
    exists: true,
    paid,
    status,
    bill_id: bill?.id || null,
    total_amount,
    paid_amount,
    balance: Math.max(0, total_amount - paid_amount),
  };
}

async function requirePaidByReferenceOrRespond(res, { item_type, reference_id, actionLabel }) {
  const s = await getBillingStatusByReference({ item_type, reference_id });
  if (!s.ok) {
    res.status(400).json({ success: false, code: "PAYMENT_LOOKUP_FAILED", message: s.message || "Payment lookup failed" });
    return false;
  }
  if (!s.paid) {
    res.status(402).json({
      success: false,
      code: "PAYMENT_REQUIRED",
      message: actionLabel ? `Payment required before ${actionLabel}` : "Payment required",
      payment: {
        item_type,
        reference_id,
        ...s,
      },
    });
    return false;
  }
  return true;
}

module.exports = { getBillingStatusByReference, requirePaidByReferenceOrRespond };

