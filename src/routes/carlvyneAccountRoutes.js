const express = require("express");
const carlvyneAccountController = require("../controllers/carlvyneAccountController");
const { uploadCarlvyneProfileImage, handleUploadError } = require("../middleware/upload");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

// Public read endpoints (for marketing / about pages)
router.get("/", carlvyneAccountController.getAll);
router.get("/:id", carlvyneAccountController.getById);

// Mutating endpoints protected by auth
router.post("/", uploadCarlvyneProfileImage, handleUploadError, authenticateUser, carlvyneAccountController.create);
router.put("/:id", authenticateUser, uploadCarlvyneProfileImage, handleUploadError, carlvyneAccountController.update);
router.delete("/:id", authenticateUser, carlvyneAccountController.remove);

module.exports = router;
