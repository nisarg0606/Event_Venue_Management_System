const venueBookingController = require("../controller/venueBookingController.js");
const express = require("express");
const auth = require("../middleware/auth.js");
const router = express.Router();

// Create a new booking
router.post("/", auth, venueBookingController.createAVenueBooking);
// Retrieve all bookings
router.get("/", auth, venueBookingController.findAllVenueBookings);
// Retrieve a single booking with booking_id
router.get("/:booking_id", auth, venueBookingController.findOne);
// Retrieve all bookings of a user
router.get("/user/:user_id", auth, venueBookingController.findByUser);
// Retrieve all bookings of a venue
router.get("/venue/:venue_id", auth, venueBookingController.findByVenue);
// Update a booking with booking_id
router.put("/:booking_id", auth, venueBookingController.update);
// Delete a booking with booking_id
router.delete("/:booking_id", auth, venueBookingController.deleteBooking);



module.exports = router;