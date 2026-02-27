const express = require("express");
const { initiateStkPush, mpesaCallback } = require("../controllers/mpesaController");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

/** Initiate STK Push (authenticated). Body: { phone, amount, bill_id } */
router.post("/pay", authenticateUser, initiateStkPush);

/** Daraja callback - no auth; Safaricom calls this */
router.post("/callback", mpesaCallback);

module.exports = router;
