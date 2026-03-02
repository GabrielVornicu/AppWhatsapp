const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("index", {
    title: "Node.js CRM",
    message: "Structură modulară activă 🚀"
  });
});

router.get("/dashboard", (req, res) => {
  res.render("index", {
    title: "Dashboard",
    message: "Aceasta este ruta /dashboard"
  });
});

module.exports = router;
