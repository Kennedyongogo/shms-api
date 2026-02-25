const express = require("express");
const dietTypeController = require("../controllers/dietTypeController");

const router = express.Router();

router.get("/", dietTypeController.getAll);
router.get("/:id", dietTypeController.getById);
router.post("/", dietTypeController.create);
router.put("/:id", dietTypeController.update);
router.delete("/:id", dietTypeController.remove);

module.exports = router;
