const express = require("express");
const insuranceController = require("../controllers/insuranceController");

const router = express.Router();

router.post("/", insuranceController.create);
router.get("/", insuranceController.getAll);
router.get("/:id", insuranceController.getById);
router.put("/:id", insuranceController.update);
router.patch("/:id/status", insuranceController.updateClaimStatus);
router.delete("/:id", insuranceController.remove);

module.exports = router;

