const { createLogger, format, transports } = require("winston");

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      return stack
        ? `${timestamp} [${level}] ${message} - ${stack}`
        : `${timestamp} [${level}] ${message}`;
    })
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "error.log", level: "error" }),
    new transports.File({ filename: "combined.log" }),
  ],
});

module.exports = logger;
