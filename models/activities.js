const moongose = require("mongoose");

const activitySchema = new moongose.Schema({
  host: {
    type: moongose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  venue: {
    type: moongose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
  },
  type_of_activity: {
    type: String,
    required: true,
  },
  images: [
    {
      type: String,
    },
  ],
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  participants_limit: {
    type: Number,
    required: true,
  },
  participants: [
    {
      type: moongose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  price: {
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
  dateLastUpdated: {
    type: Date,
    default: Date.now,
  },active: {
    type: Boolean,
    default: true,
  },
});

module.exports = moongose.model("Activity", activitySchema);
