const express = require("express");
const labResultController = require("../controllers/labResultController");
const { getLabResultReceiptPdf } = require("../controllers/labResultReceiptController");

const router = express.Router();

router.get("/", labResultController.list);
router.get("/:id", labResultController.getById);
router.get("/:id/receipt/pdf", getLabResultReceiptPdf);
router.post("/", labResultController.enterResults);
router.put("/", labResultController.updateResults);

module.exports = router;

