const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const user = require("../models/user");

const auth = async (req, res, next) => {
  //get token from cookies
  const token = req.cookies.token;
  // console.log(token);
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    //verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(verified.user._id, "verified");
    if (verified.exp < Date.now().valueOf() / 1000)
      return res.status(401).json({ message: "Token expired" });
    else
      if (!verified)
        return res.status(401).json({ message: "Unauthorized" });
      
    //find user
    const foundUser = await user.findById(verified.user._id);
    if (!foundUser) return res.status(401).json({ message: "Unauthorized" });

    req.user = foundUser;
    req.token = token;
    next();
  }
  catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = auth;
