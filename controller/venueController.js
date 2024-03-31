const venueSchema = require("../models/venue");
const crypto = require("node:crypto");
const aws_sdk = require("@aws-sdk/client-s3");
const signedUrl = require("@aws-sdk/s3-request-presigner");
const dotenv = require("dotenv");
const sharp = require("sharp");
const path = require("path");
const redis = require("../utils/redis");
const venue = require("../models/venue");

dotenv.config();

const randomImageName = () => {
  return crypto.randomBytes(16).toString("hex");
};

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKeyAws = process.env.ACCESS_KEY_AWS;
const secretKeyAws = process.env.SECRET_KEY_AWS;

const s3Client = new aws_sdk.S3Client({
  region: bucketRegion,
  credentials: {
    accessKeyId: accessKeyAws,
    secretAccessKey: secretKeyAws,
  },
});

exports.createVenue = async (req, res) => {
  try {
    const { name, location, type, capacity, price, description, timings } =
      req.body;
    if (
      !name ||
      !location ||
      !type ||
      !capacity ||
      !price ||
      !description ||
      !timings ||
      !req.files
    ) {
      return res.status(400).json({
        message: "All fields are required and at least one image is required",
      });
    }
    const images = [];
    // console.log(req.files);
    // console.log(req.body);
    const venueOwner = req.user._id;
    let venue = await venueSchema.findOne({
      name: name,
      location: location,
    });
    if (venue) {
      return res.status(400).json({ message: "Venue already exists" });
    }
    // console.log("line 66");
    if (req.files) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const buffer = await sharp(file.buffer)
          .resize({ width: 500, height: 500 })
          .toBuffer();
        file.buffer = buffer;
        const fileName = randomImageName();
        console.log(fileName);
        const params = {
          Bucket: bucketName,
          Body: file.buffer,
          Key: fileName,
          ContentType: file.mimetype,
        };
        await s3Client.send(new aws_sdk.PutObjectCommand(params));
        images.push(fileName);
      }
    }
    venue = new venueSchema({
      name,
      location,
      type,
      capacity,
      pricePerHour: price,
      description,
      timings,
      images,
      venueOwner,
    });
    await venue.save();
    res.status(201).json({ message: "Venue created successfully", venue });
  } catch (error) {
    console.log(error);
    res.status(409).json({ message: error.message });
  }
};

async function getSignedURLOfImage(image) {
  try {
    const params = new aws_sdk.GetObjectCommand({
      Bucket: bucketName,
      Key: image,
      Expires: 60 * 60 * 24 * 7,
    });
    const url = await signedUrl.getSignedUrl(s3Client, params, {
      expiresIn: 60 * 60 * 24 * 7,
    });
    return url.toString();
  } catch (error) {
    console.log("Error in getSignedURLOfImage: ", error);
  }
}

// get venue by id
exports.getVenue = async (req, res) => {
  try {
    let venue = await venueSchema
      .findById(req.params.id)
      .populate("venueOwner", "username email");
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }
    venue = venue.toObject();

    // create a new array to store the image URLs
    venue.imagesURL = [];
    // Iterate over each image
    for (let i = 0; i < venue.images.length; i++) {
      // check redis for the image URL
      let url = await redis.get(`venue:${venue._id}:image:${i}`);
      if (url) {
        // console.log("URL from Redis in if: ", url);
        venue.imagesURL[i] = url;
      } else {
        // If image URL does not exist or is expired, get a new signed URL
        url = await getSignedURLOfImage(venue.images[i]);
        // Store the URL in Redis, set to expire after 7 days
        // const redis_response = await redis.set(
        await redis.set(
          `venue:${venue._id}:image:${i}`,
          url,
          "EX",
          60 * 60 * 24 * 7
        );
        // console.log("URL from Redis in else: ", redis_response.toString());
        venue.imagesURL[i] = url;
      }
    }
    // Send the venue and imageURL as the response
    res.status(200).json({ venue });
  } catch (error) {
    // If an error occurs, send a 404 response with the error message
    res.status(404).json({ message: error.message });
  }
};

