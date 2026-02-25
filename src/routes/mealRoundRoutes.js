const express = require("express");
const roundSheetController = require("../controllers/roundSheetController");

const router = express.Router();

router.get("/pdf", roundSheetController.getMealRoundsPdf);
router.get("/", roundSheetController.getMealRounds);

module.exports = router;
