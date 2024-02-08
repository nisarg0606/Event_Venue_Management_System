const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv").config({ path: ".env" });
const path = require("path");
const ejs = require("ejs");

const app = express();
// Set the view engine to EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const PORT = process.env.PORT || 5000;

// Middleware
const router = express.Router();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

// DB Config
const db = process.env.MONGO_URI;
mongoose
  .connect(db)
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

// Routes




app.get("/", (req, res) => {
    res.send("Hello World");
    });


app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
