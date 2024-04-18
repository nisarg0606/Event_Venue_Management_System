const express = require("express");
const router = express.Router();
const venueModel = require("../models/venue.js");
const VenueBookingModel = require("../models/venueBooking.js");
const { parse, isAfter, isBefore, format, parseISO } = require("date-fns");
const { enUS } = require("date-fns/locale");
const venue = require("../models/venue.js");
const venueBooking = require("../models/venueBooking.js");
const { date } = require("joi");

exports.createAVenueBooking = async (req, res) => {
  try {
    const { venue_id } = req.params;
    let { date, timeSlot } = req.body;

    console.log(req.body);

    // if type slot is not an array, make it an array
    if (!Array.isArray(timeSlot)) {
      timeSlot = [timeSlot];
    }
    // Check if the venue exists
    const venue = await venueModel.findById(venue_id);
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    // Check if the date is valid
    let bookingDate = parse(date, "yyyy-MM-dd", new Date());
    if (isNaN(bookingDate)) {
      return res.status(400).json({ message: "Invalid date" });
    }

    // timeslot will be array os strings in format "HH:MM - HH:MM"
    // Check if the time slot is valid
    for (let i = 0; i < timeSlot.length; i++) {
      const [from, to] = timeSlot[i].split(" - ");
      if (!from || !to) {
        return res.status(400).json({ message: "Invalid time slot" });
      }
      timeSlot[i] = { from, to };
    }
    // Check if the time slot is available
    for (let i = 0; i < timeSlot.length; i++) {
      const existingBooking = await VenueBookingModel.findOne({
        venue: venue_id,
        booking_date: bookingDate,
        booking_time_slot: timeSlot[i],
      });
      if (existingBooking) {
        return res
          .status(409)
          .json({ message: "Slot already booked", timeSlot: timeSlot[i] });
      }
    }
    // Create a new booking
    for (let i = 0; i < timeSlot.length; i++) {
      const newBooking = new VenueBookingModel({
        venue: venue_id,
        user: req.user._id,
        booking_date: bookingDate,
        booking_time_slot: timeSlot[i],
      });
      await newBooking.save();
    }
    return res.status(201).json({ message: "Booking successful" });
  } catch (error) {
    console.error("Error booking slot:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Retrieve all bookings
exports.findAllVenueBookings = async (req, res) => {
  try {
    let past = [],
      upcoming = [];
    let allVenueBookings = await VenueBookingModel.find();
    allVenueBookings.forEach((booking) => {
      if (booking.booking_date < new Date()) {
        past.push(booking);
      }
      if (booking.booking_date > new Date()) {
        upcoming.push(booking);
      }
    });
    res.status(200).send({ past, upcoming });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving bookings.",
    });
  }
};

// Retrieve all bookings for a specific venue
exports.findByVenue = async (req, res) => {
  try {
    let past = [],
      upcoming = [];
    let venueBooking = await VenueBookingModel.find({
      venue: req.params.venue_id,
    }).populate("user", "firstName lastName username email");
    if (!venueBooking)
      return res
        .status(404)
        .send({ message: "No bookings found for this venue" });
    venueBooking.forEach((booking) => {
      if (booking.booking_date < new Date()) {
        past.push(booking);
      }
      if (booking.booking_date > new Date()) {
        upcoming.push(booking);
      }
    });
    res.status(200).send({ past, upcoming });
  } catch (error) {
    res.status(500).send({
      message:
        error.message || "Some error occurred while retrieving bookings.",
    });
  }
};

// Retrieve all bookings for a specific user
exports.findByUser = (req, res) => {
  let past = [],
    upcoming = [];
  VenueBookingModel.find(req.params.user_id, (err, data) => {
    if (err)
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving bookings.",
      });
    else {
      data.forEach((booking) => {
        if (booking.booking_date < new Date()) {
          past.push(booking);
        } else {
          upcoming.push(booking);
        }
      });
      res.send({ past, upcoming });
    }
  });
};

// Retrieve a single booking with a booking_id
exports.findOne = (req, res) => {
  VenueBookingModel.findById(req.params.booking_id, (err, data) => {
    if (err) {
      if (err.kind === "not_found") {
        res.status(404).send({
          message: `Not found booking with id ${req.params.booking_id}.`,
        });
      } else {
        res.status(500).send({
          message: "Error retrieving booking with id " + req.params.booking_id,
        });
      }
    } else res.send(data);
  });
};

