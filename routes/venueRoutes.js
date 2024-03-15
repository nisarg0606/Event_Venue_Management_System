const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const venueController = require("../controller/venueController");

const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({ storage: storage });



router.get("/", auth, venueController.getVenues);
router.get("/myvenues", auth, venueController.getMyVenues);
router.get("/:id", auth, venueController.getVenue);
router.get("/location/:location", auth, venueController.getVenueByLocation);
// get all my venues
router.post("/", auth, upload.array("images", 4), venueController.createVenue);
router.put("/:id", auth, upload.array("images", 4), venueController.updateVenue);
router.delete("/:id", auth, venueController.deleteVenue);

module.exports = router;