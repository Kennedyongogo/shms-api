const express = require("express");
const { recordVitals } = require("../controllers/vitalSignsController");

const router = express.Router();

router.post("/record", recordVitals);

module.exports = router;

