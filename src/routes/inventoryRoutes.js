const express = require("express");
const inventoryController = require("../controllers/inventoryController");

const router = express.Router();

router.post("/", inventoryController.create);
router.get("/", inventoryController.getAll);
router.get("/:id", inventoryController.getById);
router.put("/:id", inventoryController.update);
router.delete("/:id", inventoryController.remove);
router.post("/:id/add-to-pharmacy", inventoryController.addToPharmacy);
router.post("/:id/transfer-to-pharmacy", inventoryController.transferToPharmacy);

module.exports = router;

