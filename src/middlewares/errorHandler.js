const logger = require("../config/logger");

function errorHandler(err, req, res, next) {
  logger.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
  });
}

module.exports = errorHandler;
