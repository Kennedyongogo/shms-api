const express = require("express");
const { processPayment, listPayments, getPaymentById } = require("../controllers/paymentController");
const { getReceipt, getReceiptPdf } = require("../controllers/receiptController");

const router = express.Router();

router.get("/", listPayments);
router.post("/process", processPayment);
router.get("/:id/receipt/pdf", getReceiptPdf);
router.get("/:id/receipt", getReceipt);
router.get("/:id", getPaymentById);

module.exports = router;

