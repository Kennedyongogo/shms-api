const express = require("express");
const { authenticateUser } = require("../middleware/auth");
const { uploadUserProfileImage, uploadHospitalLogo, handleUploadError } = require("../middleware/upload");
const { login, logout, register, registerOrganization, resetPassword, bootstrapPromoteMe, me, changePassword, updateMe, updateMyProfileImage } = require("../controllers/authController");
const {
  initializeRegistrationPayment,
  verifyRegistrationPayment,
  completeOrganizationSubscription,
} = require("../controllers/registrationPaymentController");

const router = express.Router();

router.post("/register", register);
router.post("/payment/initialize-registration", initializeRegistrationPayment);
router.post("/payment/complete-subscription", completeOrganizationSubscription);
router.get("/payment/verify-registration/:reference", verifyRegistrationPayment);
router.post("/register-organization", uploadHospitalLogo, handleUploadError, registerOrganization);
router.post("/login", login);
router.post("/logout", logout);
router.post("/reset-password", resetPassword);
router.get("/me", authenticateUser, me);
router.patch("/me", authenticateUser, updateMe);
router.put("/me/profile-image", authenticateUser, uploadUserProfileImage, handleUploadError, updateMyProfileImage);
router.post("/change-password", authenticateUser, changePassword);
router.post("/bootstrap/promote-me", authenticateUser, bootstrapPromoteMe);

module.exports = router;

