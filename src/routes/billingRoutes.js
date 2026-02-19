const express = require("express");
const billingController = require("../controllers/billingController");

const router = express.Router();

router.post("/generate", billingController.generateBill);
router.post("/:bill_id/items", billingController.addBillItems);
router.get("/by-reference", billingController.getByReference);

module.exports = router;

