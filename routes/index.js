const express = require("express");
const router = express.Router();

const { requireAuth, redirectIfAuth } = require("../config/auth");
const { getDashboard } = require("../controllers/mainController");
const { getLogin, postLogin, postLogout } = require("../controllers/authController");

// Auth
router.get("/login", redirectIfAuth, getLogin);
router.post("/login", redirectIfAuth, postLogin);
router.post("/logout", requireAuth, postLogout);

// Home -> redirect
router.get("/", (req, res) => {
  if (req.session?.user) return res.redirect("/dashboard");
  return res.redirect("/login");
});

// Dashboard protected
router.get("/dashboard", requireAuth, getDashboard);

module.exports = router;
