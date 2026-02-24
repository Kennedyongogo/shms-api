const express = require("express");
const statisticsController = require("../controllers/statisticsController");

const router = express.Router();

router.get("/", statisticsController.getAll);
router.get("/appointments/chart", statisticsController.getAppointmentsChart);
router.get("/revenue/chart", statisticsController.getRevenueChart);

module.exports = router;
