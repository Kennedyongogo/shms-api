const express = require("express");
const drugController = require("../controllers/drugController");

const router = express.Router();

router.post("/", drugController.create);
router.get("/", drugController.getAll);
router.get("/:id", drugController.getById);
router.put("/:id", drugController.update);
router.delete("/:id", drugController.remove);

module.exports = router;
