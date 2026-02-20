const express = require("express");
const { processPayment, listPayments, getPaymentById } = require("../controllers/paymentController");

const router = express.Router();

router.get("/", listPayments);
router.post("/process", processPayment);
router.get("/:id", getPaymentById);

module.exports = router;

