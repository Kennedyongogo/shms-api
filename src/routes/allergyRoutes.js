const express = require("express");
const allergyController = require("../controllers/allergyController");

const router = express.Router();

router.post("/", allergyController.create);
router.get("/", allergyController.getAll);
router.get("/:id", allergyController.getById);
router.put("/:id", allergyController.update);
router.delete("/:id", allergyController.remove);

module.exports = router;

