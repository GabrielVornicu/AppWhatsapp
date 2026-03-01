const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const morgan = require("morgan");

const logger = require("./config/logger");
const errorHandler = require("./middlewares/errorHandler");
const routes = require("./routes");

const app = express();

// 🔐 Security
app.use(helmet());

// 🔁 CORS
app.use(cors());

// 📦 Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 📊 HTTP logging
app.use(morgan("combined", {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// 📁 Static
app.use(express.static(path.join(__dirname, "../public")));

// 🎨 View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// 🛣 Routes
app.use("/", routes);

// ❌ Error handler
app.use(errorHandler);

module.exports = app;
