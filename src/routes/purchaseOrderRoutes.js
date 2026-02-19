const express = require("express");
const purchaseOrderController = require("../controllers/purchaseOrderController");

const router = express.Router();

router.post("/", purchaseOrderController.create);
router.get("/", purchaseOrderController.getAll);
router.get("/:id", purchaseOrderController.getById);
router.put("/:id", purchaseOrderController.update);
router.delete("/:id", purchaseOrderController.remove);

module.exports = router;

