const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  capacity: {
    type: Number,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  pricePerHour: {
    type: Number,
    required: true,
    validate: {
      validator: function (v) {
        return /^[0-9]+(\.[0-9]{1,})?$/.test(v);
      },
      message: (props) =>
        `${props.value} is not a valid price! Price must be a number and can contain up to 2 decimal places.`,
    },
  },
  date: {
    type: Date,
    default: Date.now,
  },
  venueOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

module.exports = mongoose.model("Venue", venueSchema);