const activitySchema = require("../models/activities");
const venueSchema = require("../models/venue");
const redis = require("../utils/redis");
const aws_sdk = require("@aws-sdk/client-s3");
const signedUrl = require("@aws-sdk/s3-request-presigner");
const dotenv = require("dotenv");
const sharp = require("sharp");
const crypto = require("node:crypto");

dotenv.config();

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

const randomImageName = () => {
  return crypto.randomBytes(20).toString("hex");
};

exports.createActivity = async (req, res) => {
  try {
    //only venueOwner and admin can create an activity
    if (
      req.user.role !== "venueOwner/eventPlanner" &&
      req.user.role !== "admin"
    ) {
      return res
        .status(401)
        .json({ message: "Only venueOwner and admin can create an activity" });
    }
    const {
      name,
      description,
      venue,
      type_of_activity,
      date,
      time,
      participants_limit,
      price,
    } = req.body;
    const host = req.user._id;
    // if the venueOwner is the one creating the activity, the host will be the venueOwner and the activity will be approved
    // if the admin is the one creating the activity, the host will be the admin and the activity will be pending
    let venueDetails = await venueSchema.findById(venue).populate("venueOwner");
    let status = "pending";
    const venueOwner = venueDetails.venueOwner;
    if (venueOwner._id.toString() === host.toString()) {
      status = "approved";
    }
    // check file upload for images
    if (req.files.length > 5) {
      return res.status(400).json({ message: "Only 5 images are allowed" });
    }
    let images = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const buffer = await sharp(file.buffer)
        .png({
          quality: 80,
        })
        .toBuffer();
      file.buffer = buffer;
      const imageName = randomImageName();
      const params = {
        Bucket: bucketName,
        Key: imageName,
        Body: file.buffer,
        ContentType: "image/png",
      };
      const data = await s3Client.send(new aws_sdk.PutObjectCommand(params));
      images.push(imageName);
    }

    activitySchema.create({
      name,
      description,
      venue,
      type_of_activity,
      date,
      time,
      participants_limit,
      price,
      host,
      status,
      images,
    });
    res.status(201).json({ message: "Activity created successfully" });
  } catch (error) {
    console.log("Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.getActivities = async (req, res) => {
  try {
    let activities = await activitySchema
      .find()
      .populate("venue", "name location")
      .populate("host", "name email")
      .populate("participants", "name email");
    if (!activities) {
      return res.status(404).json({ message: "No activity found" });
    }
    for (let i = 0; i < activities.length; i++) {
      activities[i] = activities[i].toObject();
      activities[i].imagesURL = [];
      for (let j = 0; j < activities[i].images.length; j++) {
        let url = await redis.get(`activity:${activities[i]._id}:image:${j}`);
        if (!url) {
          url = await getSignedURLOfImage(activities[i].images[j]);
          redis.set(
            `activity:${activities[i]._id}:image:${j}`,
            url,
            "EX",
            60 * 60 * 24 * 7
          );
        }
        activities[i].imagesURL.push(url);
      }
      // Check if the date of the activity has passed
      if (new Date(activities[i].date) < new Date()) {
        activities[i].active = false;
      }
    }
    res.status(200).json(activities);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.getActivity = async (req, res) => {
  try {
    let activity = await activitySchema
      .findById(req.params.id)
      .populate("venue", "name location")
      .populate("host", "name email")
      .populate("participants", "name email");
    if (!activity) {
      return res.status(404).json({ message: "No activity found" });
    }
    activity = activity.toObject();
    activity.imagesURL = [];
    for (let i = 0; i < activity.images.length; i++) {
      let url = await redis.get(`activity:${activity._id}:image:${i}`);
      if (!url) {
        url = await getSignedURLOfImage(activity.images[i]);
        redis.set(
          `activity:${activity._id}:image:${i}`,
          url,
          "EX",
          60 * 60 * 24 * 7
        );
      }
      activity.imagesURL.push(url);
    }
    // Check if the date of the activity has passed
    if (new Date(activity.date) < new Date()) {
      activity.active = false;
    }
    res.status(200).json(activity);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.updateActivity = async (req, res) => {
  try {
    if (
      req.user.role !== "venueOwner/eventPlanner" &&
      req.user.role !== "admin"
    ) {
      return res
        .status(401)
        .json({ message: "Only venueOwner and admin can update an activity" });
    }
    const { id } = req.params;
    const activity = await activitySchema.findById(id);
    if (!activity) {
      return res.status(404).json({ message: "No activity found" });
    }
    // if the activity is updated by other than the host who created the activity, then give an error
    if (activity.host.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const {
      name,
      description,
      venue,
      type_of_activity,
      date,
      time,
      participants_limit,
      price,
    } = req.body;
    let images = [];
    if (req.files) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const buffer = await sharp(file.buffer)
          .png({
            quality: 80,
          })
          .toBuffer();
        file.buffer = buffer;
        const imageName = randomImageName();
        const params = {
          Bucket: bucketName,
          Key: imageName,
          Body: file.buffer,
          ContentType: "image/png",
        };
        const data = await s3Client.send(new aws_sdk.PutObjectCommand(params));
        images.push(imageName);
      }
    }
    const update = await activitySchema.findByIdAndUpdate(id, {
      name,
      description,
      venue,
      type_of_activity,
      date,
      time,
      participants_limit,
      price,
      images,
    });
    res.status(200).json({ message: "Activity updated successfully", update });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    if (
      req.user.role !== "venueOwner/eventPlanner" &&
      req.user.role !== "admin"
    ) {
      return res
        .status(401)
        .json({ message: "Only venueOwner and admin can delete an activity" });
    }
    const { id } = req.params;
    const activity = await activitySchema.findById(id);
    if (!activity) {
      return res.status(404).json({ message: "No activity found" });
    }
    // if the activity is deleted by other than the host who created the activity, then give an error
    if (activity.host.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    await activitySchema.findByIdAndDelete(id);
    res.status(200).json({ message: "Activity deleted successfully" });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.approveActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await activitySchema.findById(id).populate("venue");
    if (!activity) {
      return res.status(404).json({ message: "No activity found" });
    }
    const venueOwner = activity.venue.venueOwner;
    if (req.user._id.toString() !== venueOwner._id.toString()) {
      return res.status(401).json({
        message:
          "You are not the venue owner so you cannot approve the activity",
      });
    }
    await activitySchema.findByIdAndUpdate(id, { status: "approved" });
    res.status(200).json({ message: "Activity approved successfully" });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.rejectActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await activitySchema.findById(id).populate("venue");
    if (!activity) {
      return res.status(404).json({ message: "No activity found" });
    }
    const venueOwner = activity.venue.venueOwner;
    if (req.user._id.toString() !== venueOwner._id.toString()) {
      return res.status(401).json({
        message:
          "You are not the venue owner so you cannot reject the activity",
      });
    }
    await activitySchema.findByIdAndUpdate(id, { status: "rejected" });
    res.status(200).json({ message: "Activity rejected successfully" });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.searchActivities = async (req, res) => {
  try {
    const { name, type_of_activity, date, description, price } = req.query;
    const searchConditions = [];
    if (name) {
      searchConditions.push({ name: { $regex: name, $options: "i" } });
    }
    if (type_of_activity) {
      searchConditions.push({
        type_of_activity: { $regex: type_of_activity, $options: "i" },
      });
    }
    if (date) {
      searchConditions.push({ date: { $regex: date, $options: "i" } });
    }
    if (description) {
      searchConditions.push({
        description: { $regex: description, $options: "i" },
      });
    }
    if (price) {
      searchConditions.push({ price: { $regex: price, $options: "i" } });
    }
    let activities = await activitySchema.find({ $and: searchConditions });
    // get images URL for each activity
    for (let i = 0; i < activities.length; i++) {
      activities[i] = activities[i].toObject();
      activities[i].imagesURL = [];
      for (let j = 0; j < activities[i].images.length; j++) {
        let url = await redis.get(`activity:${activities[i]._id}:image:${j}`);
        if (!url) {
          url = await getSignedURLOfImage(activities[i].images[j]);
          redis.set(
            `activity:${activities[i]._id}:image:${j}`,
            url,
            "EX",
            60 * 60 * 24 * 7
          );
        }
        activities[i].imagesURL.push(url);
      }
      // Check if the date of the activity has passed
      if (new Date(activities[i].date) < new Date()) {
        activities[i].active = false;
      }
    }
    res.status(200).json(activities);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};