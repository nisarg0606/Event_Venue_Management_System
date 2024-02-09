// const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const { authenticator } = require("otplib");
const Schema = require("../model/user");
const qrcode = require("qrcode");
const jwt = require("jsonwebtoken");

// common for all controllers to create a user(customer, venueOwner, eventPlanner)
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const user = await Schema.findOne({ email: email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new Schema({
      username,
      email,
      password: hashedPassword,
      role,
    });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password, code } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }
    let user = await Schema.findOne({ email: email });
    if (!user) {
      user = await Schema.findOne({ username: email });
    }
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    if (user.twoFactorAuthEnabled && !code) {
      return res
        .status(202)
        .json({ message: "Two factor authentication required" });
    }
    if (user.twoFactorAuthEnabled && code) {
      const isValid = authenticator.verify({
        token: code,
        secret: user.twoFactorAuth,
      });
      if (!isValid) {
        return res.status(400).json({ message: "Invalid code" });
      }
    }
    // remove password from the user object
    user = user.toObject();
    delete user.password;
    const token = jwt.sign({ user }, process.env.JWT_SECRET, {
      // expires in 1 day
      expiresIn: "1d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    user.token = token;
    res.status(200).json({ user, message: "Logged in successfully" });
  } catch (error) {
    console.log(error);
    res.status(409).json({ message: error.message });
  }
};

// in logout use the auth middleware to verify the user
exports.logoutUser = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

exports.qrCode = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Schema.findById(verified.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.twoFactorAuthEnabled) {
      return res
        .status(400)
        .json({ message: "Two factor authentication enabled" });
    }
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(
      user.email,
      "Event Management",
      secret
    );
    const qrCode = await qrcode.toDataURL(otpauth);
    user.twoFactorAuth = secret;
    await user.save();
    res.status(200).json({ qrCode, message: "QR code generated successfully" });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

exports.enableTwoFactorAuth = async (req, res) => {
  try {
    const token = req.cookies.token;
    const { code } = req.body;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Schema.findById(verified.user._id);
    console.log(user, "user");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.twoFactorAuthEnabled) {
      return res
        .status(400)
        .json({ message: "Two factor authentication already enabled" });
    }
    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorAuth,
    });
    if (!isValid) {
      return res.status(400).json({ message: "Invalid code" });
    }
    user.twoFactorAuthEnabled = true;
    await user.save();
    res.status(200).json({ message: "Two factor authentication enabled" });
  } catch (error) {
    console.log(error);
    res.status(409).json({ message: error.message });
  }
};

exports.disableTwoFactorAuth = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Schema.findById(verified.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.twoFactorAuthEnabled) {
      return res
        .status(400)
        .json({ message: "Two factor authentication already disabled" });
    }
    user.twoFactorAuthEnabled = false;
    user.twoFactorAuth = "";
    await user.save();
    res.status(200).json({ message: "Two factor authentication disabled" });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, oldpassword, newpassword, confirmnewpassword, code } =
      req.body;
    const user = await Schema.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.twoFactorAuthEnabled && !code) {
      return res
        .status(202)
        .json({ message: "Two factor authentication required" });
    }
    if (user.twoFactorAuthEnabled && code) {
      const isValid = authenticator.verify({
        token: code,
        secret: user.twoFactorAuth,
      });
      if (!isValid) {
        return res.status(400).json({ message: "Invalid code" });
      }
    }
    const isPasswordCorrect = await bcrypt.compare(oldpassword, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    if (newpassword !== confirmnewpassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newpassword, salt);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};


// exports.forgetPassword = async (req, res) => {
  
