const moongose = require("mongoose");

const venueBookingSchema = new moongose.Schema({
    venue: {
        type: moongose.Schema.Types.ObjectId,
        ref: 'Venue',
        required: true,
    },
    user: {
        type: moongose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    booking_date: {
        type: Date,
        required: true,
    },
    booking_time_slot: {
        type: String,
        required: true,
    },
    participants: {
        type: Number,
        required: true,
    },
    payment: {
        type: moongose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true,
    },
    
});

module.exports = moongose.model("VenueBooking", venueBookingSchema);
