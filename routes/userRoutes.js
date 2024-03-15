const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const userController = require("../controller/userController");

router.post("/register", userController.createUser);
router.post("/login", userController.loginUser);
router.get("/verify/:id/:token", userController.verifyEmail);
router.get("/qrcode", userController.qrCode);
router.post("/2fa", userController.enableTwoFactorAuth);
router.get("/logout", userController.logoutUser);

module.exports = router;