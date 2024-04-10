const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const userController = require("../controller/userController");

// user routes for registration, login, verification, and logout
router.post("/register", userController.createUser);
router.post("/login", userController.loginUser);
router.get("/verify/:id/:token", userController.verifyEmail);
router.get("/qrcode", auth, userController.qrCode);
router.post("/2fa", auth, userController.enableTwoFactorAuth);
router.get("/logout", userController.logoutUser);

//get 2fa status
router.get("/2faStatus", userController.getUser2FAStatus);

//get user by username or email
router.get("/search", auth, userController.getUserByEmailOrUsername);

// password routes
router.post("/forgotpassword", userController.forgetPassword);
router.post("/resetpassword", auth, userController.resetPassword);
router.post("/resetForgotPassword", userController.verifyTokenAndResetPassword);

// user profile routes
router.get("/", auth, userController.getAllUsers);
router.get("/profile", auth, userController.getUserProfile);
router.put("/profile", auth, userController.updateUserProfile);
router.get(
  "/similarInterests",
  auth,
  userController.getPeopleWithSimilarInterests
);
router.get("/:id", auth, userController.getUserById);

module.exports = router;