//get all venues
exports.getVenues = async (req, res) => {
  try {
    let venues = await venueSchema
      .find()
      .populate("venueOwner", "username email");
    if (!venues) {
      return res.status(404).json({ message: "Venues not found" });
    }
    const venues_json = {};
    // Iterate over each venue
    for (let venue of venues) {
      venue = venue.toObject();
      // create a new array to store the image URLs
      venue.imagesURL = [];
      // Iterate over each image
      for (let i = 0; i < venue.images.length; i++) {
        // check redis for the image URL
        let url = await redis.get(`venue:${venue._id}:image:${i}`);
        if (url) {
          // console.log("URL from Redis in if: ", url);
          venue.imagesURL[i] = url;
          // push venue to the venues_json object
          venues_json[venue._id] = venue;
        } else {
          // If image URL does not exist or is expired, get a new signed URL
          url = await getSignedURLOfImage(venue.images[i]);
          // Store the URL in Redis, set to expire after 7 days
          // const redis_response = await redis.set(
          await redis.set(
            `venue:${venue._id}:image:${i}`,
            url,
            "EX",
            60 * 60 * 24 * 7
          );
          // console.log("URL from Redis in else: ", redis_response.toString());
          venue.imagesURL[i] = url;
          // push venue to the venues_json object
          venues_json[venue._id] = venue;
        }
      }
    }
    // Send the venues and imageURL as the response
    res.status(200).json({ venues: venues_json });
  } catch (error) {
    // If an error occurs, send a 404 response with the error message
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

exports.getVenueByLocation = async (req, res) => {
  try {
    let venues = await venueSchema
      .find({ location: req.params.location })
      .populate("venueOwner", "username email");
    if (!venues) {
      return res.status(404).json({ message: "Venue not found" });
    }
    for (let venue of venues) {
      venue = venue.toObject();
      venue.imagesURL = [];
      let venues_json = {};
      for (let i = 0; i < venue.images.length; i++) {
        let url = await redis.get(`venue:${venue._id}:image:${i}`);
        if (url) {
          venue.imagesURL[i] = url;
          venues_json[venue._id] = venue;
        } else {
          url = await getSignedURLOfImage(venue.images[i]);
          await redis.set(
            `venue:${venue._id}:image:${i}`,
            url,
            "EX",
            60 * 60 * 24 * 7
          );
          venue.imagesURL[i] = url;
          venues_json[venue._id] = venue;
        }
      }
    }
    res.status(200).json({ venues: venues_json });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.getVenueByType = async (req, res) => {
  try {
    const venues = await venueSchema
      .find({ type: req.params.type })
      .populate("venueOwner", "username email");
    if (!venues) {
      return res.status(404).json({ message: "Venue not found" });
    }
    for (let venue of venues) {
      for (let i = 0; i < venue.images.length; i++) {
        if (venue.imagesURL[i] && venue.imagesExpiry[i] > new Date()) {
          imageURL.push(venue.imagesURL[i]);
        } else {
          let url = await getSignedURLOfImage(venue.images[i]);
          venue.imagesURL[i] = url;
          venue.imagesExpiry[i] = new Date(Date.now() + 60 * 60 * 24 * 7);
          await venueSchema.findByIdAndUpdate(venue._id, venue);
        }
      }
    }
    res.status(200).json(venues);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// for update delete the previous images and add new images
exports.updateVenue = async (req, res) => {
  try {
    const venue = await venueSchema.findById(req.params.id);
    // admin and venue owner can update the venue
    if (
      venue.venueOwner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(401)
        .json({ message: "You are not authorized to update this venue" });
    }
    const { name, location, type, capacity, price, description, timings } =
      req.body;
    const images = [];
    if (req.files) {
      //delete previous images
      for (let i = 0; i < venue.images.length; i++) {
        const params = {
          Bucket: bucketName,
          Key: venue.images[i],
        };
        await s3Client.send(new aws_sdk.DeleteObjectCommand(params));
      }
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const buffer = await sharp(file.buffer)
          .resize({ width: 500, height: 500 })
          .toBuffer();
        file.buffer = buffer;
        const fileName = randomImageName();
        const params = {
          Bucket: bucketName,
          Body: file.buffer,
          Key: fileName,
          ContentType: file.mimetype,
        };
        await s3Client.send(new aws_sdk.PutObjectCommand(params));
        images.push(fileName);
      }
    }
    const updatedVenue = {
      name,
      location,
      type,
      capacity,
      pricePerHour: price,
      description,
      timings,
      images,
    };
    await venueSchema.findByIdAndUpdate(req.params.id, updatedVenue);
    res.status(200).json({ message: "Venue updated successfully" });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.deleteVenue = async (req, res) => {
  try {
    const venue = await venueSchema.findById(req.params.id);
    // admin and venue owner can delete the venue
    if (
      venue.venueOwner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(401)
        .json({ message: "You are not authorized to delete this venue" });
    }
    for (let i = 0; i < venue.images.length; i++) {
      const params = {
        Bucket: bucketName,
        Key: venue.images[i],
      };
      await s3Client.send(new aws_sdk.DeleteObjectCommand(params));
    }
    await venueSchema.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Venue deleted successfully" });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.getMyVenues = async (req, res) => {
  try {
    const venues = await venueSchema
      .find({ venueOwner: req.user._id })
      .populate("venueOwner", "username email");
    if (!venues) {
      return res.status(404).json({ message: "Venues not found" });
    }
    let venues_json = {};
    // Iterate over each venue
    for (let venue of venues) {
      venue = venue.toObject();
      // create a new array to store the image URLs
      venue.imagesURL = [];
      // Iterate over each image
      for (let i = 0; i < venue.images.length; i++) {
        // check redis for the image URL
        let url = await redis.get(`venue:${venue._id}:image:${i}`);
        if (url) {
          // console.log("URL from Redis in if: ", url);
          venue.imagesURL[i] = url;
          // push venue to the venues_json object
          venues_json[venue._id] = venue;
        } else {
          // If image URL does not exist or is expired, get a new signed URL
          url = await getSignedURLOfImage(venue.images[i]);
          // Store the URL in Redis, set to expire after 7 days
          // const redis_response = await redis.set(
          await redis.set(
            `venue:${venue._id}:image:${i}`,
            url,
            "EX",
            60 * 60 * 24 * 7
          );
          // console.log("URL from Redis in else: ", redis_response.toString());
          venue.imagesURL[i] = url;
          // push venue to the venues_json object
          venues_json[venue._id] = venue;
        }
      }
    }
    // Send the venues and imageURL as the response
    res.status(200).send({ venues: venues_json });
  } catch (error) {
    // If an error occurs, send a 404 response with the error message
    res.status(404).json({ message: error.message });
  }
};

exports.searchVenues = async (req, res) => {
  try {
    const { name, description, location, type } = req.query;
    const searchConditions = [];

    if (name) searchConditions.push({ name: new RegExp(name, "i") });
    if (description) searchConditions.push({ description: new RegExp(description, "i") });
    if (location) searchConditions.push({ location: new RegExp(location, "i") });
    if (type) searchConditions.push({ type: new RegExp(type, "i") });

    let venues = [];

    if (searchConditions.length > 0) {
      // Construct the final query by combining all search conditions with $or
      venues = await venueSchema.find({ $or: searchConditions });
    }

    if (venues.length === 0) {
      return res.status(404).json({ message: "Venues not found" });
    }

    let venues_json = {};
    for (let venue of venues) {
      venue = venue.toObject();
      venue.imagesURL = [];
      for (let i = 0; i < venue.images.length; i++) {
        let url = await redis.get(`venue:${venue._id}:image:${i}`);
        if (url) {
          venue.imagesURL[i] = url;
          venues_json[venue._id] = venue;
        } else {
          url = await getSignedURLOfImage(venue.images[i]);
          await redis.set(
            `venue:${venue._id}:image:${i}`,
            url,
            "EX",
            60 * 60 * 24 * 7
          );
          venue.imagesURL[i] = url;
          venues_json[venue._id] = venue;
        }
      }
    }

    res.status(200).json({ venues: venues_json });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
