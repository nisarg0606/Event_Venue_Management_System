const express = require("express");
const router = express.Router();
const venueModel = require("../models/venue.js");
const VenueBookingModel = require("../models/venueBooking.js");

function checkAvailability(venue_id, booking_date, booking_time_slot) {
  let available = true;
  VenueBookingModel.findById(venue_id, (err, data) => {
    if (err) {
      if (err.kind === "not_found") {
        available = true;
      } else {
        available = false;
      }
    } else {
        // here we are checking if the booking date and time slot is already taken by another user
      data.forEach((booking) => {
        if (
          booking.user._id !== req.user._id &&
          booking.booking_date === booking_date &&
          booking.booking_time_slot === booking_time_slot
        ) {
          available = false;
        }
      });
    }
  });
  return available;
}
// Create a new booking
exports.createAVenueBooking = (req, res) => {
  // Validate request
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
    // Create a booking
    const venueBooking = new VenueBookingModel({
      venue_id: req.body.venue_id,
      user: req.user,
      booking_date: req.body.booking_date,
      booking_time_slot: req.body.booking_time_slot,
    });
    // Save booking in the database
    VenueBookingModel.create(venueBooking, (err, data) => {
      if (err)
        res.status(500).send({
          message:
            err.message || "Some error occurred while creating the booking.",
        });
      else res.status(201).send(data);
    });
  } else {
    res.status(400).send({
      message: "Booking date and time slot already taken",
    });
  }
};

// Retrieve all bookings
exports.findAllVenueBookings = (req, res) => {
  let past = [],
    upcoming = [];
  VenueBookingModel.find((err, data) => {
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
      res.status(200).send({ past, upcoming });
    }
  });
};

// Retrieve all bookings for a specific venue
exports.findByVenue = (req, res) => {
  let past = [],
    upcoming = [];
  VenueBooking.findByVenue(req.params.venue_id, (err, data) => {
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
        VenueBookingModel.findByIdAndDelete(req.params.booking_id, (err, data) => {
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
        });
      }
    }
  });
};
