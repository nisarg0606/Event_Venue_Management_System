const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  capacity: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  images: [
    {
      type: String,
    },
  ],
  // imagesURL: [
  //   {
  //     type: String,
  //   },
  // ],
  // imagesExpiry: [
  //   {
  //     type: Date,
  //   },
  // ],
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
  dateLastUpdated: {
    type: Date,
    default: Date.now,
  },
  timings: [
    {
      day: {
        type: String,
        enum: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
        required: true,
      },
      times: [
        {
          from: {
            type: String,
            required: true,
          },
          to: {
            type: String,
            required: true,
          },
        },
      ],
    },
  ],

  // timings: [
  //   {
  //     day: {
  //       type: String,
  //       required: true,
  //     },
  //     slots: [
  //       {
  //         time: {
  //           type: String,
  //           required: true,
  //         },
  //         status: {
  //           type: String,
  //           enum: ["available", "booked"],
  //           default: "available",
  //         },
  //       },
  //     ],
  //   },
  // ],
//   timings: {
//     type: String,
//     required: true,
//   },
// >>>>>>> master
  availability: {
    type: String,
    enum: ["available", "unavailable"],
    default: "available",
  },
  venueOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});


venueSchema.index({
  name: "text",
  description: "text",
  location: "text",
  type: "text",
});
module.exports = mongoose.model("Venue", venueSchema);
