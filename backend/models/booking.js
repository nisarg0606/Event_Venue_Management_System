const moongose = require('mongoose');

const bookingSchema = new moongose.Schema({
    venue: {
        type: moongose.Schema.Types.ObjectId,
        ref: 'Venue',
        required: true
    },
    user: {
        type: moongose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    host: {
        type: moongose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    booking_date: {
        type: Date,
        required: true
    },
    booking_time_slot: {
        type: String,
        required: true
    },
    // status: {
    //     type: String,
    //     enum: ['pending', 'approved', 'rejected'],
    //     default: 'pending'
    // }
});


module.exports = moongose.model('Booking', bookingSchema);