const express = require("express");
const statisticsController = require("../controllers/statisticsController");

const router = express.Router();

router.get("/", statisticsController.getAll);
router.get("/appointments/chart", statisticsController.getAppointmentsChart);
router.get("/revenue/chart", statisticsController.getRevenueChart);
router.get("/pharmacy/chart", statisticsController.getPharmacyChart);
router.get("/admissions/chart", statisticsController.getAdmissionsChart);

module.exports = router;
