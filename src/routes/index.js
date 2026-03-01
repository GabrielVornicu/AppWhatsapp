const express = require("express");
const router = express.Router();
const logger = require("../config/logger");

router.get("/", async (req, res, next) => {
  try {
    logger.info("Dashboard accessed");
    res.render("dashboard");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
