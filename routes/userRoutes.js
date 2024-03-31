const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const userController = require("../controller/userController");

// user routes for registration, login, verification, and logout
router.post("/register", userController.createUser);
router.post("/login", userController.loginUser);
router.get("/verify/:id/:token", userController.verifyEmail);
router.get("/qrcode", userController.qrCode);
router.post("/2fa", userController.enableTwoFactorAuth);
router.get("/logout", userController.logoutUser);

// password routes
router.post("/forgotpassword", userController.forgetPassword);
router.post("/resetpassword", auth, userController.resetPassword);
router.post("/resetForgotPassword", userController.verifyTokenAndResetPassword);

// user profile routes
router.get("/", auth, userController.getAllUsers);
router.get("/:id", auth, userController.getUserById);
router.get("/profile", auth, userController.getUserProfile);
router.put("/profile", auth, userController.updateUserProfile);
router.get("/similarInterests", auth, userController.getPeopleWithSimilarInterests);

module.exports = router;