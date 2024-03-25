const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const venueController = require("../controller/venueController");

const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({ storage: storage });



router.get("/", venueController.getVenues);
router.get("/myvenues", auth, venueController.getMyVenues);
router.get("/:id", venueController.getVenue);
router.get("/location/:location", venueController.getVenueByLocation);
router.post("/", auth, upload.array("images", 4), venueController.createVenue);
router.put("/:id", auth, upload.array("images", 4), venueController.updateVenue);
router.delete("/:id", auth, venueController.deleteVenue);

module.exports = router;