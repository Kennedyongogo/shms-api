const express = require("express");
const { processPayment, listPayments } = require("../controllers/paymentController");

const router = express.Router();

router.get("/", listPayments);
router.post("/process", processPayment);

module.exports = router;

