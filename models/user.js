const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^[a-zA-Z]+$/.test(v);
            },
            message: (props) => `${props.value} is not a valid first name!`,
        },
    },
    lastName: {
        type: String,
        required: false,
        validate: {
            validator: function (v) {
                return /^[a-zA-Z]+$/.test(v);
            },
            message: (props) => `${props.value} is not a valid last name!`,
        },
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (v) {
                return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
            },
            message: (props) => `${props.value} is not a valid email address!`,
        },
    },
    phone : {
        type: String,
        required: false,
        validate : {
            validator: function(v) {

            },
            message: (props) => "",
        },
    },
    verified: {
        type: Boolean,
        default: false,
    },
    password: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^(?=.*[!@#$&*.:-_)(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/.test(
                    v
                );
            },
            message: (props) =>
                `${props.value} is not a valid password! Password must contain at least one uppercase letter, one lowercase letter, one number, one special character, and be at least 8 characters long.`,
        },
    },
    date: {
        type: Date,
        default: Date.now,
    },
    role: {
        type: String,
        enum: ["admin", "venueOwner/eventPlanner", "customer"],
        default: "customer",
    },
    twoFactorAuthEnabled: {
        type: Boolean,
        default: false,
    },
    twoFactorAuth: {
        type: String,
    },
});

module.exports = mongoose.model("User", userSchema);
