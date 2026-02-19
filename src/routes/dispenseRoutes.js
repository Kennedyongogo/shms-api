const express = require("express");
const dispenseController = require("../controllers/dispenseController");

const router = express.Router();

router.post("/", dispenseController.recordDispensing);
router.get("/", dispenseController.listDispenseRecords);
router.get("/:id", dispenseController.getDispenseRecordById);

module.exports = router;

