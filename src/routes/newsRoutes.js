const express = require("express");
const newsController = require("../controllers/newsController");
const {
  uploadNewsFeaturedImage,
  uploadNewsImage,
  handleUploadError,
} = require("../middleware/upload");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateUser, uploadNewsFeaturedImage, handleUploadError, newsController.create);
router.get("/", newsController.getAll);
router.get("/:id", newsController.getById);
router.put("/:id", authenticateUser, uploadNewsFeaturedImage, handleUploadError, newsController.update);
router.delete("/:id", authenticateUser, newsController.remove);

router.patch("/:id/publish", authenticateUser, newsController.publish);
router.patch("/:id/archive", authenticateUser, newsController.archive);
router.post("/:id/images", authenticateUser, uploadNewsImage, handleUploadError, newsController.addNewsImage);

module.exports = router;

