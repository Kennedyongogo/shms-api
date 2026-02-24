const express = require("express");
const medicalReportController = require("../controllers/medicalReportController");

const router = express.Router();

router.post("/", medicalReportController.create);
router.get("/", medicalReportController.list);
router.get("/:id/pdf", medicalReportController.getPdf);
router.get("/:id", medicalReportController.getById);

module.exports = router;
