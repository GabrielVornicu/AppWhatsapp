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

router.get("/contact", (req, res) => {
  res.render("contact");
});

router.post("/contact", (req, res) => {
  const { name } = req.body;

  console.log("Form submitted:", name);

  res.redirect("/dashboard");
});

module.exports = router;