// Update a booking identified by the booking_id in the request
// booking cannot be changed if the date and time slot is already taken by another user or if the booking date is just 48 hours away or less or if the booking date is in the past
exports.update = (req, res) => {
  if (!req.body) {
    res.status(400).send({
      message: "Content can not be empty!",
    });
  }
  // Check if the booking date and time slot is available
  if (
    checkAvailability(
      req.body.venue_id,
      req.body.booking_date,
      req.body.booking_time_slot
    )
  ) {
    // check if the booking date is in the past or less than 48 hours away
    if (
      req.body.booking_date < new Date() ||
      req.body.booking_date < new Date().setDate(new Date().getDate() + 2)
    ) {
      res.status(400).send({
        message: "Booking date is in the past or less than 48 hours away",
      });
    } else {
      VenueBookingModel.updateById(
        req.params.booking_id,
        new VenueBookingModel(req.body),
        (err, data) => {
          if (err) {
            if (err.kind === "not_found") {
              res.status(404).send({
                message: `Not found booking with id ${req.params.booking_id}.`,
              });
            } else {
              res.status(500).send({
                message:
                  "Error updating booking with id " + req.params.booking_id,
              });
            }
          } else res.send(data);
        }
      );
    }
  } else {
    res.status(400).send({
      message: "Booking date and time slot already taken",
    });
  }
};

// Delete a booking with the specified booking_id in the request
// booking cannot be deleted if the booking date is less than 48 hours away or if the booking date is in the past
exports.deleteBooking = (req, res) => {
  VenueBookingModel.findById(req.params.booking_id, (err, data) => {
    if (err) {
      if (err.kind === "not_found") {
        res.status(404).send({
          message: `Not found booking with id ${req.params.booking_id}.`,
        });
      } else {
        res.status(500).send({
          message: "Error retrieving booking with id " + req.params.booking_id,
        });
      }
    } else {
      if (data.booking_date < new Date()) {
        res.status(400).send({
          message: "Booking date is in the past",
        });
      } else if (
        data.booking_date < new Date().setDate(new Date().getDate() + 2)
      ) {
        res.status(400).send({
          message: "Booking date is less than 48 hours away",
        });
      } else {
        VenueBookingModel.findByIdAndDelete(
          req.params.booking_id,
          (err, data) => {
            if (err) {
              if (err.kind === "not_found") {
                res.status(404).send({
                  message: `Not found booking with id ${req.params.booking_id}.`,
                });
              } else {
                res.status(500).send({
                  message:
                    "Could not delete booking with id " + req.params.booking_id,
                });
              }
            } else res.send({ message: `Booking was deleted successfully!` });
          }
        );
      }
    }
  });
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { venue_id } = req.params;
    const { date } = req.query;

    // Check if the venue exists
    const venue = await venueModel.findById(venue_id);
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    // Parse the date
    const bookingDate = parse(date, "yyyy-MM-dd", new Date());
    // Check if the date is valid
    if (isNaN(bookingDate)) {
      return res.status(400).json({ message: "Invalid date" });
    }

    // Get all bookings for the specified date
    const bookings = await VenueBookingModel.find({
      venue: venue_id,
      booking_date: bookingDate,
    });

    // Get the day of the week
    const dayOfWeek = format(bookingDate, "EEEE", { locale: enUS });

    // Find venue timings for the day
    const daySlots = venue.timings.find(
      (timing) => timing.day.toLowerCase() === dayOfWeek.toLowerCase()
    );

    // If no slots for the day, return no slots available
    if (!daySlots || !daySlots.slots || daySlots.slots.length === 0) {
      return res.status(200).json({ message: "No slots available" });
    }

    // If there are no bookings on the specified date, all slots are available
    if (bookings.length === 0) {
      return res.status(200).json({ availableSlots: daySlots.slots });
    } else {
      // Get all booked slots
      const bookedSlots = bookings.map((booking) => booking.booking_time_slot);

      // Filter out the booked slots for the specified date
      const availableSlots = daySlots.slots.filter((slot) => {
        // Extract the time slot string from the slot object
        const slotString = `${slot.from} - ${slot.to}`;
        // Check if the extracted slot string is not in bookedSlots
        return !bookedSlots.includes(slotString);
      });

      return res.status(200).json({ availableSlots });
    }
  } catch (error) {
    console.error("Error fetching available time slots:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
