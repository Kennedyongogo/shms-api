const express = require("express");
const billingController = require("../controllers/billingController");

const router = express.Router();

router.get("/", billingController.listBills);
router.post("/generate", billingController.generateBill);
router.post("/:bill_id/items", billingController.addBillItems);
router.get("/by-reference", billingController.getByReference);
router.get("/:id", billingController.getBillById);
router.patch("/:bill_id/status", billingController.setBillStatus);

module.exports = router;
