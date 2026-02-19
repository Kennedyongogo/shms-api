const express = require("express");
const bedController = require("../controllers/bedController");

const router = express.Router();

router.post("/", bedController.create);
router.get("/", bedController.getAll);
router.get("/:id", bedController.getById);
router.put("/:id", bedController.update);
router.patch("/:id/status", bedController.updateBedStatus);
router.delete("/:id", bedController.remove);

module.exports = router;

