require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");

const routes = require("./routes");
const wordpressRoutes = require("./routes/wordpress");
app.use("/", wordpressRoutes);
const app = express();

// body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static
app.use(express.static(path.join(__dirname, "public")));

// view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// sessions (MVP)
app.use(
  session({
    name: "appwhatsapp.sid",
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 zile
    },
  })
);

// routes
app.use("/", routes);

// 404
app.use((req, res) => res.status(404).send("Not found"));

module.exports = app;
