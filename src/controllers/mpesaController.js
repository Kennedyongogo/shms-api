const { Payment, Bill, sequelize } = require("../models");
const { confirmAppointmentIfBillPaid } = require("./paymentController");
const { stkPush, getBillIdByCheckoutRequestId } = require("../services/mpesaService");

/**
 * Initiate M-Pesa STK Push for a bill.
 * Body: { phone, amount, bill_id } (bill_id can be UUID; phone can be 254... or 07...)
 */
const initiateStkPush = async (req, res) => {
  try {
    const { phone, amount, bill_id } = req.body;

    if (!phone || amount == null || !bill_id) {
      return res.status(400).json({
        success: false,
        error: "phone, amount, and bill_id are required",
      });
    }

    const bill = await Bill.findByPk(bill_id);
    if (!bill) {
      return res.status(404).json({ success: false, error: "Bill not found" });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: "amount must be a positive number" });
    }

    // Format phone: 07... -> 2547...
    const formattedPhone = String(phone).startsWith("0")
      ? "254" + String(phone).slice(1)
      : String(phone).replace(/^\+/, "");

    const response = await stkPush(formattedPhone, numAmount, bill_id);

    return res.json({
      success: true,
      message: "STK Push sent to phone",
      data: {
        MerchantRequestID: response.MerchantRequestID,
        CheckoutRequestID: response.CheckoutRequestID,
        ResponseCode: response.ResponseCode,
        ResponseDescription: response.ResponseDescription,
        CustomerMessage: response.CustomerMessage,
      },
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.errorMessage || error.response?.data?.ResponseDescription || error.message;
    return res.status(status).json({
      success: false,
      error: message,
    });
  }
};

/**
 * M-Pesa Daraja callback (no auth). Safaricom sends result of STK Push here.
 * Must respond with { ResultCode: 0, ResultDesc: "Success" } so they don't retry.
 */
const mpesaCallback = async (req, res) => {
  try {
    console.log("📞 M-Pesa callback received:", JSON.stringify(req.body, null, 2));

    const body = req.body?.Body ?? req.body;
    const stkCallback = body?.stkCallback;
    if (!stkCallback) {
      console.warn("⚠️ M-Pesa callback: missing Body.stkCallback");
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    }

    const resultCode = Number(stkCallback.ResultCode);
    if (resultCode !== 0) {
      console.log("❌ M-Pesa payment failed:", stkCallback.ResultDesc);
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    }

    const metadata = stkCallback.CallbackMetadata?.Item ?? [];
    const getItem = (name) => metadata.find((i) => i.Name === name)?.Value;

    const amount = getItem("Amount");
    const mpesaReceiptNumber = getItem("MpesaReceiptNumber");
    const phone = getItem("PhoneNumber");

    // Resolve bill_id from CheckoutRequestID (we store it when initiating STK push)
    let billId = getBillIdByCheckoutRequestId(stkCallback.CheckoutRequestID);
    if (!billId) {
      const accountRef = getItem("AccountReference") || body.AccountReference || "";
      billId = accountRef.startsWith("BILL-") ? accountRef.slice(5).trim() : accountRef || null;
    }
    if (!billId) {
      console.warn("⚠️ M-Pesa callback: could not determine bill_id (CheckoutRequestID or AccountReference)");
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    }

    const bill = await Bill.findByPk(billId);
    if (!bill) {
      console.warn("⚠️ M-Pesa callback: bill not found:", billId);
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    }

    const payment = await Payment.create({
      bill_id: billId,
      amount_paid: amount ?? 0,
      payment_method: "mpesa",
      payment_date: new Date(),
      mpesa_receipt_number: mpesaReceiptNumber || null,
    });

    // Generate receipt number: REC-YYYYMMDD-NNNN
    const createdAt = payment.createdAt || new Date();
    const createdAtDateStr = createdAt.toISOString().slice(0, 10);
    const sameDayCount = await Payment.count({
      where: sequelize.where(
        sequelize.fn("DATE", sequelize.col("createdAt")),
        createdAtDateStr
      ),
    });
    const dateStr = createdAtDateStr.replace(/-/g, "");
    const receiptNumber = `REC-${dateStr}-${String(sameDayCount).padStart(4, "0")}`;
    await payment.update({ receipt_number: receiptNumber });

    const payments = await Payment.findAll({ where: { bill_id: billId } });
    const paid = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const total = Number(bill.total_amount || 0);
    let status = "unpaid";
    if (paid <= 0) status = "unpaid";
    else if (paid < total) status = "partial";
    else status = "paid";

    await bill.update({ status });
    await confirmAppointmentIfBillPaid(await bill.reload());

    console.log("💰 M-Pesa payment recorded:", {
      paymentId: payment.id,
      billId,
      amount,
      mpesaReceiptNumber,
      phone,
      status,
    });

    return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (error) {
    console.error("❌ M-Pesa callback error:", error);
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
  }
};

module.exports = { initiateStkPush, mpesaCallback };
