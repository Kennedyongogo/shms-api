const express = require("express");
const admissionController = require("../controllers/admissionController");

const router = express.Router();

router.post("/admit", admissionController.admitPatient);
router.patch("/:id/discharge", admissionController.dischargePatient);

module.exports = router;

