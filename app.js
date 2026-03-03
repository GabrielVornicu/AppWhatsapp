require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");

// 🔹 INIT APP PRIMA DATĂ
const app = express();

// 🔹 BODY PARSERS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 STATIC FILES
app.use(express.static(path.join(__dirname, "public")));

// 🔹 VIEW ENGINE
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 🔹 SESSIONS
app.use(
  session({
    name: "appwhatsapp.sid",
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

// 🔹 IMPORT ROUTES DUPĂ ce app există
const routes = require("./routes");
const wordpressRoutes = require("./routes/wordpress");
const whatsappRoutes = require("./routes/whatsapp");

// 🔹 USE ROUTES
app.use("/", routes);
app.use("/", wordpressRoutes);
app.use("/", whatsappRoutes);

// 🔹 404
app.use((req, res) => {
  res.status(404).send("Not found");
});

module.exports = app;
