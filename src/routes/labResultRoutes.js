const express = require("express");
const labResultController = require("../controllers/labResultController");

const router = express.Router();

router.get("/", labResultController.list);
router.post("/", labResultController.enterResults);
router.put("/", labResultController.updateResults);

module.exports = router;

