const { boolean } = require("joi");
const moongose = require("mongoose");

const activityBookingSchema = new moongose.Schema({
    activity: {
        type: moongose.Schema.Types.ObjectId,
        ref: 'Activity',
        required: true,
    },
    user: {
        type: moongose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    date: {
        type: Date,
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
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
});

module.exports = moongose.model("ActivityBooking", activityBookingSchema);