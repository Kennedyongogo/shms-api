const express = require("express");
const labTestController = require("../controllers/labTestController");

const router = express.Router();

router.post("/", labTestController.create);
router.get("/", labTestController.getAll);
router.get("/by-name", labTestController.getByName);
router.get("/:id", labTestController.getById);
router.put("/:id", labTestController.update);
router.delete("/:id", labTestController.remove);

module.exports = router;

