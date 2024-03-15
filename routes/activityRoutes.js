const activityController = require('../controller/activityController');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

router.post("/", auth, upload.array("images", 5), activityController.createActivity);
router.get("/", auth, activityController.getActivities);
// router.get("/myactivities", auth, activityController.getMyActivities);
router.get("/:id", auth, activityController.getActivity);
router.put("/:id", auth, activityController.updateActivity);
router.delete("/:id", auth, activityController.deleteActivity);

module.exports = router;